/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnitPerSection } from "../../../components/instructions/UnitPerSection";

const BASE_FORM = {
  rateWeight: "Container",
  shipmentTypeId: "1",
  unitRate: "",
  weight: "",
};

const defaultProps = {
  formData: BASE_FORM,
  fieldErrors: {},
  fieldRefs: {},
  isSetRate: false,
  isReadOnly: false,
  isAddOn: false,
  historicalSetRate: null,
  setRateValue: 0,
  onInputChange: jest.fn(),
  onSetRateChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("UnitPerSection — rendering", () => {
  it("renders Unit per label", () => {
    render(<UnitPerSection {...defaultProps} />);
    expect(screen.getByText("Unit per")).toBeInTheDocument();
  });

  it("shows Container option for shipmentTypeId=1 (Import)", () => {
    render(<UnitPerSection {...defaultProps} />);
    expect(screen.getByRole("combobox")).toHaveValue("Container");
    expect(screen.getByText("Container")).toBeInTheDocument();
  });

  it("shows kg and ton options for shipmentTypeId=4 (Break bulk)", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
      />
    );
    const select = screen.getByRole("combobox");
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("kg");
    expect(options).toContain("ton");
    expect(options).not.toContain("Container");
  });

  it("does not show weight-based inputs when rateWeight=Container", () => {
    render(<UnitPerSection {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/rate/i)).not.toBeInTheDocument();
  });

  it("shows unit rate input when rateWeight=kg", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
      />
    );
    expect(screen.getByText(/Rate per kg/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows weight field for non-type-4 when weight-based", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "1", rateWeight: "ton" }}
      />
    );
    expect(screen.getByText(/Weight \(ton\)/)).toBeInTheDocument();
  });

  it("hides weight field for shipmentTypeId=4 even when weight-based", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
      />
    );
    expect(screen.queryByText(/Weight \(ton\)/)).not.toBeInTheDocument();
  });
});

describe("UnitPerSection — Set Rate (type 4)", () => {
  it("shows Set Rate checkbox for shipmentTypeId=4", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
      />
    );
    expect(screen.getByText("Break Bulk Set Rate")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("does not show Set Rate checkbox for other shipment types", () => {
    render(<UnitPerSection {...defaultProps} />);
    expect(screen.queryByText("Break Bulk Set Rate")).not.toBeInTheDocument();
  });

  it("checkbox is checked when isSetRate=true", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
        isSetRate={true}
      />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows set rate value input when isSetRate=true", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
        isSetRate={true}
        setRateValue={500}
      />
    );
    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
  });

  it("shows historicalSetRate when isReadOnly=true and historicalSetRate is set", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
        isSetRate={true}
        isReadOnly={true}
        historicalSetRate={750}
        setRateValue={0}
      />
    );
    expect(screen.getByDisplayValue("750")).toBeInTheDocument();
  });
});

describe("UnitPerSection — disabled states", () => {
  it("dropdown is disabled when isReadOnly=true", () => {
    render(<UnitPerSection {...defaultProps} isReadOnly={true} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("dropdown is disabled when isAddOn=true", () => {
    render(<UnitPerSection {...defaultProps} isAddOn={true} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("unit rate input is disabled when isReadOnly=true", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        isReadOnly={true}
      />
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("Set Rate checkbox is disabled when isReadOnly=true", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
        isReadOnly={true}
      />
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

describe("UnitPerSection — callbacks", () => {
  it("calls onInputChange when dropdown changes", () => {
    const onInputChange = jest.fn();
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        onInputChange={onInputChange}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ton" } });
    expect(onInputChange).toHaveBeenCalledTimes(1);
  });

  it("calls onInputChange for valid numeric unit rate", () => {
    const onInputChange = jest.fn();
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        onInputChange={onInputChange}
      />
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123.45" } });
    expect(onInputChange).toHaveBeenCalledTimes(1);
  });

  it("does not call onInputChange for non-numeric unit rate", () => {
    const onInputChange = jest.fn();
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        onInputChange={onInputChange}
      />
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it("calls onSetRateChange when Set Rate checkbox is toggled", () => {
    const onSetRateChange = jest.fn();
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "ton" }}
        onSetRateChange={onSetRateChange}
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSetRateChange).toHaveBeenCalledWith(true);
  });
});

describe("UnitPerSection — error classes", () => {
  it("applies error class to unit rate input when unitRate error exists", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        fieldErrors={{ unitRate: "Rate required" }}
      />
    );
    expect(screen.getByRole("textbox")).toHaveClass(
      "controller-instructions-error-field"
    );
  });

  it("shows unitRate error tooltip message", () => {
    render(
      <UnitPerSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4", rateWeight: "kg" }}
        fieldErrors={{ unitRate: "Rate required" }}
      />
    );
    expect(screen.getByText("Rate required")).toBeInTheDocument();
  });
});
