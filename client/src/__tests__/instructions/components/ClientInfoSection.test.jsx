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

  it("renders creation date when showCreationDate=true (default)", () => {
    render(<ClientInfoSection {...defaultProps} />);
    expect(screen.getByDisplayValue("2024-01-15")).toBeInTheDocument();
  });

  it("hides creation date when showCreationDate=false", () => {
    render(<ClientInfoSection {...defaultProps} showCreationDate={false} />);
    expect(screen.queryByDisplayValue("2024-01-15")).not.toBeInTheDocument();
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

  it("creation date input is disabled when isReadOnly", () => {
    render(<ClientInfoSection {...defaultProps} isReadOnly={true} />);
    const dateInput = screen.getByDisplayValue("2024-01-15");
    expect(dateInput).toBeDisabled();
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

  it("calls onChange when creation date changes", () => {
    const onChange = jest.fn();
    render(<ClientInfoSection {...defaultProps} onChange={onChange} />);
    const dateInput = screen.getByDisplayValue("2024-01-15");
    fireEvent.change(dateInput, { target: { value: "2024-02-01" } });
    expect(onChange).toHaveBeenCalledTimes(1);
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
