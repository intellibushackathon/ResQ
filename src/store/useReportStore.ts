import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { analyzeIncident } from "../lib/ai-vision";
import {
  createReport,
  createReportFromQueuedDraft,
  dispatchReportInDatabase,
  fetchReportsForViewer,
  loadAdminSupportData,
  resolveReportInDatabase,
  updateSystemSetting,
  verifyReportInDatabase,
} from "../lib/supabaseData";
import {
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_LOCATION_LABEL,
  type AdminAuditEntry,
  type AdminSettings,
  type DepartmentFilter,
  type DisasterReport,
  type FlexibleSystemSettingRow,
  type QueuedReportDraft,
  type ReportAIAnalysis,
  type ReportSubmissionInput,
  type ReportSubmissionResult,
  createClientReportId,
  createOfflineReportFromDraft,
  mergeReportsById,
  sortReportsByPriority,
} from "../lib/reporting";
import { reverseGeocode } from "../lib/geocoding";
import type { AppRole } from "../lib/supabase";

type ReportSession = {
  uid: string;
  role: AppRole;
} | null;

type SubmissionPhase = "idle" | "analyzing" | "submitting" | "success";

type ReportState = {
  reports: DisasterReport[];
  offlineQueue: QueuedReportDraft[];
  isReady: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  isSyncingOfflineQueue: boolean;
  submissionPhase: SubmissionPhase;
  syncStatusMessage: string | null;
  submissionError: string | null;
  loadError: string | null;
  lastSubmissionResult: ReportSubmissionResult | null;
  adminSettings: AdminSettings;
  adminSettingsRows: FlexibleSystemSettingRow[];
  adminSettingsWarning: string | null;
  auditLogs: AdminAuditEntry[];
  isAdminDataLoading: boolean;
  initializedForUserId: string | null;
  initializedForRole: AppRole;
  initializeReports: (session: ReportSession) => Promise<void>;
  addReport: (input: ReportSubmissionInput, session: ReportSession) => Promise<ReportSubmissionResult>;
  verifyReport: (
    id: string,
    options?: {
      severity?: ReportAIAnalysis["severity"] | null;
      department?: DepartmentFilter | null;
      verifiedBy?: string | null;
    },
  ) => Promise<DisasterReport>;
  dispatchReport: (id: string) => Promise<DisasterReport>;
  resolveReport: (id: string) => Promise<DisasterReport>;
  syncOfflineQueue: (session: ReportSession) => Promise<void>;
  loadAdminData: () => Promise<void>;
  updateAdminSetting: (key: keyof AdminSettings, value: boolean | number) => Promise<void>;
  clearAuthScopedState: () => void;
  clearSubmissionState: () => void;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected file could not be read as an image."));
    };
    reader.onerror = () => reject(new Error("The selected file could not be read as an image."));
    reader.readAsDataURL(file);
  });
}

function replaceReport(reports: DisasterReport[], nextReport: DisasterReport) {
  return reports.map((report) => (report.id === nextReport.id ? nextReport : report));
}

function removeReportById(reports: DisasterReport[], reportId: string) {
  return reports.filter((report) => report.id !== reportId);
}

function upsertReport(reports: DisasterReport[], nextReport: DisasterReport) {
  const existingIndex = reports.findIndex((report) => report.id === nextReport.id);
  if (existingIndex === -1) {
    return sortReportsByPriority([nextReport, ...reports]);
  }

  const nextReports = [...reports];
  nextReports[existingIndex] = nextReport;
  return sortReportsByPriority(nextReports);
}

function mergeReportsWithQueue(reports: DisasterReport[], queue: QueuedReportDraft[]) {
  return sortReportsByPriority(mergeReportsById(reports, queue.map(createOfflineReportFromDraft)));
}

function dedupeQueue(queue: QueuedReportDraft[]) {
  const map = new Map<string, QueuedReportDraft>();
  for (const item of queue) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: [],
      offlineQueue: [],
      isReady: false,
      isInitializing: false,
      isSubmitting: false,
      isSyncingOfflineQueue: false,
      submissionPhase: "idle",
      syncStatusMessage: null,
      submissionError: null,
      loadError: null,
      lastSubmissionResult: null,
      adminSettings: DEFAULT_ADMIN_SETTINGS,
      adminSettingsRows: [],
      adminSettingsWarning: null,
      auditLogs: [],
      isAdminDataLoading: false,
      initializedForUserId: null,
      initializedForRole: "public",

      async initializeReports(session) {
        set({
          isInitializing: true,
          loadError: null,
          initializedForUserId: session?.uid ?? null,
          initializedForRole: session?.role ?? "public",
        });

        try {
          if (navigator.onLine && get().offlineQueue.length > 0) {
            await get().syncOfflineQueue(session);
          }

          const liveReports = await fetchReportsForViewer(session?.uid ?? null, session?.role ?? "public");
          set((state) => ({
            reports: mergeReportsWithQueue(liveReports, state.offlineQueue),
            isReady: true,
            isInitializing: false,
            loadError: null,
          }));

          if (session?.role === "admin") {
            await get().loadAdminData();
          }
        } catch (error) {
          set((state) => ({
            reports: mergeReportsWithQueue([], state.offlineQueue),
            isReady: true,
            isInitializing: false,
            loadError: error instanceof Error ? error.message : "Unable to load reports.",
          }));
        }
      },

      async addReport(input, session) {
        if (get().adminSettings.lockdownMode) {
          const message = "Report submissions are temporarily disabled.";
          set({
            submissionError: message,
            isSubmitting: false,
            submissionPhase: "idle",
          });
          throw new Error(message);
        }

        set({
          isSubmitting: true,
          submissionPhase: "analyzing",
          submissionError: null,
          lastSubmissionResult: null,
        });

        const imageDataUrl = await fileToDataUrl(input.photoFile);
        const locationName =
          input.locationName?.trim() ||
          (await reverseGeocode(input.lat, input.lng)).label ||
          DEFAULT_LOCATION_LABEL;

        const analysis = await analyzeIncident({
          imageDataUrl,
          selectedDamageType: input.damageType,
          description: input.description,
          location: {
            lat: input.lat,
            lng: input.lng,
          },
          urgentAssist: input.urgentAssist,
        });

        const submission: ReportSubmissionInput = {
          ...input,
          locationName,
          submittedBy: session?.uid ?? null,
        };

        if (!navigator.onLine) {
          const queuedDraft: QueuedReportDraft = {
            id: createClientReportId("queued-report"),
            imageDataUrl,
            imageName: input.photoFile.name,
            imageType: input.photoFile.type || "image/jpeg",
            damageType: input.damageType,
            description: input.description.trim(),
            lat: Number(input.lat.toFixed(6)),
            lng: Number(input.lng.toFixed(6)),
            locationName,
            urgentAssist: input.urgentAssist,
            timestamp: new Date().toISOString(),
            submittedBy: session?.uid ?? null,
            ai: analysis,
          };

          const queuedReport = createOfflineReportFromDraft(queuedDraft);
          const result: ReportSubmissionResult = {
            id: queuedDraft.id,
            queued: true,
            report: queuedReport,
          };

          set((state) => ({
            offlineQueue: dedupeQueue([queuedDraft, ...state.offlineQueue]),
            reports: upsertReport(state.reports, queuedReport),
            isSubmitting: false,
            submissionPhase: "success",
            syncStatusMessage: "Queued for sync when online",
            submissionError: null,
            lastSubmissionResult: result,
          }));

          return result;
        }

        set({
          submissionPhase: "submitting",
        });

        try {
          const report = await createReport({
            submission,
            analysis,
          });

          const result: ReportSubmissionResult = {
            id: report.id,
            queued: false,
            report,
          };

          set((state) => ({
            reports: upsertReport(state.reports, report),
            isSubmitting: false,
            submissionPhase: "success",
            syncStatusMessage: null,
            submissionError: null,
            lastSubmissionResult: result,
          }));

          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to submit";
          set({
            isSubmitting: false,
            submissionPhase: "idle",
            submissionError: message,
          });
          throw error instanceof Error ? error : new Error(message);
        }
      },

      async verifyReport(id, options) {
        const report = await verifyReportInDatabase(id, options ?? {});
        set((state) => ({
          reports: replaceReport(state.reports, report),
        }));
        return report;
      },

      async dispatchReport(id) {
        const report = await dispatchReportInDatabase(id);
        set((state) => ({
          reports: replaceReport(state.reports, report),
        }));
        return report;
      },

      async resolveReport(id) {
        const report = await resolveReportInDatabase(id);
        set((state) => ({
          reports: replaceReport(state.reports, report),
        }));
        return report;
      },

      async syncOfflineQueue(session) {
        if (!navigator.onLine || get().offlineQueue.length === 0) {
          return;
        }

        set({
          isSyncingOfflineQueue: true,
          syncStatusMessage: "Syncing queued reports",
        });

        const queueSnapshot = [...get().offlineQueue];
        const syncedReports: DisasterReport[] = [];
        const failedDrafts: QueuedReportDraft[] = [];

        for (const draft of queueSnapshot) {
          try {
            const synced = await createReportFromQueuedDraft({
              ...draft,
              submittedBy: draft.submittedBy ?? session?.uid ?? null,
            });
            syncedReports.push(synced);
          } catch {
            failedDrafts.push(draft);
          }
        }

        set((state) => {
          const reportsWithoutDrafts = queueSnapshot.reduce(
            (nextReports, draft) => removeReportById(nextReports, draft.id),
            state.reports,
          );

          return {
            offlineQueue: failedDrafts,
            reports: sortReportsByPriority([...syncedReports, ...reportsWithoutDrafts]),
            isSyncingOfflineQueue: false,
            syncStatusMessage:
              failedDrafts.length > 0
                ? `${failedDrafts.length} queued report${failedDrafts.length === 1 ? "" : "s"} still pending sync`
                : "All queued reports synced",
          };
        });
      },

      async loadAdminData() {
        set({
          isAdminDataLoading: true,
        });

        try {
          const payload = await loadAdminSupportData(get().reports);
          set({
            adminSettings: payload.adminSettings,
            adminSettingsRows: payload.adminSettingsRows,
            adminSettingsWarning: payload.warning,
            auditLogs: payload.auditLogs,
            isAdminDataLoading: false,
          });
        } catch (error) {
          set({
            isAdminDataLoading: false,
            adminSettingsWarning: error instanceof Error ? error.message : "Unable to load admin support data.",
          });
        }
      },

      async updateAdminSetting(key, value) {
        const nextSettings = await updateSystemSetting(get().adminSettingsRows, key, value);
        set({
          adminSettings: nextSettings,
        });
      },

      clearAuthScopedState() {
        set((state) => ({
          reports: mergeReportsWithQueue([], state.offlineQueue),
          initializedForUserId: null,
          initializedForRole: "public",
          loadError: null,
        }));
      },

      clearSubmissionState() {
        set({
          submissionPhase: "idle",
          submissionError: null,
          syncStatusMessage: null,
          lastSubmissionResult: null,
        });
      },
    }),
    {
      name: "resq-report-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
        adminSettings: state.adminSettings,
      }),
    },
  ),
);
