/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContainerCountsSection } from "../../../components/instructions/ContainerCountsSection";

const BASE_FORM = {
  rateWeight: "Container",
  num_six_meters: 2,
  num_twelve_meters: 1,
  num_abnormal: 0,
  rateper_6: 100,
  rateper_12: 200,
  rateper_abnormal: 150,
};

const defaultProps = {
  formData: BASE_FORM,
  fieldErrors: {},
  fieldRefs: {},
  isSetRateMode: false,
  isReadOnly: false,
  onCountChange: jest.fn(),
  onRateChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("ContainerCountsSection — rendering", () => {
  it("renders 6m, 12m, Abnormal labels", () => {
    render(<ContainerCountsSection {...defaultProps} />);
    expect(screen.getByText("6m")).toBeInTheDocument();
    expect(screen.getByText("12m")).toBeInTheDocument();
    expect(screen.getByText("Abnormal")).toBeInTheDocument();
  });

  it("renders count and rate values from formData", () => {
    render(<ContainerCountsSection {...defaultProps} />);
    // Count inputs
    expect(screen.getByDisplayValue("2")).toBeInTheDocument(); // num_six_meters
    expect(screen.getByDisplayValue("1")).toBeInTheDocument(); // num_twelve_meters
    // Rate inputs
    expect(screen.getByDisplayValue("100")).toBeInTheDocument(); // rateper_6
    expect(screen.getByDisplayValue("200")).toBeInTheDocument(); // rateper_12
    expect(screen.getByDisplayValue("150")).toBeInTheDocument(); // rateper_abnormal
  });

  it("shows containers error message when present", () => {
    render(
      <ContainerCountsSection
        {...defaultProps}
        fieldErrors={{ containers: "At least one container required" }}
      />
    );
    expect(
      screen.getByText("At least one container required")
    ).toBeInTheDocument();
  });
});

describe("ContainerCountsSection — disabled states", () => {
  it("count inputs are enabled when rateWeight=Container, not readOnly, not setRateMode", () => {
    render(<ContainerCountsSection {...defaultProps} />);
    const countInputs = screen.getAllByRole("spinbutton");
    countInputs.forEach((input) => expect(input).not.toBeDisabled());
  });

  it("count inputs are disabled when isSetRateMode=true", () => {
    render(
      <ContainerCountsSection {...defaultProps} isSetRateMode={true} />
    );
    screen.getAllByRole("spinbutton").forEach((input) =>
      expect(input).toBeDisabled()
    );
  });

  it("count inputs are disabled when rateWeight !== Container", () => {
    render(
      <ContainerCountsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, rateWeight: "kg" }}
      />
    );
    screen.getAllByRole("spinbutton").forEach((input) =>
      expect(input).toBeDisabled()
    );
  });

  it("count inputs are disabled when isReadOnly=true", () => {
    render(<ContainerCountsSection {...defaultProps} isReadOnly={true} />);
    screen.getAllByRole("spinbutton").forEach((input) =>
      expect(input).toBeDisabled()
    );
  });

  it("rate inputs are disabled when rateWeight !== Container", () => {
    render(
      <ContainerCountsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, rateWeight: "ton" }}
      />
    );
    // Rate inputs are text type
    const rateInputs = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder === "Rate");
    rateInputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("rate inputs remain enabled (not disabled by isSetRateMode alone)", () => {
    render(
      <ContainerCountsSection {...defaultProps} isSetRateMode={true} />
    );
    const rateInputs = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder === "Rate");
    rateInputs.forEach((input) => expect(input).not.toBeDisabled());
  });
});

describe("ContainerCountsSection — callbacks", () => {
  it("calls onCountChange when a count input changes", () => {
    const onCountChange = jest.fn();
    render(
      <ContainerCountsSection {...defaultProps} onCountChange={onCountChange} />
    );
    const countInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(countInputs[0], { target: { value: "3" } });
    expect(onCountChange).toHaveBeenCalledTimes(1);
  });

  it("calls onRateChange when a rate input changes", () => {
    const onRateChange = jest.fn();
    render(
      <ContainerCountsSection {...defaultProps} onRateChange={onRateChange} />
    );
    const rateInputs = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder === "Rate");
    fireEvent.change(rateInputs[0], { target: { value: "125" } });
    expect(onRateChange).toHaveBeenCalledTimes(1);
  });
});

describe("ContainerCountsSection — error classes", () => {
  it("applies error class to count inputs when containers error exists", () => {
    render(
      <ContainerCountsSection
        {...defaultProps}
        fieldErrors={{ containers: "Required" }}
      />
    );
    screen.getAllByRole("spinbutton").forEach((input) =>
      expect(input).toHaveClass("controller-instructions-error-field")
    );
  });

  it("shows rate field tooltip when rateper_6 error exists", () => {
    render(
      <ContainerCountsSection
        {...defaultProps}
        fieldErrors={{ rateper_6: "Rate required" }}
      />
    );
    expect(screen.getByText("Rate required")).toBeInTheDocument();
  });
});
