import type {
  LocalIncidentReport,
  CompactRelayPayload,
  RelayEnvelope,
} from "../types/incident";
import { generateId } from "../types/incident";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TTL_HOURS = 24;
const DEFAULT_MAX_HOPS = 10;
const MAX_SUMMARY_LENGTH = 280;

// ---------------------------------------------------------------------------
// Derive a compact relay payload from a full local report
// ---------------------------------------------------------------------------

export function deriveCompactPayload(report: LocalIncidentReport): CompactRelayPayload {
  const summary =
    report.incident.description.length > MAX_SUMMARY_LENGTH
      ? report.incident.description.slice(0, MAX_SUMMARY_LENGTH - 3) + "..."
      : report.incident.description;

  const payload: CompactRelayPayload = {
    version: 1,
    payloadType: "incident-relay",
    relayId: generateId(),
    reportId: report.id,
    createdAt: report.createdAt,
    originDeviceId: report.originDeviceId,
    incidentType: report.incident.type,
    severity: report.incident.severity,
    title: report.incident.title,
    summary,
    lat: report.location.lat ?? undefined,
    lng: report.location.lng ?? undefined,
    parish: report.location.parish,
    hasPhoto: report.media.hasPhoto,
    photoPreviewAvailable: false, // Photos are never in relay payloads
    checksum: computeChecksum(report),
  };

  return payload;
}

// ---------------------------------------------------------------------------
// Create a relay envelope wrapping a payload
// ---------------------------------------------------------------------------

export function createRelayEnvelope(
  payload: CompactRelayPayload,
  deviceId: string,
  options?: {
    ttlHours?: number;
    maxHops?: number;
    destinationType?: "mesh" | "gateway" | "internet";
  },
): RelayEnvelope {
  const ttlHours = options?.ttlHours ?? DEFAULT_TTL_HOURS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  return {
    id: generateId(),
    payloadType: "incident-relay",
    payloadVersion: 1,
    sourceDeviceId: deviceId,
    destinationType: options?.destinationType ?? "mesh",
    createdAt: now.toISOString(),
    ttl: ttlHours,
    deliveryStatus: "queued",
    payload,
    hopCount: 0,
    maxHops: options?.maxHops ?? DEFAULT_MAX_HOPS,
    ttlExpiresAt: expiresAt.toISOString(),
    visitedDeviceIds: [deviceId],
    deliveredToGatewayAt: null,
  };
}

// ---------------------------------------------------------------------------
// Envelope lifecycle helpers
// ---------------------------------------------------------------------------

export function isEnvelopeExpired(envelope: RelayEnvelope): boolean {
  return new Date().toISOString() > envelope.ttlExpiresAt;
}

export function hasReachedMaxHops(envelope: RelayEnvelope): boolean {
  return envelope.hopCount >= envelope.maxHops;
}

export function hasVisitedDevice(envelope: RelayEnvelope, deviceId: string): boolean {
  return envelope.visitedDeviceIds.includes(deviceId);
}

export function incrementHop(
  envelope: RelayEnvelope,
  deviceId: string,
): RelayEnvelope {
  return {
    ...envelope,
    hopCount: envelope.hopCount + 1,
    visitedDeviceIds: [...envelope.visitedDeviceIds, deviceId],
  };
}

export function markDeliveredToGateway(envelope: RelayEnvelope): RelayEnvelope {
  return {
    ...envelope,
    deliveryStatus: "forwarded",
    deliveredToGatewayAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Checksum computation for integrity verification
// ---------------------------------------------------------------------------

function computeChecksum(report: LocalIncidentReport): string {
  const input = [
    report.id,
    report.incident.type,
    report.incident.severity,
    report.incident.title,
    report.createdAt,
  ].join("|");

  // Simple hash for integrity (not cryptographic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  return Math.abs(hash).toString(36);
}

// ---------------------------------------------------------------------------
// Payload size estimation (for relay capacity planning)
// ---------------------------------------------------------------------------

export function estimatePayloadSize(payload: CompactRelayPayload): number {
  return new Blob([JSON.stringify(payload)]).size;
}

export function estimateEnvelopeSize(envelope: RelayEnvelope): number {
  return new Blob([JSON.stringify(envelope)]).size;
}
