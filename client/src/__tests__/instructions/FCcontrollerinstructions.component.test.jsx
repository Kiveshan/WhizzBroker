/**
 * Characterization component tests for FCcontrollerinstructions.jsx (update form).
 *
 * These tests document CURRENT UI behaviour. They are NOT tests of desired
 * behaviour — they capture what the code actually does right now.
 *
 * All external API calls are mocked. No production code is changed.
 *
 * Loading chain (MIRRORS: FCcontrollerinstructions.jsx):
 *   isLoadingComplete = !clients && !shipmentTypes && !startingPoints
 *                     && !destinations && !instruction && formData is populated
 *
 *   For isLoadingComplete to become true in a test, we need:
 *     1. fetchClients() to resolve          → clears isLoading.clients
 *     2. fetchShipmentTypes() to resolve    → clears isLoading.shipmentTypes
 *     3. fetchStartingPoints() to resolve   → clears isLoading.startingPoints
 *        (only called when formData.clientId is truthy — line 2616)
 *     4. fetchDestinations() to resolve     → clears isLoading.destinations
 *        (only called when formData.clientId AND formData.pickup are truthy — line 2623)
 *     5. isLoading.instruction cleared in finally of fetchInitialData — line 2088
 *
 *   Strategy: supply preservedFormData with clientId + pickup + dropoff in
 *   location.state. After fetchClients/fetchShipmentTypes resolve, the
 *   fetchInitialData effect applies preservedFormData to formData, which
 *   triggers the formData.clientId/pickup watcher and fires fetchStartingPoints
 *   and fetchDestinations.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FCcontrollerinstructions from "../../pages/instructions/updateInstruction/views/FCcontrollerinstructions";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock("../../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import api from "../../api";

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------
const STUB_CLIENTS = [
  { m5clientkey: 1, companyname: "FC Test Client" },
];

const STUB_SHIPMENT_TYPES = [
  { shipkey: 1, shipmenttype: "Import" },
  { shipkey: 2, shipmenttype: "Export" },
  { shipkey: 3, shipmenttype: "Cross-Haul" },
  { shipkey: 4, shipmenttype: "Cross-Haul Weight" },
  { shipkey: 5, shipmenttype: "Add-On" },
];

const STUB_STARTING_POINTS = [{ start: "Cape Town" }];
const STUB_DESTINATIONS    = [{ destination: "Durban" }];

/**
 * Minimal preservedFormData that satisfies the loading chain:
 * - clientId triggers fetchStartingPoints
 * - pickup triggers fetchDestinations
 */
const BASE_PRESERVED = {
  clientId: "1",
  pickup: "Cape Town",
  dropoff: "Durban",
  shipmentTypeName: "Import",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderComponent(locationState = {}) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/FCcontrollerinstructions", state: locationState }]}
    >
      <FCcontrollerinstructions />
    </MemoryRouter>
  );
}

/** Mock that resolves all endpoints needed for a full successful load. */
function mockAllSuccessful() {
  api.get.mockImplementation((url) => {
    if (url === "/api/instructions/active-clients")
      return Promise.resolve({ data: STUB_CLIENTS });
    if (url === "/api/instructions/shipment-types")
      return Promise.resolve({ data: STUB_SHIPMENT_TYPES });
    if (url.includes("/starting-points"))
      return Promise.resolve({ data: STUB_STARTING_POINTS });
    if (url.includes("/destinations/"))
      return Promise.resolve({ data: STUB_DESTINATIONS });
    // catch-all for set-rate, surcharge lookups, etc.
    return Promise.resolve({ data: [] });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// Loading state
// ===========================================================================
describe("FCcontrollerinstructions component — loading state", () => {
  test("shows 'Loading data...' on initial render before API calls resolve", () => {
    // Never resolve so the component stays in loading state.
    api.get.mockReturnValue(new Promise(() => {}));

    renderComponent();

    // MIRRORS: FCcontrollerinstructions.jsx:4291
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  test("shows 'Loading data...' while clients are still pending even if other data loads", async () => {
    // clients never resolves; others do
    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/active-clients") return new Promise(() => {});
      if (url === "/api/instructions/shipment-types")
        return Promise.resolve({ data: STUB_SHIPMENT_TYPES });
      if (url.includes("/starting-points"))
        return Promise.resolve({ data: STUB_STARTING_POINTS });
      if (url.includes("/destinations/"))
        return Promise.resolve({ data: STUB_DESTINATIONS });
      return Promise.resolve({ data: [] });
    });

    renderComponent({ preservedFormData: BASE_PRESERVED });

    // Allow other effects to settle; loading should still show
    await waitFor(() => {
      expect(screen.getByText("Loading data...")).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Data load failure
// MIRRORS: FCcontrollerinstructions.jsx:4304–4328
// Condition: clients.length === 0 || shipmentTypes.length === 0 || startingPoints.length === 0
// ===========================================================================
describe("FCcontrollerinstructions component — data load failure", () => {
  test("shows failure message and Retry button when clients array is empty", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/active-clients")
        return Promise.resolve({ data: [] }); // empty — triggers failure
      if (url === "/api/instructions/shipment-types")
        return Promise.resolve({ data: STUB_SHIPMENT_TYPES });
      if (url.includes("/starting-points"))
        return Promise.resolve({ data: STUB_STARTING_POINTS });
      if (url.includes("/destinations/"))
        return Promise.resolve({ data: STUB_DESTINATIONS });
      return Promise.resolve({ data: [] });
    });

    renderComponent({ preservedFormData: BASE_PRESERVED });

    // MIRRORS: FCcontrollerinstructions.jsx:4311
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load required data. Please try again.")
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  test("shows failure message when shipment types array is empty", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/active-clients")
        return Promise.resolve({ data: STUB_CLIENTS });
      if (url === "/api/instructions/shipment-types")
        return Promise.resolve({ data: [] }); // empty — triggers failure
      if (url.includes("/starting-points"))
        return Promise.resolve({ data: STUB_STARTING_POINTS });
      if (url.includes("/destinations/"))
        return Promise.resolve({ data: STUB_DESTINATIONS });
      return Promise.resolve({ data: [] });
    });

    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load required data. Please try again.")
      ).toBeInTheDocument();
    });
  });

  test("shows failure message when starting points array is empty", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/active-clients")
        return Promise.resolve({ data: STUB_CLIENTS });
      if (url === "/api/instructions/shipment-types")
        return Promise.resolve({ data: STUB_SHIPMENT_TYPES });
      if (url.includes("/starting-points"))
        return Promise.resolve({ data: [] }); // empty — triggers failure
      if (url.includes("/destinations/"))
        return Promise.resolve({ data: STUB_DESTINATIONS });
      return Promise.resolve({ data: [] });
    });

    renderComponent({ preservedFormData: BASE_PRESERVED });

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
describe("FCcontrollerinstructions component — successful load", () => {
  beforeEach(() => {
    mockAllSuccessful();
  });

  test("renders 'Back' button after all data loads", async () => {
    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });
  });

  test("renders 'Client' label in the form", async () => {
    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(screen.getByText("Client")).toBeInTheDocument();
    });
  });

  test("renders 'Select Client' placeholder option in the client dropdown", async () => {
    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(screen.getByText("Select Client")).toBeInTheDocument();
    });
  });

  test("renders stub client name as a dropdown option", async () => {
    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(screen.getByText("FC Test Client")).toBeInTheDocument();
    });
  });

  test("'Loading data...' is gone once form is rendered", async () => {
    renderComponent({ preservedFormData: BASE_PRESERVED });

    await waitFor(() => {
      expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
    });
  });
});
