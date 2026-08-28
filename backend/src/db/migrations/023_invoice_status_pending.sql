-- Replace invoice status model: remove 'draft' and 'sent', introduce 'pending'.
-- 'pending' covers all unpaid invoices visible to the business owner.

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

UPDATE invoices
SET status = 'pending', updated_at = NOW()
WHERE status IN ('draft', 'sent');

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));
