import { useState } from "react";
import { useAdminData } from "../../context/adminData";
import { useAdminApprovals } from "../../context/adminApprovals";
import {
  ACTIVE_APPROVAL_STATES,
  originalValuesForApproval,
  requestableProjectApprovalTypes,
} from "../../utils/approvalCapabilities";
import { APPROVAL_TYPE_LABELS } from "../../utils/approvalFormatters";
import ApprovalRequestDialog from "./ApprovalRequestDialog";

export default function ProjectApprovalActions({ project }) {
  const { role, currentUserId } = useAdminData();
  const { requests, submit } = useAdminApprovals();
  const [selectedType, setSelectedType] = useState("");
  const available = requestableProjectApprovalTypes(role, project);
  if (!available.length) return null;

  const activeTypes = new Set(
    requests
      .filter((request) => (
        request.projectId === project.id &&
        ACTIVE_APPROVAL_STATES.includes(request.state)
      ))
      .map((request) => request.approvalType)
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="approval-actions-title">
      <h2 id="approval-actions-title" className="text-base font-semibold">Protected project changes</h2>
      <p className="mt-1 text-sm text-gray-500">
        Submit these material changes to the Principal for approval. The project is unchanged until approval.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {available.map((type) => {
          const pending = activeTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              disabled={pending}
              onClick={() => setSelectedType(type)}
              className="rounded-md border border-stone-300 px-3 py-2 text-xs font-medium text-botanique-charcoal hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-gray-400"
            >
              {pending ? `${APPROVAL_TYPE_LABELS[type]} pending` : `Request ${APPROVAL_TYPE_LABELS[type].toLowerCase()}`}
            </button>
          );
        })}
      </div>
      {selectedType && (
        <ApprovalRequestDialog
          open
          project={project}
          approvalType={selectedType}
          onCancel={() => setSelectedType("")}
          onSubmit={async (values) => {
            const result = await submit({
              ...values,
              projectId: project.id,
              approvalType: selectedType,
              requesterId: currentUserId,
              originalValues: originalValuesForApproval(selectedType, project),
            });
            if (result.ok) setSelectedType("");
            return result;
          }}
        />
      )}
    </section>
  );
}
