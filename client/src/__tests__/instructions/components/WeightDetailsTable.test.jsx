/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeightDetailsTable } from "../../../components/instructions/WeightDetailsTable";

const ROWS = [
  { id: 1, ksmDmNo: "KSM001", ticketNo: "T001", receiptBookNo: "R001", weight: "1500" },
  { id: 2, ksmDmNo: "KSM002", ticketNo: "T002", receiptBookNo: "R002", weight: "2000" },
];

const defaultProps = {
  rows: ROWS,
  rateWeight: "ton",
  isReadOnly: false,
  onUpdateRow: jest.fn(),
  onDeleteRow: jest.fn(),
  onAddRow: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("WeightDetailsTable — rendering", () => {
  it("renders column headers", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    expect(screen.getByText("KSM DN Number")).toBeInTheDocument();
    expect(screen.getByText("Ticket Number")).toBeInTheDocument();
    expect(screen.getByText("Receipt Book Number")).toBeInTheDocument();
    expect(screen.getByText("Weight (ton)")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders weight unit in column header from rateWeight prop", () => {
    render(<WeightDetailsTable {...defaultProps} rateWeight="kg" />);
    expect(screen.getByText("Weight (kg)")).toBeInTheDocument();
  });

  it("renders one row per entry in rows", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    expect(screen.getByDisplayValue("KSM001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("KSM002")).toBeInTheDocument();
  });

  it("renders row field values", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    expect(screen.getByDisplayValue("T001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("R001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
  });

  it("renders Weight Details label", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    expect(screen.getByText("Weight Details")).toBeInTheDocument();
  });
});

describe("WeightDetailsTable — read-only state", () => {
  it("shows Delete buttons when not read-only", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(ROWS.length);
  });

  it("hides Delete buttons when isReadOnly=true", () => {
    render(<WeightDetailsTable {...defaultProps} isReadOnly={true} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("shows Add Row button when not read-only", () => {
    render(<WeightDetailsTable {...defaultProps} />);
    expect(screen.getByText("Add Row")).toBeInTheDocument();
  });

  it("hides Add Row button when isReadOnly=true", () => {
    render(<WeightDetailsTable {...defaultProps} isReadOnly={true} />);
    expect(screen.queryByText("Add Row")).not.toBeInTheDocument();
  });

  it("disables all text inputs when isReadOnly=true", () => {
    render(<WeightDetailsTable {...defaultProps} isReadOnly={true} />);
    screen.getAllByRole("textbox").forEach((input) =>
      expect(input).toBeDisabled()
    );
  });
});

describe("WeightDetailsTable — callbacks", () => {
  it("calls onUpdateRow when ksmDmNo changes", () => {
    const onUpdateRow = jest.fn();
    render(<WeightDetailsTable {...defaultProps} onUpdateRow={onUpdateRow} />);
    fireEvent.change(screen.getByDisplayValue("KSM001"), {
      target: { value: "KSM999" },
    });
    expect(onUpdateRow).toHaveBeenCalledWith(1, "ksmDmNo", "KSM999");
  });

  it("calls onUpdateRow for valid numeric weight", () => {
    const onUpdateRow = jest.fn();
    render(<WeightDetailsTable {...defaultProps} onUpdateRow={onUpdateRow} />);
    fireEvent.change(screen.getByDisplayValue("1500"), {
      target: { value: "1750.5" },
    });
    expect(onUpdateRow).toHaveBeenCalledWith(1, "weight", "1750.5");
  });

  it("does not call onUpdateRow for non-numeric weight", () => {
    const onUpdateRow = jest.fn();
    render(<WeightDetailsTable {...defaultProps} onUpdateRow={onUpdateRow} />);
    fireEvent.change(screen.getByDisplayValue("1500"), {
      target: { value: "abc" },
    });
    expect(onUpdateRow).not.toHaveBeenCalled();
  });

  it("calls onDeleteRow with the row when Delete is clicked", () => {
    const onDeleteRow = jest.fn();
    render(<WeightDetailsTable {...defaultProps} onDeleteRow={onDeleteRow} />);
    fireEvent.click(screen.getAllByText("Delete")[0]);
    expect(onDeleteRow).toHaveBeenCalledWith(ROWS[0]);
  });

  it("calls onAddRow when Add Row is clicked", () => {
    const onAddRow = jest.fn();
    render(<WeightDetailsTable {...defaultProps} onAddRow={onAddRow} />);
    fireEvent.click(screen.getByText("Add Row"));
    expect(onAddRow).toHaveBeenCalledTimes(1);
  });
});

describe("WeightDetailsTable — empty rows", () => {
  it("renders header with no data rows when rows is empty", () => {
    render(<WeightDetailsTable {...defaultProps} rows={[]} />);
    expect(screen.getByText("KSM DN Number")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("KSM001")).not.toBeInTheDocument();
  });
});
