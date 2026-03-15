# ResQ Offline-First Incident Reporting — Architecture Guide

## 1. System Overview

ResQ is a disaster-response platform built with **React 19 + Vite + TypeScript**.
It implements an **offline-first** architecture so field responders can report
incidents and receive assignments even without internet, syncing automatically
when connectivity returns.

### Core stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 19.1, Tailwind CSS 3.4, Framer Motion |
| Build tool | Vite 7.3 |
| State management | Zustand 5.0 |
| Persistent storage | IndexedDB (via `idb` library) |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Maps | Leaflet + React Leaflet, leaflet.heat |
| Mesh relay | Web Bluetooth API |
| Geocoding | Nominatim (deferred, rate-limited) |

---

## 2. Data Model

### 2.1 Report lifecycle types

All types are defined in `src/lib/types/incident.ts`.

- **LocalIncidentReport** — the canonical offline-first incident record
- **LocalPhotoAsset** — photo metadata with IndexedDB blob key references
- **CompactRelayPayload** — stripped-down payload for Bluetooth mesh (<=280 char description, no photos)
- **RelayEnvelope** — wraps a CompactRelayPayload with TTL, hop count, route tracking
- **GatewayReceivedRelay** — receipt for relays received by a gateway device
- **IncidentRecord** — cloud-authoritative record (post-sync)
- **DashboardIncidentView** — read-optimized view for admin dashboards

### 2.2 Status enums

| Enum | Values |
|------|--------|
| ReportStatus | draft, submitted, queued, relayed, synced, failed |
| SyncStatus | local_only, pending_relay, pending_cloud, synced, sync_failed |
| RelayStatus | not_attempted, queued, relayed, relay_failed |
| IncidentProgression | unassigned, assigned, en_route, on_scene, resolved, cancelled, failed, escalated |
| SourceChannel | online_direct, offline_sync, mesh_gateway |

### 2.3 IDs

All IDs are UUID v4 (`crypto.randomUUID()`) to ensure collision safety across
offline devices generating IDs independently.

---

## 3. Storage Architecture

### 3.1 IndexedDB schema (`src/lib/storage/db.ts`)

Database: `resq-offline`, version 1.

| Object store | Key | Indexes | Purpose |
|-------------|-----|---------|---------|
| incidents | id | by-syncStatus, by-relayStatus, by-reportStatus, by-sourceChannel, by-createdAt | Incident records |
| photos | id | by-reportId | Photo metadata |
| photo_blobs | id | — | Raw image binary data |
| relay_queue | id | by-deliveryStatus, by-createdAt | Outbound relay envelopes |
| gateway_inbox | id | by-forwarded, by-receivedAt | Inbound relays received as gateway |
| geocode_cache | key | — | Persistent reverse geocode results |
| sync_metadata | key | — | Device identity, migration flags |
| responder_updates | id | — | Queued field updates (offline-safe) |

### 3.2 Migration from localStorage

`migrateFromLocalStorage()` atomically moves queued report drafts from
localStorage (legacy) to IndexedDB, converting embedded data URLs to proper
blobs. A migration flag in `sync_metadata` prevents re-running.

### 3.3 Photo storage strategy

Photos are split into two stores:
- **photos** — lightweight metadata (ID, reportId, mimeType, dimensions, timestamps)
- **photo_blobs** — heavy binary data keyed by `photo-blob-{id}`, `photo-thumb-{id}`, `photo-preview-{id}`

This separation ensures listing/querying photos is fast without loading binary
data into memory.

---

## 4. Sync Engine

### 4.1 State machine

```
              ┌─────────────────────────────────────┐
              │                                     │
  ┌───────────▼──┐   online   ┌──────────────┐   ┌▼───────┐
  │  local_only  │───────────►│ pending_cloud │──►│ synced  │
  └───────┬──────┘            └──────┬───────┘   └─────────┘
          │                          │
          │ offline                  │ error
          ▼                          ▼
  ┌───────────────┐          ┌─────────────┐
  │ pending_relay │          │ sync_failed │
  └───────┬───────┘          └─────────────┘
          │ delivered
          ▼
  ┌──────────┐   gateway forwards   ┌──────────────┐
  │ relayed  │─────────────────────►│ pending_cloud │
  └──────────┘                      └──────────────┘
```

### 4.2 Key modules

| Module | Path | Responsibility |
|--------|------|---------------|
| sync-engine | `src/lib/sync/sync-engine.ts` | Orchestrates full sync cycle |
| cloud-sync | `src/lib/sync/cloud-sync.ts` | Uploads reports/photos to Supabase |
| media-sync | `src/lib/sync/media-sync.ts` | Deferred photo upload with batching |
| connectivity | `src/lib/sync/connectivity.ts` | Online/offline detection + listeners |
| responder-updates | `src/lib/sync/responder-updates.ts` | Offline-safe field mutations |

### 4.3 Retry strategy

Exponential backoff: base 2 seconds, maximum 60 seconds, maximum 5 retries.
Failed reports are marked `sync_failed` and retried on the next full sync cycle.

---

## 5. Bluetooth Mesh Relay

### 5.1 Architecture

When a device is offline, it can relay compact payloads via Bluetooth to nearby
devices. If a receiving device has internet, it acts as a **gateway** and
forwards the relay to the backend.

### 5.2 Payload constraints

- Description truncated to 280 characters
- No photo data in relay payloads (photos sync later via cloud)
- Envelope includes TTL (24h default), max hops (10), and visited-device tracking

### 5.3 Loop prevention

Each `RelayEnvelope` carries a `route` array of device IDs. Before forwarding,
the relay manager checks:
1. Has the envelope expired? (TTL check)
2. Has it reached max hops?
3. Has this device already handled it? (visited check)
4. Is this a duplicate envelope ID in our queue or inbox?

### 5.4 Key files

| File | Purpose |
|------|---------|
| `src/lib/relay/payload.ts` | Derive compact payloads, create envelopes |
| `src/lib/relay/bluetooth-service.ts` | Web Bluetooth GATT operations |
| `src/lib/relay/relay-manager.ts` | Periodic relay orchestration |
| `src/lib/relay/gateway.ts` | Gateway-to-backend forwarding |
| `src/lib/relay/device-identity.ts` | Persistent device UUID |

### 5.5 Browser support

Web Bluetooth is Chrome/Edge only. `isBluetoothSupported()` returns `false` on
unsupported browsers, and all relay UI gracefully degrades.

---

## 6. Geocoding

### 6.1 Deferred reverse geocoding

Geocoding is **never** performed on map click. Users see raw coordinates while
placing pins. Reverse geocoding runs only at two points:
1. **On formal submit** — in `addReport()` within the report store
2. **During sync** — `resolveLocationIfNeeded()` for any report missing an address

### 6.2 Caching

Two-layer cache:
- **In-memory** — fast Map for current session
- **IndexedDB** — persistent `geocode_cache` store for cross-session reuse

Cache key: `${lat.toFixed(3)},${lng.toFixed(3)}` (approximately 110m precision).

### 6.3 Rate limiting

Nominatim requires maximum 1 request per second. Batch resolvers use 1100ms
spacing between requests.

---

## 7. Responder Dashboard

### 7.1 Two-tab layout

The dashboard (`src/pages/Dashboard.tsx`) has two tabs:
- **Incident Queue** — all active incidents sorted by severity (original workflow)
- **My Assignments** — incidents dispatched to the current user

### 7.2 Field actions

From the My Assignments tab, responders can:
- **Acknowledge** an assignment
- Set status to **En Route** or **On Scene**
- Add **field notes** (free text)
- **Resolve** incidents from the field

All actions are queued to IndexedDB via `responder-updates.ts` and synced when
online. Actions update the local Zustand store immediately for responsive UI.

### 7.3 Offline banner

A connectivity banner shows when the user is offline, including a count of
pending local updates. A subtler banner appears when online with pending syncs.

---

## 8. Admin Dashboards

### 8.1 Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/incident-map` | AdminIncidentMap | Spatial view with heatmaps + filters |
| `/admin/collaboration` | AdminCollaboration | Org-to-org visibility by department |
| `/admin/resources` | AdminResources | Resource allocation + responder workload |

### 8.2 Heatmap

`HeatmapLayer` uses `leaflet.heat` with severity-weighted intensity. Gradient
runs from blue (low) through cyan, yellow, orange to red (critical).

### 8.3 Admin operations (`src/lib/admin-operations.ts`)

Provides computed views:
- Incident progression mapping
- Duplicate detection (100m proximity + same type + 1-hour window)
- Responder load distribution
- Source channel summaries
- Escalated incident filtering

---

## 9. Type Migration

`src/lib/types/migration.ts` provides bidirectional adapters between the legacy
`DisasterReport` type and the new `LocalIncidentReport` type:

- `legacyReportToLocal()` — converts existing DB rows
- `localReportToLegacy()` — enables new reports to work with existing pages
- `legacyDraftToLocal()` — migrates queued drafts

This allows incremental migration without breaking existing pages.

---

## 10. File Index

### Types
- `src/lib/types/incident.ts` — all new types, validators, factories
- `src/lib/types/migration.ts` — legacy adapter functions

### Storage
- `src/lib/storage/db.ts` — IndexedDB setup and migration
- `src/lib/storage/incident-store.ts` — incident CRUD + index queries
- `src/lib/storage/photo-store.ts` — photo metadata/blob operations + thumbnails
- `src/lib/storage/relay-store.ts` — relay queue and gateway inbox
- `src/lib/storage/geocode-cache-store.ts` — persistent geocode cache

### Sync
- `src/lib/sync/sync-engine.ts` — orchestration and state machine
- `src/lib/sync/cloud-sync.ts` — Supabase upload operations
- `src/lib/sync/media-sync.ts` — deferred photo upload batching
- `src/lib/sync/connectivity.ts` — online/offline detection
- `src/lib/sync/responder-updates.ts` — offline responder action queue

### Relay
- `src/lib/relay/payload.ts` — compact payload derivation + envelopes
- `src/lib/relay/bluetooth-service.ts` — Web Bluetooth GATT
- `src/lib/relay/relay-manager.ts` — periodic relay lifecycle
- `src/lib/relay/gateway.ts` — gateway-to-backend forwarding
- `src/lib/relay/device-identity.ts` — persistent device UUID

### Geocoding
- `src/lib/geocoding.ts` — dual-layer cached reverse geocoding

### Admin
- `src/lib/admin-operations.ts` — dashboard computed views
- `src/pages/admin/AdminIncidentMap.tsx` — spatial heatmap view
- `src/pages/admin/AdminCollaboration.tsx` — department grouping
- `src/pages/admin/AdminResources.tsx` — resource allocation

### UI
- `src/components/maps/HeatmapLayer.tsx` — leaflet.heat integration
- `src/pages/Dashboard.tsx` — responder dashboard with assignments
- `src/hooks/useSyncStatus.ts` — React sync state hook
- `src/hooks/useRelayStatus.ts` — React relay state hook
