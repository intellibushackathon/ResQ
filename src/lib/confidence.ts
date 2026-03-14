export type ConfidenceTier = "high" | "medium" | "low";

export function normalizeConfidenceInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 1) return clampConfidence(value / 100);
  return clampConfidence(value);
}

export function clampConfidence(value: number) {
  return Math.min(0.99, Math.max(0.35, value));
}

export function formatConfidence(value: number | null | undefined) {
  const normalized = normalizeConfidenceInput(value);
  if (normalized == null) return "—";

  const percentage = normalized * 100;
  const rounded = percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1);
  return `${rounded}%`;
}

export function getConfidenceTier(value: number | null | undefined): ConfidenceTier | null {
  const normalized = normalizeConfidenceInput(value);
  if (normalized == null) return null;
  if (normalized >= 0.85) return "high";
  if (normalized >= 0.6) return "medium";
  return "low";
}
