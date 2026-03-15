import { supabase } from "../supabase";
import { isOnline } from "./connectivity";
import {
  getPhotoAssetsForReport,
  getPhotoBlob,
  markPhotoUploaded,
} from "../storage/photo-store";
import { getIncidentsBySyncStatus, updateIncidentFields } from "../storage/incident-store";
import type { LocalPhotoAsset } from "../types/incident";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_IMAGES_BUCKET = "report-images";

/**
 * Maximum concurrent photo uploads per batch.
 */
const MAX_CONCURRENT_UPLOADS = 3;

// ---------------------------------------------------------------------------
// Upload a single photo blob to Supabase Storage
// ---------------------------------------------------------------------------

async function uploadPhotoToStorage(
  asset: LocalPhotoAsset,
  blob: Blob,
  userId: string | null,
): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured.");

  const owner = sanitizePathSegment(userId || "public");
  const extension =
    asset.mimeType === "image/png"
      ? "png"
      : asset.mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const baseName =
    sanitizePathSegment(asset.fileName?.replace(/\.[^.]+$/, "") ?? "") || "incident-photo";

  const stamp =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const path = `${owner}/${baseName}-${stamp}.${extension}`;

  const { error } = await supabase.storage
    .from(REPORT_IMAGES_BUCKET)
    .upload(path, blob, { contentType: asset.mimeType, upsert: false });

  if (error) throw error;

  return path;
}

function sanitizePathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Sync all photos for a single report
// ---------------------------------------------------------------------------

export async function syncPhotosForReport(
  reportId: string,
  userId: string | null = null,
): Promise<{ uploaded: number; failed: number }> {
  if (!isOnline() || !supabase) return { uploaded: 0, failed: 0 };

  const assets = await getPhotoAssetsForReport(reportId);
  if (assets.length === 0) return { uploaded: 0, failed: 0 };

  let uploaded = 0;
  let failed = 0;

  // Process in batches of MAX_CONCURRENT_UPLOADS
  for (let i = 0; i < assets.length; i += MAX_CONCURRENT_UPLOADS) {
    const batch = assets.slice(i, i + MAX_CONCURRENT_UPLOADS);

    const results = await Promise.allSettled(
      batch.map(async (asset) => {
        const blob = await getPhotoBlob(asset.localKey);
        if (!blob) {
          throw new Error(`Photo blob not found for key: ${asset.localKey}`);
        }

        const storagePath = await uploadPhotoToStorage(asset, blob, userId);
        await markPhotoUploaded(asset.id, storagePath);

        return storagePath;
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        uploaded++;
      } else {
        failed++;
        console.warn("Photo upload failed:", result.reason);
      }
    }
  }

  return { uploaded, failed };
}

// ---------------------------------------------------------------------------
// Sync all pending photos across all synced reports
// ---------------------------------------------------------------------------

export async function syncPendingPhotos(
  userId: string | null = null,
): Promise<{ totalUploaded: number; totalFailed: number; reportsProcessed: number }> {
  if (!isOnline() || !supabase) {
    return { totalUploaded: 0, totalFailed: 0, reportsProcessed: 0 };
  }

  // Photos should be synced after the report itself is synced
  const syncedReports = await getIncidentsBySyncStatus("synced");

  let totalUploaded = 0;
  let totalFailed = 0;
  let reportsProcessed = 0;

  for (const report of syncedReports) {
    const assets = await getPhotoAssetsForReport(report.id);

    // Skip reports with no photos
    if (assets.length === 0) continue;

    const { uploaded, failed } = await syncPhotosForReport(report.id, userId);

    if (uploaded > 0 || failed > 0) {
      reportsProcessed++;
      totalUploaded += uploaded;
      totalFailed += failed;
    }
  }

  return { totalUploaded, totalFailed, reportsProcessed };
}

// ---------------------------------------------------------------------------
// Attach the uploaded photo URL back to the report record
// ---------------------------------------------------------------------------

export async function linkUploadedPhotoToReport(
  reportId: string,
  storagePath: string,
): Promise<void> {
  if (!supabase) return;

  const { data } = supabase.storage
    .from(REPORT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  if (data?.publicUrl) {
    // Update the local report with the cloud photo URL
    await updateIncidentFields(reportId, {
      updatedAt: new Date().toISOString(),
    });

    // Also update the remote record
    await supabase
      .from("reports")
      .update({ photo_url: data.publicUrl })
      .eq("id", reportId);
  }
}
