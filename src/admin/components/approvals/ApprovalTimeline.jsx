import { APPROVAL_EVENT_LABELS } from "../../utils/approvalFormatters";
import { formatDateTime } from "../../utils/activityFormat";
import { profilePresentationName } from "../../utils/personName";

export default function ApprovalTimeline({ events, profilesById }) {
  if (!events.length) {
    return <p className="text-sm text-gray-500">No approval events are available.</p>;
  }
  return (
    <ol className="space-y-0">
      {events.map((event) => {
        const actor = profilesById[event.actorId];
        return (
          <li key={event.id} className="border-l border-stone-200 pb-5 pl-4 last:pb-0">
            <div className="-ml-[1.16rem] inline-block h-2 w-2 rounded-full bg-botanique-green" />
            <div className="-mt-4">
              <p className="text-sm font-medium">
                {APPROVAL_EVENT_LABELS[event.eventType] || "Approval activity"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {actor ? profilePresentationName(actor, "Authorised user") : "Authorised user"}
                {" · "}{formatDateTime(event.occurredAt)}{" · Round "}{event.roundNumber}
              </p>
              {event.eventNotes && (
                <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{event.eventNotes}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
