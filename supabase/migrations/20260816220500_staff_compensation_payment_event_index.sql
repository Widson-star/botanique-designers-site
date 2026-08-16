-- Cover the payment_id foreign key on Staff Compensation payment events.
-- This is a performance-only follow-up to the already-applied payment migration.

create index staff_compensation_payment_events_payment_idx
  on public.staff_compensation_payment_events (payment_id);
