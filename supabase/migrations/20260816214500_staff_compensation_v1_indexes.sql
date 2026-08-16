-- Staff Compensation V1 — cover actor/requester foreign keys identified by the
-- Supabase performance advisor. This is intentionally limited to the new Staff
-- Compensation module; pre-existing index debt in other Hub domains is untouched.

create index staff_compensations_requester_idx
  on public.staff_compensations (requester_id);

create index staff_compensations_decider_idx
  on public.staff_compensations (decider_id)
  where decider_id is not null;

create index staff_compensation_events_actor_idx
  on public.staff_compensation_events (actor_id);
