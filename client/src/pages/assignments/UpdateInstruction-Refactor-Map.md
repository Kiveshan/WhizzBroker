# UpdateInstruction Refactor Map

This document summarizes what each extracted file/module does for the `UpdateInstuction.jsx` refactor.

## Main view

- **`views/UpdateInstuction.jsx`**
  - Main React screen for updating an instruction.
  - Owns React state/refs/effects and wires UI + modals together.

## Shared constants/utilities

- **`views/UpdateInstruction/constants.js`**
  - `API_BASE_URL` and shared `modalAnimation` CSS string.

- **`views/UpdateInstruction/utils.js`**
  - Pure helpers used across the view/services (string normalization, driver de-duplication, driver debug logging, leg driver-rate calculation).

## UI components (presentational)

- **`views/UpdateInstruction/components/Plus.jsx`**
  - Circular “+” button component used for adding legs.

- **`views/UpdateInstruction/components/LegTabsBar.jsx`**
  - Renders leg tabs + action buttons (Preview/Upload/Finalise/Documents) and triggers callbacks.

- **`views/UpdateInstruction/components/RouteHeader.jsx`**
  - Renders starting point/destination dropdowns and the Add Driver / Save controls.

- **`views/UpdateInstruction/components/DriversSection.jsx`**
  - Renders driver entry forms and driver-related controls for the currently selected leg.

- **`views/UpdateInstruction/components/SummaryModal.jsx`**
  - Renders the instruction summary modal UI.

## Modals

- **`views/UpdateInstruction/modals/ValidationModals.jsx`**
  - Validation/feedback modals (missing fields, no drivers, unsaved changes, container warning/mismatch, etc.).

- **`views/UpdateInstruction/modals/ConfirmModals.jsx`**
  - Confirmation modals (back confirm, remove driver, remove leg, duplicate driver).

## Data fetch helpers (low-level I/O)

- **`views/UpdateInstruction/data/resources.js`**
  - Fetches drivers and truck registration options.

- **`views/UpdateInstruction/data/locations.js`**
  - Fetches starting points and destinations for the instruction.

- **`views/UpdateInstruction/data/containers.js`**
  - Fetches containers list and instruction-specific containers.

- **`views/UpdateInstruction/data/instruction.js`**
  - Fetches instruction details for weight-based detection and shipment type.

## Services (larger workflows extracted from the view)

- **`views/UpdateInstruction/services/ratesService.js`**
  - Fetches route rates and applies rate side-effects to form/legs/drivers while respecting leg-switch concurrency tokens.

- **`views/UpdateInstruction/services/legsService.js`**
  - `refreshLegData`: refreshes legs from server and merges preserved unsaved legs.
  - `fetchLegsForInstruction`: initial load of legs + container details mapping and normalization.

- **`views/UpdateInstruction/handlers/legsHandlers.js`**
  - `handleAddLeg`: adds a new temporary leg while preserving unsaved-change rules.
  - `handleSelectLeg`: switches active leg and triggers rate fetch/driver normalization.

- **`views/UpdateInstruction/services/saveService.js`**
  - `handleSave`: persists a leg (new or existing), updates instruction status, validates, dedupes drivers, refreshes legs, and updates saved state.

- **`views/UpdateInstruction/services/validationService.js`**
  - Container/weight dropoff checks and unsaved-change detection helpers.

- **`views/UpdateInstruction/services/finaliseService.js`**
  - Finalise/Documents navigation flow:
    - Validates drivers + unsaved changes
    - Validates container/weight reaches dropoff
    - Validates last-leg destination matches dropoff
    - Navigates to Upload/Documents screen with clean state
