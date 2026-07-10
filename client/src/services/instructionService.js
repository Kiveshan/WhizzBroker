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

export async function fetchRates(clientId, start, destination) {
  const response = await api.get(`/api/instructions/client/${clientId}/rates`, {
    params: { start, destination },
  });
  return response.data;
}

export async function fetchSetRate(clientId, pickup, dropoff) {
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
