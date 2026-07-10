/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookingDetailsSection } from "../../../components/instructions/BookingDetailsSection";

const BASE_FORM = {
  bookingRef: "BK001",
  clientFileRef: "CF001",
  ksmFileRef: "KSM001",
  lastFreeDate: "2024-03-15",
  vat: 15,
  stackDate: "2024-02-20",
  vesselName: "MV Test",
  description: "Test shipment",
  shipmentTypeId: "1",
};

const defaultProps = {
  formData: BASE_FORM,
  fieldErrors: {},
  fieldRefs: {},
  isReadOnly: false,
  isAddOn: false,
  today: "2024-01-01",
  lastFreeDateRef: { current: null },
  etaDateRef: { current: null },
  onInputChange: jest.fn(),
  onVatChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("BookingDetailsSection — rendering", () => {
  it("renders Booking Reference, Client File Ref, KSM File Ref", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByText("Booking Reference")).toBeInTheDocument();
    expect(screen.getByText("Client File Ref")).toBeInTheDocument();
    expect(screen.getByText("Ksm File Reference")).toBeInTheDocument();
  });

  it("renders form values from formData", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByDisplayValue("BK001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CF001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("KSM001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test shipment")).toBeInTheDocument();
  });

  it("renders Last Free Date value", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByDisplayValue("2024-03-15")).toBeInTheDocument();
  });

  it("renders Description", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByText("Description")).toBeInTheDocument();
  });
});

describe("BookingDetailsSection — VAT toggle", () => {
  it("renders 0% and 15% labels", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("renders VAT checkbox checked when vat=15", () => {
    const { container } = render(<BookingDetailsSection {...defaultProps} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeChecked();
  });

  it("renders VAT checkbox unchecked when vat=0", () => {
    const { container } = render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, vat: 0 }}
      />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeChecked();
  });

  it("calls onVatChange(0) when toggled off", () => {
    const onVatChange = jest.fn();
    const { container } = render(
      <BookingDetailsSection {...defaultProps} onVatChange={onVatChange} />
    );
    // vat=15 → checkbox checked=true; click toggles it off → onVatChange(0)
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(onVatChange).toHaveBeenCalledWith(0);
  });

  it("calls onVatChange(15) when toggled on", () => {
    const onVatChange = jest.fn();
    const { container } = render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, vat: 0 }}
        onVatChange={onVatChange}
      />
    );
    // vat=0 → checkbox checked=false; click toggles it on → onVatChange(15)
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(onVatChange).toHaveBeenCalledWith(15);
  });
});

describe("BookingDetailsSection — Stack/ETA Date conditional rendering", () => {
  it("shows ETA Date label for shipmentTypeId=1 (Import)", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByText(/ETA Date/)).toBeInTheDocument();
  });

  it("shows Stack Date label for shipmentTypeId=2 (Export)", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "2" }}
      />
    );
    expect(screen.getByText(/Stack Date/)).toBeInTheDocument();
  });

  it("does not show stack/ETA date for shipmentTypeId=3 (Cross-haul regular)", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "3" }}
        isAddOn={false}
      />
    );
    expect(screen.queryByText(/ETA Date/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stack Date/)).not.toBeInTheDocument();
  });

  it("shows stack date for isAddOn=true", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "5" }}
        isAddOn={true}
      />
    );
    // Should show stack/eta date for add-on
    expect(
      screen.queryByText(/ETA Date/) || screen.queryByText(/Stack Date/)
    ).not.toBeNull();
  });
});

describe("BookingDetailsSection — Vessel Name conditional rendering", () => {
  it("shows Vessel Name for shipmentTypeId=1", () => {
    render(<BookingDetailsSection {...defaultProps} />);
    expect(screen.getByText(/Vessel Name/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("MV Test")).toBeInTheDocument();
  });

  it("shows Vessel Name for shipmentTypeId=2", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "2" }}
      />
    );
    expect(screen.getByText(/Vessel Name/)).toBeInTheDocument();
  });

  it("hides Vessel Name for shipmentTypeId=4 (Break bulk)", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "4" }}
      />
    );
    expect(screen.queryByText(/Vessel Name/)).not.toBeInTheDocument();
  });

  it("shows Vessel Name for shipmentTypeId=3", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        formData={{ ...BASE_FORM, shipmentTypeId: "3" }}
      />
    );
    expect(screen.getByText(/Vessel Name/)).toBeInTheDocument();
  });
});

describe("BookingDetailsSection — disabled states", () => {
  it("all text inputs are disabled when isReadOnly=true", () => {
    render(<BookingDetailsSection {...defaultProps} isReadOnly={true} />);
    const textInputs = screen
      .getAllByRole("textbox")
      .filter((i) => !i.readOnly);
    textInputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("VAT checkbox is disabled when isReadOnly=true", () => {
    const { container } = render(
      <BookingDetailsSection {...defaultProps} isReadOnly={true} />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeDisabled();
  });
});

describe("BookingDetailsSection — callbacks", () => {
  it("calls onInputChange when bookingRef changes", () => {
    const onInputChange = jest.fn();
    render(
      <BookingDetailsSection {...defaultProps} onInputChange={onInputChange} />
    );
    fireEvent.change(screen.getByDisplayValue("BK001"), {
      target: { value: "BK002" },
    });
    expect(onInputChange).toHaveBeenCalledTimes(1);
  });

  it("calls onInputChange when description changes", () => {
    const onInputChange = jest.fn();
    render(
      <BookingDetailsSection {...defaultProps} onInputChange={onInputChange} />
    );
    fireEvent.change(screen.getByDisplayValue("Test shipment"), {
      target: { value: "Updated" },
    });
    expect(onInputChange).toHaveBeenCalledTimes(1);
  });
});

describe("BookingDetailsSection — error display", () => {
  it("applies error class to bookingRef when error exists", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        fieldErrors={{ bookingRef: "Required" }}
      />
    );
    expect(screen.getByDisplayValue("BK001")).toHaveClass(
      "controller-instructions-error-field"
    );
  });

  it("shows vesselName error tooltip", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        fieldErrors={{ vesselName: "Vessel required" }}
      />
    );
    expect(screen.getByText("Vessel required")).toBeInTheDocument();
  });

  it("shows stackDate error tooltip", () => {
    render(
      <BookingDetailsSection
        {...defaultProps}
        fieldErrors={{ stackDate: "Date required" }}
      />
    );
    expect(screen.getByText("Date required")).toBeInTheDocument();
  });
});
