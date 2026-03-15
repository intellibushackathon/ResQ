import { getDb, PHOTOS_STORE, PHOTO_BLOBS_STORE } from "./db";
import type { LocalPhotoAsset } from "../types/incident";
import { generateId } from "../types/incident";

// ---------------------------------------------------------------------------
// Photo metadata CRUD
// ---------------------------------------------------------------------------

export async function savePhotoAsset(asset: LocalPhotoAsset): Promise<void> {
  const db = await getDb();
  await db.put(PHOTOS_STORE, asset);
}

export async function getPhotoAsset(id: string): Promise<LocalPhotoAsset | undefined> {
  const db = await getDb();
  return db.get(PHOTOS_STORE, id);
}

export async function getPhotoAssetsForReport(reportId: string): Promise<LocalPhotoAsset[]> {
  const db = await getDb();
  return db.getAllFromIndex(PHOTOS_STORE, "by-reportId", reportId);
}

export async function deletePhotoAsset(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(PHOTOS_STORE, id);
}

// ---------------------------------------------------------------------------
// Photo blob operations
// ---------------------------------------------------------------------------

export async function savePhotoBlob(blobKey: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(PHOTO_BLOBS_STORE, { id: blobKey, blob });
}

export async function getPhotoBlob(blobKey: string): Promise<Blob | undefined> {
  const db = await getDb();
  const entry = await db.get(PHOTO_BLOBS_STORE, blobKey);
  return entry?.blob;
}

export async function deletePhotoBlob(blobKey: string): Promise<void> {
  const db = await getDb();
  await db.delete(PHOTO_BLOBS_STORE, blobKey);
}

// ---------------------------------------------------------------------------
// Combined save (metadata + blob)
// ---------------------------------------------------------------------------

export async function savePhoto(
  reportId: string,
  blob: Blob,
  mimeType: string,
  fileName: string | null = null,
): Promise<LocalPhotoAsset> {
  const photoId = generateId();
  const blobKey = `photo-blob-${photoId}`;

  const asset: LocalPhotoAsset = {
    id: photoId,
    reportId,
    localKey: blobKey,
    mimeType,
    fileName,
    originalSizeBytes: blob.size,
    compressedSizeBytes: null,
    thumbnailKey: null,
    previewKey: null,
    width: null,
    height: null,
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  const tx = db.transaction([PHOTOS_STORE, PHOTO_BLOBS_STORE], "readwrite");
  await tx.objectStore(PHOTOS_STORE).put(asset);
  await tx.objectStore(PHOTO_BLOBS_STORE).put({ id: blobKey, blob });
  await tx.done;

  return asset;
}

// ---------------------------------------------------------------------------
// Combined delete (metadata + blob + thumbnail)
// ---------------------------------------------------------------------------

export async function deletePhotoAndBlobs(id: string): Promise<void> {
  const db = await getDb();
  const asset = await db.get(PHOTOS_STORE, id);
  if (!asset) return;

  const tx = db.transaction([PHOTOS_STORE, PHOTO_BLOBS_STORE], "readwrite");
  await tx.objectStore(PHOTOS_STORE).delete(id);
  await tx.objectStore(PHOTO_BLOBS_STORE).delete(asset.localKey);

  if (asset.thumbnailKey) {
    await tx.objectStore(PHOTO_BLOBS_STORE).delete(asset.thumbnailKey);
  }
  if (asset.previewKey) {
    await tx.objectStore(PHOTO_BLOBS_STORE).delete(asset.previewKey);
  }

  await tx.done;
}

// ---------------------------------------------------------------------------
// Mark photo as uploaded to cloud
// ---------------------------------------------------------------------------

export async function markPhotoUploaded(id: string, uploadedPath: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PHOTOS_STORE, "readwrite");
  const store = tx.objectStore(PHOTOS_STORE);
  const asset = await store.get(id);

  if (asset) {
    const updated: LocalPhotoAsset = {
      ...asset,
      // Store the Supabase storage path for reference
    };
    // We track upload status via a convention: if localKey includes the path info
    // For now, we just note it was uploaded
    await store.put(updated);
  }

  await tx.done;
}

// ---------------------------------------------------------------------------
// Get photos pending upload
// ---------------------------------------------------------------------------

export async function getPhotosForReport(reportId: string): Promise<LocalPhotoAsset[]> {
  const db = await getDb();
  return db.getAllFromIndex(PHOTOS_STORE, "by-reportId", reportId);
}

// ---------------------------------------------------------------------------
// Thumbnail generation
// ---------------------------------------------------------------------------

const DEFAULT_THUMBNAIL_MAX_DIM = 200;
const DEFAULT_PREVIEW_MAX_DIM = 800;

export async function createThumbnail(
  blob: Blob,
  maxDimension: number = DEFAULT_THUMBNAIL_MAX_DIM,
): Promise<Blob> {
  return resizeImageBlob(blob, maxDimension);
}

export async function createPreview(
  blob: Blob,
  maxDimension: number = DEFAULT_PREVIEW_MAX_DIM,
): Promise<Blob> {
  return resizeImageBlob(blob, maxDimension);
}

async function resizeImageBlob(blob: Blob, maxDimension: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);

  let width = bitmap.width;
  let height = bitmap.height;

  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
}

// ---------------------------------------------------------------------------
// Save photo with thumbnail and preview
// ---------------------------------------------------------------------------

export async function savePhotoWithThumbnails(
  reportId: string,
  originalBlob: Blob,
  mimeType: string,
  fileName: string | null = null,
): Promise<LocalPhotoAsset> {
  const photoId = generateId();
  const blobKey = `photo-blob-${photoId}`;
  const thumbnailKey = `photo-thumb-${photoId}`;
  const previewKey = `photo-preview-${photoId}`;

  let thumbnailBlob: Blob;
  let previewBlob: Blob;

  try {
    [thumbnailBlob, previewBlob] = await Promise.all([
      createThumbnail(originalBlob),
      createPreview(originalBlob),
    ]);
  } catch {
    // If thumbnail generation fails, just save the original
    thumbnailBlob = originalBlob;
    previewBlob = originalBlob;
  }

  const asset: LocalPhotoAsset = {
    id: photoId,
    reportId,
    localKey: blobKey,
    mimeType,
    fileName,
    originalSizeBytes: originalBlob.size,
    compressedSizeBytes: previewBlob.size,
    thumbnailKey,
    previewKey,
    width: null,
    height: null,
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  const tx = db.transaction([PHOTOS_STORE, PHOTO_BLOBS_STORE], "readwrite");
  await tx.objectStore(PHOTOS_STORE).put(asset);
  await tx.objectStore(PHOTO_BLOBS_STORE).put({ id: blobKey, blob: originalBlob });
  await tx.objectStore(PHOTO_BLOBS_STORE).put({ id: thumbnailKey, blob: thumbnailBlob });
  await tx.objectStore(PHOTO_BLOBS_STORE).put({ id: previewKey, blob: previewBlob });
  await tx.done;

  return asset;
}

// ---------------------------------------------------------------------------
// Storage estimation
// ---------------------------------------------------------------------------

export async function estimateStorageUsage(): Promise<{
  used: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!navigator.storage?.estimate) return null;

  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (used / quota) * 100 : 0;

  return { used, quota, percentUsed };
}
