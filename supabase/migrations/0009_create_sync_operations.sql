-- Migration 0009: Sync Operations (Offline Idempotency)
-- Tracks offline-created operations for conflict-free server reconciliation.

-- ============================================================
-- SYNC OPERATIONS
-- ============================================================
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL UNIQUE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sync_operations IS 'Offline operation queue. operation_id is client-generated for idempotency. payload stores the full record for reconciliation.';

CREATE INDEX idx_sync_operations_user_status ON sync_operations (user_id, status);
CREATE INDEX idx_sync_operations_operation_id ON sync_operations (operation_id);
CREATE INDEX idx_sync_operations_created ON sync_operations (created_at ASC);
