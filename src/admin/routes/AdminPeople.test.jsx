import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import AdminPeople from "./AdminPeople";
import AdminPersonDetail from "./AdminPersonDetail";

const profiles = [
  { id: "o1", full_name: "Widson Omutelema Ambaisi", email: "widson@botaniquedesigners.com", role: "owner" },
  { id: "m1", full_name: "Martine Lotom", email: "martine@botaniquedesigners.com", role: "manager" },
];

const people = [
  { id: "person-1", fullName: "Lincoln Waweru", relationshipType: "crew_representative", phone: "0700 000 001", note: "Leads the Karen crew.", isActive: true, profileId: "", version: 3 },
  { id: "person-2", fullName: "Martine Lotom", relationshipType: "operations_manager", phone: "", note: "", isActive: true, profileId: "m1", version: 1 },
  { id: "person-3", fullName: "Former Hand", relationshipType: "regular_staff", phone: "", note: "", isActive: false, profileId: "", version: 2 },
];

const engagements = [
  { id: "eng-1", personId: "person-1", projectId: "p1", engagementRole: "team_leader", startDate: "2026-06-01", endDate: "", endReason: "", version: 1 },
  { id: "eng-2", personId: "person-1", projectId: "p1", engagementRole: "supervisor", startDate: "2026-03-01", endDate: "2026-05-31", endReason: "Phase completed", version: 2 },
];

const engagementProjects = [{ id: "p1", projectName: "Lugulu Residential Home", status: "Ongoing", archived: false }];

// `profiles` is row-level secured to "self or owner", so an Operations Manager
// genuinely receives only their own row. The fixture mirrors that rather than
// handing every role the full list.
function contexts(overrides = {}) {
  const { role = "owner", visibleProfiles, ...rest } = overrides;
  const adminProfiles = visibleProfiles
    || (role === "owner" ? profiles : profiles.filter((profile) => profile.id === "m1"));
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects: engagementProjects, profiles: adminProfiles },
    people: {
      people, engagements, engagementProjects, status: "ready", error: "",
      refresh: vi.fn(() => Promise.resolve({ ok: true })),
      addPerson: vi.fn(() => Promise.resolve({ ok: true })),
      editPerson: vi.fn(() => Promise.resolve({ ok: true })),
      addEngagement: vi.fn(() => Promise.resolve({ ok: true })),
      closeEngagement: vi.fn(() => Promise.resolve({ ok: true })),
      engagementsForPerson: (id) => engagements.filter((engagement) => engagement.personId === id),
      peopleById: new Map(people.map((person) => [person.id, person])),
      ...rest,
    },
  };
}

function wrap(values, initial = "/admin/people") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={values.admin}>
        <PeopleContext.Provider value={values.people}>
          <Routes>
            <Route path="/admin/people" element={<AdminPeople />} />
            <Route path="/admin/people/:personId" element={<AdminPersonDetail />} />
          </Routes>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("People overview", () => {
  it("summarises the register and lists active people by default", () => {
    wrap(contexts());
    expect(screen.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(screen.getByText("Lincoln Waweru")).toBeInTheDocument();
    // Inactive people are out of the default view, not deleted.
    expect(screen.queryByText("Former Hand")).not.toBeInTheDocument();
    expect(screen.getByText("With portal access").parentElement).toHaveTextContent("1");
  });

  it("shows a person without portal access as an ordinary register entry", () => {
    wrap(contexts());
    const badges = screen.getAllByText("Portal access");
    // Only the one linked person is badged; a person is not defined by a login.
    expect(badges).toHaveLength(1);
  });

  it("refuses a duplicate canonical name before writing anything", async () => {
    const values = contexts();
    wrap(values);
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "  lincoln   waweru " } });
    fireEvent.click(screen.getByRole("button", { name: "Save person" }));
    await waitFor(() => {
      expect(screen.getByText(/already on the register/)).toBeInTheDocument();
    });
    expect(values.people.addPerson).not.toHaveBeenCalled();
  });

  it("creates a person without ever sending a portal link", async () => {
    const values = contexts();
    wrap(values);
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Joseph Mwangi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save person" }));
    await waitFor(() => expect(values.people.addPerson).toHaveBeenCalled());
    const payload = values.people.addPerson.mock.calls[0][0];
    expect(payload.fullName).toBe("Joseph Mwangi");
    expect(payload).not.toHaveProperty("profileId");
    expect(payload).not.toHaveProperty("isActive");
  });

  it("filters to inactive people on request", () => {
    wrap(contexts(), "/admin/people?status=inactive");
    expect(screen.getByText("Former Hand")).toBeInTheDocument();
    expect(screen.queryByText("Lincoln Waweru")).not.toBeInTheDocument();
  });

  it("states the empty register plainly", () => {
    wrap(contexts({ people: [], engagements: [] }));
    expect(screen.getByText(/No one is on the register yet/)).toBeInTheDocument();
  });

  it("denies the register to a staff reader", () => {
    wrap(contexts({ role: "staff" }));
    expect(screen.getByRole("heading", { name: "People unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("Lincoln Waweru")).not.toBeInTheDocument();
  });
});

describe("Person detail", () => {
  it("separates current from past engagements without a payment ledger", () => {
    wrap(contexts(), "/admin/people/person-1");
    expect(screen.getByRole("heading", { level: 1, name: "Lincoln Waweru" })).toBeInTheDocument();
    expect(screen.getByText("Current engagements")).toBeInTheDocument();
    expect(screen.getByText("Past engagements")).toBeInTheDocument();
    expect(screen.getByText(/Phase completed/)).toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Attendance/i)).not.toBeInTheDocument();
  });

  it("tells the reader plainly that a person has no portal account", () => {
    wrap(contexts(), "/admin/people/person-1");
    expect(screen.getByText(/No portal account/)).toBeInTheDocument();
  });

  it("offers portal linking to the Principal only", () => {
    wrap(contexts({ role: "manager" }), "/admin/people/person-1");
    expect(screen.getByText(/Only the Principal can change portal access/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Linked account/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark inactive/ })).not.toBeInTheDocument();
  });

  it("lets the Principal link a portal account as a separate deliberate action", async () => {
    const values = contexts();
    wrap(values, "/admin/people/person-1");
    fireEvent.change(screen.getByLabelText(/Linked account/), { target: { value: "m1" } });
    await waitFor(() => expect(values.people.editPerson).toHaveBeenCalledWith("person-1", 3, { profile_id: "m1" }));
    expect(await screen.findByText(/granted no new access/)).toBeInTheDocument();
  });

  it("records an engagement against a project the reader can reach", async () => {
    const values = contexts({ role: "manager" });
    wrap(values, "/admin/people/person-1");
    fireEvent.click(screen.getByRole("button", { name: "Engage on a project" }));
    fireEvent.change(screen.getByLabelText(/^Project$/), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText(/Starts/), { target: { value: "2026-08-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Record engagement" }));
    await waitFor(() => expect(values.people.addEngagement).toHaveBeenCalled());
    expect(values.people.addEngagement.mock.calls[0][0]).toMatchObject({
      personId: "person-1", projectId: "p1", startDate: "2026-08-03",
    });
  });

  it("ends an engagement without rewriting operational history", async () => {
    const values = contexts();
    wrap(values, "/admin/people/person-1");
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    expect(screen.getByText(/no site, cost or approval record changes/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Ends$/), { target: { value: "2026-08-31" } });
    fireEvent.click(screen.getByRole("button", { name: "End engagement" }));
    await waitFor(() => expect(values.people.closeEngagement).toHaveBeenCalledWith("eng-1", 1, "2026-08-31", ""));
  });

  // profiles is itself row-level secured, so an Operations Manager reads only
  // their own. An unresolved profile must never be reported as "no portal
  // account", which would state the opposite of the truth.
  it("does not claim a linked person has no portal account when the name is unreadable", () => {
    // person-4 is linked to the Principal's profile, which a manager cannot read.
    wrap(contexts({
      role: "manager",
      people: [...people, { id: "person-4", fullName: "Linked Elsewhere", relationshipType: "regular_staff", phone: "", note: "", isActive: true, profileId: "o1", version: 1 }],
    }), "/admin/people/person-4");
    expect(screen.getByText(/Linked to a portal account you cannot view/)).toBeInTheDocument();
    expect(screen.queryByText(/No portal account/)).not.toBeInTheDocument();
  });

  // An engagement outlives its project. Archiving a project must not turn a
  // person's history into "a project you cannot access".
  it("keeps an archived project readable in history but out of the engage picker", () => {
    const archived = { id: "p2", projectName: "Muthithi Gardens Estate", status: "Completed", archived: true };
    wrap(contexts({
      engagementProjects: [...engagementProjects, archived],
      engagements: [
        { id: "eng-3", personId: "person-1", projectId: "p2", engagementRole: "supervisor", startDate: "2026-01-01", endDate: "2026-02-01", endReason: "", version: 1 },
      ],
    }), "/admin/people/person-1");

    expect(screen.getByText("Muthithi Gardens Estate")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Engage on a project" }));
    const options = [...screen.getByLabelText(/^Project$/).options].map((option) => option.textContent);
    expect(options).toContain("Lugulu Residential Home");
    expect(options).not.toContain("Muthithi Gardens Estate");
  });

  it("names an engagement on an unreachable project without inventing its detail", () => {
    wrap(contexts({
      engagements: [{ id: "eng-9", personId: "person-1", projectId: "hidden", engagementRole: "consultant", startDate: "2026-05-01", endDate: "", endReason: "", version: 1 }],
    }), "/admin/people/person-1");
    expect(screen.getByText("A project you cannot access")).toBeInTheDocument();
  });

  it("keeps a deactivated person readable and out of new engagements", () => {
    wrap(contexts(), "/admin/people/person-3");
    expect(screen.getByRole("heading", { level: 1, name: "Former Hand" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Engage on a project" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark active" })).toBeInTheDocument();
  });

  // Duplicates are refused and nothing can be deleted, so without an edit path a
  // mistyped name would be permanent and the person could not be re-created.
  it("lets an operational role correct a person's ordinary details", async () => {
    const values = contexts({ role: "manager" });
    wrap(values, "/admin/people/person-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Lincoln WawerU " } });
    fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: "0700 000 111" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(values.people.editPerson).toHaveBeenCalled());
    const [id, version, patch] = values.people.editPerson.mock.calls[0];
    expect(id).toBe("person-1");
    expect(version).toBe(3);
    expect(patch).toEqual({
      full_name: "Lincoln WawerU",
      relationship_type: "crew_representative",
      phone: "0700 000 111",
      note: "Leads the Karen crew.",
    });
    // Editing never touches access or lifecycle.
    expect(patch).not.toHaveProperty("profile_id");
    expect(patch).not.toHaveProperty("is_active");
  });

  it("refuses an edit that renames a person onto another person's name", async () => {
    const values = contexts();
    wrap(values, "/admin/people/person-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "  martine   lotom " } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => {
      expect(screen.getByText(/already on the register under that name/)).toBeInTheDocument();
    });
    expect(values.people.editPerson).not.toHaveBeenCalled();
  });

  it("does not treat a person's own unchanged name as a duplicate", async () => {
    const values = contexts();
    wrap(values, "/admin/people/person-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: "Updated note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(values.people.editPerson).toHaveBeenCalled());
  });

  it("reports a person who is not on the register", () => {
    wrap(contexts(), "/admin/people/missing");
    expect(screen.getByRole("heading", { name: "Person not found" })).toBeInTheDocument();
  });
});
