/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationModal } from "../../../components/instructions/ConfirmationModal";

describe("ConfirmationModal", () => {
  const defaultProps = {
    isOpen: true,
    message: "Are you sure?",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmationModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title and message when open", () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<ConfirmationModal {...defaultProps} title="Delete Instruction" />);
    expect(screen.getByText("Delete Instruction")).toBeInTheDocument();
  });

  it("renders default button text", () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText("Yes, Continue")).toBeInTheDocument();
    expect(screen.getByText("No, Let Me Edit")).toBeInTheDocument();
  });

  it("renders custom button text", () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        confirmText="Reset Counts & Continue"
        cancelText="Cancel"
      />
    );
    expect(screen.getByText("Reset Counts & Continue")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Yes, Continue"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("No, Let Me Edit"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses blue confirm button by default", () => {
    render(<ConfirmationModal {...defaultProps} />);
    const confirmBtn = screen.getByText("Yes, Continue");
    expect(confirmBtn.style.backgroundColor).toBe("rgb(74, 144, 226)");
  });

  it("uses orange confirm button for warning variant", () => {
    render(<ConfirmationModal {...defaultProps} variant="warning" />);
    const confirmBtn = screen.getByText("Yes, Continue");
    expect(confirmBtn.style.backgroundColor).toBe("rgb(230, 126, 34)");
  });
});
