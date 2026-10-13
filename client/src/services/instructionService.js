import api from "../api.js";

export async function fetchClients() {
  const response = await api.get("/api/instructions/active-clients");
  return response.data;
}

export async function fetchShipmentTypes() {
  const response = await api.get("/api/instructions/shipment-types");
  return response.data;
}

export async function fetchStartingPoints(clientId) {
  const response = await api.get(`/api/instructions/client/${clientId}/starting-points`);
  return response.data;
}

export async function fetchDestinations(clientId, pickup) {
  const encodedPickup = encodeURIComponent(pickup);
  const response = await api.get(`/api/instructions/client/${clientId}/destinations/${encodedPickup}`);
  return response.data;
}

// The client's rates for the instruction Rate dropdown, one per title:
// [{ title, starting_point, destination, rate_source, rate_card_name }]
export async function fetchRateTitles(clientId) {
  const response = await api.get(`/api/instructions/client/${clientId}/rate-titles`);
  return response.data;
}

// Rates are looked up by title; instructions captured before rate titles
// existed have none and fall back to their route.
export async function fetchRates(clientId, start, destination, title = null) {
  const params = title ? { title } : { start, destination };
  const response = await api.get(`/api/instructions/client/${clientId}/rates`, { params });
  return response.data;
}

export async function fetchSetRate(clientId, pickup, dropoff, title = null) {
  if (title) {
    const response = await api.get(`/api/instructions/client/${clientId}/set-rate`, { params: { title } });
    return response.data;
  }
  const encodedPickup = encodeURIComponent(pickup);
  const encodedDropoff = encodeURIComponent(dropoff);
  const response = await api.get(
    `/api/instructions/client/${clientId}/set-rate/${encodedPickup}/${encodedDropoff}`
  );
  return response.data;
}

export async function fetchInstruction(instructionId) {
  const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`);
  return response.data;
}

export async function updateInstruction(instructionId, instructionData, containers, weightData) {
  const response = await api.put(`/api/instructions/fc/update/${instructionId}`, {
    instructionData,
    containers,
    weightData,
  });
  return response.data;
}

export async function deleteInstruction(instructionId) {
  const response = await api.delete(`/api/instructions/fc/instruction/${instructionId}`);
  return response.data;
}

export async function generateInvoice(m1key) {
  const response = await api.post(`/generate-invoice/${m1key}`);
  return response.data;
}

export async function checkInvoiceStatus(m1key) {
  const response = await api.get(`/api/invoice/check/${m1key}`);
  return response.data;
}

export async function checkContainerLegsExist(instructionId, containerNum) {
  const response = await api.get(
    `/api/instructions/fc/container/${instructionId}/${encodeURIComponent(containerNum)}/legs-exists`
  );
  return response.data;
}

export async function saveInstruction(controllerData, containerData, weightData) {
  const response = await api.post("/api/instructions/save-instruction", {
    controllerData,
    containerData,
    weightData,
  });
  return response.data;
}

export async function saveInstructionGroup(clientId, instructions, groupRef = null) {
  const response = await api.post("/api/instructions/group", {
    clientId,
    groupRef,
    instructions,
  });
  return response.data;
}

export async function fetchInstructionGroup(groupKey) {
  const response = await api.get(`/api/instructions/group/${groupKey}`);
  return response.data;
}

export async function addInstructionToGroup(groupKey, controllerData, containerData, weightData) {
  const response = await api.post(`/api/instructions/group/${groupKey}/instructions`, {
    controllerData,
    containerData,
    weightData,
  });
  return response.data;
}
