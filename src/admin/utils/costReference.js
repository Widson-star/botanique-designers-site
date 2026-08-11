// The human-readable reference for a project cost.
//
// NOT INVENTED HERE. `ICC-` followed by the first eight hex characters of the
// claim id is already the established convention in the merged schema: it is
// what `create_claim_backed_fund_request` stamps into
// `fund_request_allocations.claim_reference_snapshot`, and what the
// `available_claims_for_fund_request` RPC returns as `claim_reference`. The
// register simply shows the reference the rest of the system already uses,
// rather than a raw UUID or a new numbering scheme.
//
// A sequential, stored cost number would be better — it would survive an id
// change and read more naturally to a non-technical Principal — but that is a
// schema decision, not an implementation one, and it is reported rather than
// taken.

export function costReference(claim) {
  const id = String(claim?.id || "");
  const hex = id.replace(/-/g, "");
  if (!hex) return "—";
  // Demo ids are not UUIDs. Rather than print a meaningless slice of one, fall
  // back to a dash so nothing that looks like a real reference is fabricated.
  if (hex.length < 8 || !/^[0-9a-f]+$/i.test(hex.slice(0, 8))) return "—";
  return `ICC-${hex.slice(0, 8).toUpperCase()}`;
}
