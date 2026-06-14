const badgeStyles = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Ongoing: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Completed: "bg-blue-100 text-blue-800 border-blue-200",
  Paused: "bg-stone-100 text-stone-700 border-stone-200",
  Cancelled: "bg-red-100 text-red-800 border-red-200",
  "Design-only": "bg-violet-100 text-violet-800 border-violet-200",
  "Private / Do Not Publish": "bg-red-100 text-red-800 border-red-200",
  "Permission Needed": "bg-amber-100 text-amber-800 border-amber-200",
  "Approved For Portfolio": "bg-emerald-100 text-emerald-800 border-emerald-200",
  Eligible: "bg-green-100 text-green-800 border-green-200",
  "Not Reviewed": "bg-stone-100 text-stone-700 border-stone-200",
  "Not Applicable": "bg-stone-100 text-stone-700 border-stone-200",
};

export default function ProjectBadge({ value }) {
  const style = badgeStyles[value] || "bg-botanique-beige text-botanique-charcoal border-stone-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      {value || "Not set"}
    </span>
  );
}
