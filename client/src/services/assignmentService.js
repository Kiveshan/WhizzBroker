import api from "../api.js";

export async function fetchGroupForAssignment(groupId) {
  const response = await api.get(`/group/${groupId}`);
  return response.data;
}

export async function fetchSubbies() {
  const response = await api.get("/employees/driverssub");
  return response.data;
}

// Creates one assignment: this subcontractor takes these containers off this
// instruction. containerKeys is empty only for break bulk, which has none.
//
// The route is the leg's route, picked from fetchRouteOptions below — not the
// instruction's pickup/dropoff, which never match a m5_driver_rate row.
export async function createAssignment(m1key, { subbieId, containerKeys, startingpoint, destination, legDate }) {
  const response = await api.post(`/instruction/${m1key}/assign`, {
    subbieId,
    containerKeys,
    startingpoint,
    destination,
    legDate,
  });
  return response.data;
}

// What this assignment would pay, without saving it. Never throws for a rate
// that cannot be resolved — that comes back as { success: false, message } so
// the screen can explain it inline while the operator is still choosing.
export async function previewAssignmentRate(m1key, { containerKeys, startingpoint, destination, legDate }) {
  const response = await api.post(`/instruction/${m1key}/rate-preview`, {
    containerKeys,
    startingpoint,
    destination,
    legDate,
  });
  return response.data;
}

// Removing an assignment releases its containers back into the unassigned pool.
export async function deleteAssignment(legkey) {
  const response = await api.delete(`/assignment/${legkey}`);
  return response.data;
}

// Route vocabulary for rating a leg: both lists come from m5_driver_rate, so a
// route picked here always resolves to a rate row.
export async function fetchRouteOptions() {
  const [startingPoints, destinations] = await Promise.all([
    api.get("/starting-points"),
    api.get("/destinations"),
  ]);
  return {
    startingPoints: startingPoints.data || [],
    destinations: destinations.data || [],
  };
}

export async function finaliseGroup(groupId) {
  const response = await api.post(`/group/${groupId}/finalise`);
  return response.data;
}

export async function fetchGroupInvoicePreview(groupId) {
  const response = await api.get(`/api/invoices/group-preview/${groupId}`);
  return response.data;
}

export async function fetchInstructionDocuments(instructionId) {
  const response = await api.get(`/documents/${instructionId}`);
  return response.data;
}

export async function uploadInstructionDocument(instructionId, file, name) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name || file.name);
  formData.append("type", "Instruction Document");
  formData.append("instructionId", instructionId);
  formData.append("legNumber", "1");
  const response = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function deleteInstructionDocument(documentId) {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
}
