import type { CompactRelayPayload, GatewayReceivedRelay } from "../types/incident";
import {
  getUnforwardedReceipts,
  markReceiptForwarded,
  markReceiptForwardFailed,
} from "../storage/relay-store";
import { supabase } from "../supabase";
import { isOnline } from "../sync/connectivity";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORTS_TABLE = "reports";

// ---------------------------------------------------------------------------
// Convert a relay payload to a Supabase report row
// ---------------------------------------------------------------------------

export function relayPayloadToReportRow(
  payload: CompactRelayPayload,
  envelopeId: string,
): Record<string, unknown> {
  return {
    damage_type: payload.incidentType,
    severity: payload.severity,
    description: payload.summary,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    location_name: payload.parish ?? null,
    reported_at: payload.createdAt,
    status: "pending_validation",
    alert_state: "new",
    source_channel: "mesh_gateway",
    relay_envelope_id: envelopeId,
    submitted_by: null,
    photo_path: null,
  };
}

// ---------------------------------------------------------------------------
// Forward unforwarded gateway receipts to backend (Supabase)
// ---------------------------------------------------------------------------

export async function forwardReceiptsToBackend(): Promise<{
  forwarded: number;
  failed: number;
}> {
  if (!isOnline() || !supabase) {
    return { forwarded: 0, failed: 0 };
  }

  const receipts = await getUnforwardedReceipts();
  let forwarded = 0;
  let failed = 0;

  for (const receipt of receipts) {
    try {
      await forwardSingleReceipt(receipt);
      await markReceiptForwarded(receipt.gatewayReceiptId);
      forwarded++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Forward failed";
      await markReceiptForwardFailed(receipt.gatewayReceiptId, errorMsg);
      failed++;
    }
  }

  return { forwarded, failed };
}

/**
 * Forward a single gateway receipt to the backend.
 */
async function forwardSingleReceipt(receipt: GatewayReceivedRelay): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured.");

  const reportRow = relayPayloadToReportRow(
    receipt.rawPayload,
    receipt.gatewayReceiptId,
  );

  const { error } = await supabase.from(REPORTS_TABLE).insert(reportRow);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Insert a relayed incident directly (used by sync engine)
// ---------------------------------------------------------------------------

export async function insertRelayedIncident(
  payload: CompactRelayPayload,
  envelopeId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured.");

  const reportRow = relayPayloadToReportRow(payload, envelopeId);
  const { error } = await supabase.from(REPORTS_TABLE).insert(reportRow);

  if (error) {
    throw error;
  }
}
