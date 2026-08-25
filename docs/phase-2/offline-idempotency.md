# Offline Sync & Idempotency

> How the PWA handles writes during offline conditions and guarantees exactly-once semantics on reconnection.

---

## Problem

A PWA can lose network connectivity at any point during a user session. Workout completions, weight entries, and profile updates must not be lost when offline, and must not be duplicated when the client retries on reconnection.

---

## Client-Side Operation Lifecycle

### 1. Generate Operation ID

Before any write, the client generates a UUID as the `operation_id`. This value is created client-side using `crypto.randomUUID()` or equivalent — never from the server.

The operation ID is generated once per logical action and persisted locally before the network request is attempted.

### 2. Store in PendingSync

The client stores the operation in IndexedDB (via Dexie) in a `PendingSync` table before attempting any server communication.

| Field | Purpose |
|-------|---------|
| `operation_id` | Client-generated UUID |
| `operation_type` | `'create'`, `'update'`, or `'delete'` |
| `table_name` | Target server table |
| `record_id` | ID of the record being written (if known) |
| `payload` | Full JSON body to send |
| `status` | `'pending'` or `'completed'` |
| `created_at` | When the operation was queued locally |

This guarantees the operation survives even if the browser tab is closed before the network call completes.

### 3. Attempt Server Write

The client sends the write to the Supabase server with the `operation_id` included in the payload.

On success: the client marks the PendingSync row as `'completed'` and the local UI updates to reflect the confirmed state.

On network failure: the PendingSync row remains in `'pending'` status. The client retries on the next connectivity event or sync attempt.

On conflict or duplicate: if the server returns a unique constraint violation on `operation_id`, the client treats the operation as already applied and marks it `'completed'` locally.

---

## Server-Side Idempotency

### sync_operations Table

The server maintains a `sync_operations` table that mirrors the client's pending queue. Every client operation is recorded here.

| Field | Purpose |
|-------|---------|
| `id` | Server-generated UUID (primary key) |
| `user_id` | FK to auth.users |
| `operation_id` | Client-generated UUID with UNIQUE constraint |
| `operation_type` | `'create'`, `'update'`, or `'delete'` |
| `table_name` | Target table name |
| `record_id` | ID of the affected record |
| `payload` | Full request payload |
| `status` | `'pending'`, `'processing'`, `'completed'`, or `'failed'` |
| `processed_at` | When the operation was applied |
| `error_message` | Failure details if status is `'failed'` |

### UNIQUE Constraint as Idempotency Gate

The `operation_id UNIQUE` constraint on `sync_operations` is the primary idempotency mechanism:

1. Client sends an operation with `operation_id = "abc-123"`
2. Server inserts into `sync_operations` — succeeds
3. Server applies the actual write to the target table
4. Server marks `sync_operations.status = 'completed'`

If the same `operation_id` arrives again (retry, reconnect, duplicate tap):

1. Server attempts insert into `sync_operations` — UNIQUE constraint violation
2. Server looks up the existing row
3. If `status = 'completed'` — returns success (idempotent replay)
4. If `status = 'pending'` or `'processing'` — the operation is already in flight

No duplicate writes occur regardless of how many times the client sends the same operation.

---

## workout_sessions Idempotency

Workout sessions use a parallel mechanism via `client_operation_id UNIQUE` on the `workout_sessions` table itself.

The `client_operation_id` is sent as part of the session creation payload. If a duplicate arrives:

1. PostgreSQL rejects the INSERT due to the unique constraint
2. The application catches the conflict and returns the existing session
3. The client treats it as a successful creation

This provides session-level idempotency independent of the `sync_operations` table.

---

## Conflict Resolution

Different data types require different conflict resolution strategies.

### Last-Write-Wins (Profile Updates)

For profile and fitness profile updates, the most recent write wins. There are no append-only concerns — the user is editing their own profile, and the latest value is always the correct one.

Conflict scenario: user edits profile on Device A while offline, then edits on Device B while online. When Device A reconnects, its write overwrites Device B's write. This is acceptable because profile data is low-frequency and the user意图 is always "set to this value."

### Append-Only (Sessions and Weight)

Workout sessions and weight entries are append-only. Each write creates a new row rather than modifying an existing one.

Conflict scenario: user logs a weight entry on Device A while offline, then logs a different entry on Device B. Both writes create independent rows — no conflict occurs because neither modifies an existing record.

Session creation is inherently append-only — a new session is always a new row. The `client_operation_id` UNIQUE constraint prevents the same session from being inserted twice.

### Plan Day State (Server-Authoritative)

Plan day status transitions (locked to available to completed) are server-authoritative. The client does not directly write plan day status — it sends a "complete this session" operation, and the server transactionally updates both the session and the plan day.

This eliminates client-side conflicts for plan progression entirely.

---

## Bulk Sync

When the client reconnects after an extended offline period, it sends all pending operations in bulk.

### Sync Sequence

1. Client reads all PendingSync rows with `status = 'pending'` from IndexedDB
2. Operations are sorted by `created_at` (oldest first) to maintain logical order
3. Client sends each operation to the server sequentially
4. On success: mark the PendingSync row as `'completed'`
5. On failure: stop bulk sync; remaining operations stay `'pending'` for next attempt

### Order Sensitivity

Most operations are independent and order does not matter (weight entries, favorites, profile updates). However, if a session completion depends on a session creation, the client must send the creation first. The `created_at` ordering handles this naturally.

### Partial Failure

If 5 of 10 pending operations succeed and operation 6 fails:

- Operations 1-5 are marked `'completed'` locally
- Operations 6-10 remain `'pending'`
- The server has a consistent state for operations 1-5
- The next sync attempt resumes from operation 6

---

## Client Offline Table (Dexie/IndexedDB)

The client-side PendingSync table is managed via Dexie (IndexedDB wrapper).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | auto-increment | Local row key |
| `operation_id` | string (UUID) | Matches server operation_id |
| `operation_type` | string | `'create'`, `'update'`, `'delete'` |
| `table_name` | string | Target table on server |
| `record_id` | string | Record ID if known |
| `payload` | object | Full request body |
| `status` | string | `'pending'` or `'completed'` |
| `created_at` | number | Epoch timestamp |

The Dexie database persists across browser sessions. Closing the tab or refreshing the page does not discard pending operations.

---

## Connectivity Detection

The client listens for online/offline events:

- `navigator.onLine` changes from false to true triggers a sync attempt
- Periodic background sync (via Service Worker) retries pending operations
- Manual pull-to-refresh on relevant screens triggers sync

The client does not block the UI while waiting for sync. Local state is optimistic — the UI reflects the pending operation immediately, and server confirmation updates it asynchronously.

---

## Related Documents

- `session-model.md` — How workout sessions use client_operation_id for idempotency
- `workout-plan-model.md` — How plan day completion is server-authoritative
- `schema.md` — Full definition of sync_operations and workout_sessions tables
- `relationships.md` — Foreign key behavior for sync_operations
