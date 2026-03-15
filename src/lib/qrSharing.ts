import QRCode from "qrcode";
import type { DamageTypeOption, QueuedReportDraft, ReportAIAnalysis } from "./reporting";

export type QRReportPayload = {
  version: "1";
  reportId: string;
  damageType: DamageTypeOption;
  description: string;
  lat: number;
  lng: number;
  locationName: string;
  urgentAssist: boolean;
  timestamp: string;
  submittedBy: string | null;
  submitterName: string | null;
  imageRefId: string | null;
  hasImage: boolean;
  ai: {
    damageType: string;
    severity: string;
    confidence: number;
    summary: string;
    rationale: string;
    hazards: string[];
    suggestedDepartment: string;
    suggestedActions: string[];
    provider: string;
    model: string;
    analyzedAt: string;
  };
  deviceMeta: {
    userAgent: string;
    generatedAt: string;
  };
};

export function buildQRPayload(draft: QueuedReportDraft, submitterName: string | null): QRReportPayload {
  return {
    version: "1",
    reportId: draft.id,
    damageType: draft.damageType,
    description: draft.description,
    lat: draft.lat,
    lng: draft.lng,
    locationName: draft.locationName,
    urgentAssist: draft.urgentAssist,
    timestamp: draft.timestamp,
    submittedBy: draft.submittedBy ?? null,
    submitterName,
    imageRefId: draft.imageRefId ?? null,
    hasImage: Boolean(draft.imageDataUrl),
    ai: {
      damageType: draft.ai.damageType,
      severity: draft.ai.severity,
      confidence: draft.ai.confidence,
      // Truncate long strings to keep QR payload compact
      summary: draft.ai.summary.slice(0, 220),
      rationale: draft.ai.rationale.slice(0, 260),
      hazards: draft.ai.hazards.slice(0, 3).map((h) => h.slice(0, 60)),
      suggestedDepartment: draft.ai.suggestedDepartment,
      suggestedActions: draft.ai.suggestedActions.slice(0, 3).map((a) => a.slice(0, 60)),
      provider: draft.ai.provider,
      model: draft.ai.model.slice(0, 60),
      analyzedAt: draft.ai.analyzedAt,
    },
    deviceMeta: {
      userAgent: navigator.userAgent.slice(0, 100),
      generatedAt: new Date().toISOString(),
    },
  };
}

export function parseQRPayload(raw: string): QRReportPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      (parsed as Record<string, unknown>).version === "1" &&
      "reportId" in parsed &&
      "ai" in parsed
    ) {
      return parsed as QRReportPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function payloadToAIAnalysis(payload: QRReportPayload): ReportAIAnalysis {
  const ai = payload.ai;
  const severity = (["Critical", "High", "Medium", "Low"].includes(ai.severity) ? ai.severity : "Medium") as ReportAIAnalysis["severity"];
  const dept = (["NWA", "JPS", "ODPEM", "None"].includes(ai.suggestedDepartment) ? ai.suggestedDepartment : "None") as ReportAIAnalysis["suggestedDepartment"];
  const provider = (["proxy", "openrouter", "simulation"].includes(ai.provider) ? ai.provider : "simulation") as ReportAIAnalysis["provider"];
  const damageType = (["Flooding", "Roof Collapse", "Debris/Tree", "Utility Damage", "Other"].includes(ai.damageType)
    ? ai.damageType
    : "Other") as ReportAIAnalysis["damageType"];

  return {
    damageType,
    severity,
    confidence: ai.confidence,
    summary: ai.summary,
    rationale: ai.rationale,
    hazards: ai.hazards,
    suggestedDepartment: dept,
    suggestedActions: ai.suggestedActions,
    provider,
    model: ai.model,
    analyzedAt: ai.analyzedAt,
  };
}

export async function generateQRDataUrl(payload: QRReportPayload): Promise<string> {
  const data = JSON.stringify(payload);
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 3,
    width: 400,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
