/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientInfoSection } from "../../../components/instructions/ClientInfoSection";

const CLIENTS = [
  { m5clientkey: "1", companyname: "Acme Corp" },
  { m5clientkey: "2", companyname: "Beta Ltd" },
];

const BASE_FORM = {
  clientId: "1",
  representative: "Jane Doe",
  contactDetails: "0821234567",
  email: "jane@acme.com",
  createdAt: "2024-01-15",
};

const RATE_OPTIONS = [
  { title: "DBN-JHB Express", starting_point: "Durban", destination: "Johannesburg" },
  { title: "Local delivery", starting_point: null, destination: null },
];

const defaultProps = {
  formData: BASE_FORM,
  clients: CLIENTS,
  fieldErrors: {},
  fieldRefs: {},
  isReadOnly: false,
  onClientChange: jest.fn(),
  onChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("ClientInfoSection — rendering", () => {
  it("renders client dropdown with all options", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta Ltd")).toBeInTheDocument();
  });

  it("renders representative, contact, and email fields", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0821234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@acme.com")).toBeInTheDocument();
  });

  it("hides the Rate row when showLocations is not set", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.queryByText("Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Route")).not.toBeInTheDocument();
  });

  it("renders the Rate dropdown with titles and routes when showLocations=true", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        showLocations={true}
        rateOptions={RATE_OPTIONS}
      />
    );
    expect(screen.getByText("Rate")).toBeInTheDocument();
    expect(screen.getByText("Route")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /DBN-JHB Express\s+—\s+Durban → Johannesburg/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Local delivery" })).toBeInTheDocument();
  });

  it("shows the chosen rate's route read-only", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        formData={{ ...BASE_FORM, rate_title: "DBN-JHB Express", pickup: "Durban", dropoff: "Johannesburg" }}
        showLocations={true}
        rateOptions={RATE_OPTIONS}
      />
    );
    expect(screen.getByDisplayValue("Durban → Johannesburg")).toBeInTheDocument();
  });

  it("keeps a saved title that is no longer on the client's rates selectable", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        formData={{ ...BASE_FORM, rate_title: "Old rate" }}
        showLocations={true}
        rateOptions={RATE_OPTIONS}
      />
    );
    expect(screen.getByRole("option", { name: /Old rate \(no longer on this client's rates\)/ })).toBeInTheDocument();
  });

  it("shows an older instruction's route in the locked rate field", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        formData={{ ...BASE_FORM, pickup: "Cape Town", dropoff: "Durban" }}
        showLocations={true}
        rateOptions={RATE_OPTIONS}
        pickupLocked={true}
      />
    );
    expect(screen.getAllByDisplayValue("Cape Town → Durban").length).toBeGreaterThan(0);
  });
});

describe("ClientInfoSection — disabled state", () => {
  it("client dropdown is disabled when clientLocked=true (default)", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("client dropdown is enabled when clientLocked=false and not readOnly", () => {
    render(<ClientInfoSection {...defaultProps} clientLocked={false} />);
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });
});

describe("ClientInfoSection — callbacks", () => {
  it("calls onClientChange when dropdown value changes", () => {
    const onClientChange = jest.fn();
    render(
      <ClientInfoSection
        {...defaultProps}
        clientLocked={false}
        onClientChange={onClientChange}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    expect(onClientChange).toHaveBeenCalledTimes(1);
  });

  it("calls onRateChange when a rate is chosen", () => {
    const onRateChange = jest.fn();
    render(
      <ClientInfoSection
        {...defaultProps}
        showLocations={true}
        rateOptions={RATE_OPTIONS}
        onRateChange={onRateChange}
      />
    );
    const rate = screen.getByDisplayValue("Select Rate");
    fireEvent.change(rate, { target: { value: "Local delivery" } });
    expect(onRateChange).toHaveBeenCalledTimes(1);
  });
});

describe("ClientInfoSection — error display", () => {
  it("applies error class to client dropdown when clientId error exists", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        fieldErrors={{ clientId: "Client is required" }}
      />
    );
    expect(screen.getByRole("combobox")).toHaveClass(
      "controller-instructions-error-field"
    );
  });

  it("shows clientId error tooltip", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        fieldErrors={{ clientId: "Client is required" }}
      />
    );
    expect(screen.getByText("Client is required")).toBeInTheDocument();
  });
});
