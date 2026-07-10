/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionButtons } from "../../../components/instructions/ActionButtons";

describe("ActionButtons", () => {
  const defaultProps = {
    isReadOnly: false,
    status: "New",
    isInvoiced: false,
    onSave: jest.fn(),
    onDelete: jest.fn(),
    onInvoice: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  // ── Read-only mode ────────────────────────────────────────────────────────

  it("shows read-only message when isReadOnly=true", () => {
    render(<ActionButtons {...defaultProps} isReadOnly={true} status="Completed" />);
    expect(
      screen.getByText(/This instruction is Completed and cannot be edited/)
    ).toBeInTheDocument();
    expect(screen.queryByText("Save Changes")).not.toBeInTheDocument();
  });

  // ── Edit mode ─────────────────────────────────────────────────────────────

  it("shows Save Changes button when not read-only", () => {
    render(<ActionButtons {...defaultProps} />);
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("calls onSave when Save Changes is clicked", () => {
    render(<ActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Save Changes"));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it("shows Delete and Invoice buttons when status is New", () => {
    render(<ActionButtons {...defaultProps} status="New" />);
    expect(screen.getByText("Delete Instruction")).toBeInTheDocument();
    expect(screen.getByText("Invoice")).toBeInTheDocument();
  });

  it("shows Delete and Invoice buttons when status is In Progress", () => {
    render(<ActionButtons {...defaultProps} status="In Progress" />);
    expect(screen.getByText("Delete Instruction")).toBeInTheDocument();
    expect(screen.getByText("Invoice")).toBeInTheDocument();
  });

  it("hides Delete and Invoice buttons for other statuses", () => {
    render(<ActionButtons {...defaultProps} status="Completed" isReadOnly={false} />);
    expect(screen.queryByText("Delete Instruction")).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice")).not.toBeInTheDocument();
  });

  it("calls onDelete when Delete Instruction is clicked", () => {
    render(<ActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete Instruction"));
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onInvoice when Invoice is clicked", () => {
    render(<ActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Invoice"));
    expect(defaultProps.onInvoice).toHaveBeenCalledTimes(1);
  });

  it("hides Invoice button when isInvoiced=true", () => {
    render(<ActionButtons {...defaultProps} isInvoiced={true} />);
    expect(screen.queryByText("Invoice")).not.toBeInTheDocument();
    expect(screen.getByText("Delete Instruction")).toBeInTheDocument();
  });

  it("still shows Save Changes when invoiced", () => {
    render(<ActionButtons {...defaultProps} isInvoiced={true} />);
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });
});
