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

  it("hides Pick-Up / Drop-Off when showLocations is not set", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.queryByText("Pick-Up Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Drop-Off Location")).not.toBeInTheDocument();
  });

  it("renders Pick-Up / Drop-Off when showLocations=true", () => {
    render(
      <ClientInfoSection
        {...defaultProps}
        showLocations={true}
        startingPoints={[{ id: 1, startingpoint: "Cape Town" }]}
        destinations={[{ id: 1, destination: "Durban" }]}
      />
    );
    expect(screen.getByText("Pick-Up Location")).toBeInTheDocument();
    expect(screen.getByText("Drop-Off Location")).toBeInTheDocument();
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

  it("calls onPickupChange when pickup select changes", () => {
    const onPickupChange = jest.fn();
    render(
      <ClientInfoSection
        {...defaultProps}
        showLocations={true}
        startingPoints={[{ id: 1, startingpoint: "Cape Town" }]}
        destinations={[{ id: 1, destination: "Durban" }]}
        onPickupChange={onPickupChange}
      />
    );
    const pickup = screen.getByDisplayValue("Select Pick-Up Location");
    fireEvent.change(pickup, { target: { value: "Cape Town" } });
    expect(onPickupChange).toHaveBeenCalledTimes(1);
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
