/**
 * Characterization component tests for ControllerInstructions.jsx (create form).
 *
 * These tests document CURRENT UI behaviour. They use RTL to render the
 * component and assert on what the user would see.
 *
 * All external API calls are mocked. No production code is changed.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ControllerInstructions from "../../pages/instructions/createInstruction/views/ControllerInstructions";

// ---------------------------------------------------------------------------
// Mock the api module. Path is relative to this test file (src/__tests__/instructions/).
// ---------------------------------------------------------------------------
jest.mock("../../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import the mocked api so we can configure it per test.
// ---------------------------------------------------------------------------
import api from "../../api";

// ---------------------------------------------------------------------------
// Minimal stub data that satisfies the component's initial fetch calls.
// MIRRORS: ControllerInstructions.jsx:727–734 — loadInitialData
// ---------------------------------------------------------------------------
const STUB_CLIENTS = [
  { m5clientkey: 1, companyname: "Test Logistics Ltd" },
];

const STUB_SHIPMENT_TYPES = [
  { shipkey: 1, shipmenttype: "Import" },
  { shipkey: 2, shipmenttype: "Export" },
  { shipkey: 3, shipmenttype: "Cross-Haul" },
  { shipkey: 4, shipmenttype: "Cross-Haul Weight" },
  { shipkey: 5, shipmenttype: "Add-On" },
];

// ---------------------------------------------------------------------------
// Helper: render the component inside MemoryRouter at a known path.
// ---------------------------------------------------------------------------
function renderComponent(locationState = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/CreateInstruction", state: locationState }]}>
      <ControllerInstructions />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// Loading state
// ===========================================================================
describe("ControllerInstructions component — loading state", () => {
  test("shows 'Loading data...' while initial API calls are in flight", () => {
    // Never resolve so the component stays in loading state
    api.get.mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });
});

// ===========================================================================
// Error / empty-data state
// ===========================================================================
describe("ControllerInstructions component — data load failure", () => {
  test("shows failure message and Retry button when API returns empty arrays", async () => {
    // Both calls succeed but return empty arrays
    api.get.mockResolvedValue({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load required data. Please try again.")
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  test("shows failure message when API call rejects", async () => {
    api.get.mockRejectedValue(new Error("Network error"));

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load required data. Please try again.")
      ).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Successful load
// ===========================================================================
describe("ControllerInstructions component — successful load", () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/active-clients") {
        return Promise.resolve({ data: STUB_CLIENTS });
      }
      if (url === "/api/instructions/shipment-types") {
        return Promise.resolve({ data: STUB_SHIPMENT_TYPES });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test("renders 'Back' button after data loads", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });
  });

  test("renders 'Client' label in the form", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Client")).toBeInTheDocument();
    });
  });

  test("renders 'Select Client' placeholder option", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Select Client")).toBeInTheDocument();
    });
  });

  test("renders stub client name as a dropdown option", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Test Logistics Ltd")).toBeInTheDocument();
    });
  });
});
