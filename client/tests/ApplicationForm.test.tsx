import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationForm } from "../src/components/ApplicationForm";

describe("<ApplicationForm />", () => {
  it("shows an error and does not submit when required fields are empty", async () => {
    const onSubmit = vi.fn();
    render(<ApplicationForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Company and role are required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the typed values and clears the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ApplicationForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Company"), "Acme");
    await userEvent.type(screen.getByLabelText("Role"), "Full Stack Developer");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "applied");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      company: "Acme",
      role: "Full Stack Developer",
      status: "applied",
      applied_on: null,
      notes: null,
    });
    expect(screen.getByLabelText("Company")).toHaveValue("");
  });

  it("shows the API error message if saving fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server said no"));
    render(<ApplicationForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Company"), "Acme");
    await userEvent.type(screen.getByLabelText("Role"), "Dev");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server said no");
  });
});
