import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminDataContext } from "../context/adminData";
import SaveFeedback from "./SaveFeedback";

describe("SaveFeedback", () => {
  it("offers a working retry action for saved-with-refresh-warning", async () => {
    const refetchProjects = vi.fn().mockResolvedValue({ ok: true });
    const clearSaveFeedback = vi.fn();
    render(
      <AdminDataContext.Provider
        value={{
          saveFeedback: {
            type: "warning",
            message:
              "The project was saved, but the latest project list could not be refreshed. Retry refresh.",
          },
          refetchProjects,
          clearSaveFeedback,
        }}
      >
        <SaveFeedback />
      </AdminDataContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry refresh" }));
    await waitFor(() => expect(refetchProjects).toHaveBeenCalledTimes(1));
    expect(clearSaveFeedback).toHaveBeenCalledTimes(1);
  });
});
