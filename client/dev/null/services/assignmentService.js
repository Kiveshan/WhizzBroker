import api from "../api.js";
export async function fetchGroupForAssignment(groupId) {
  const response = await api.get(`/group/${groupId}`);
  return response.data;
}
export async function fetchSubbies() {
  const response = await api.get("/employees/driverssub");
  return response.data;
}
export async function fetchTruckRegNums() {
  const response = await api.get("/trucks/regnums");
  return response.data;
}
export async function assignSubbie(m1key, { subbieId, truck, startingpoint, destination, legDate }) {
  const response = await api.post(`/instruction/${m1key}/assign`, {
    subbieId,
    truck,
    startingpoint,
    destination,
    legDate
  });
  return response.data;
}
export async function fetchRouteOptions() {
  const [startingPoints, destinations] = await Promise.all([
    api.get("/starting-points"),
    api.get("/destinations")
  ]);
  return {
    startingPoints: startingPoints.data || [],
    destinations: destinations.data || []
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
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
}
export async function deleteInstructionDocument(documentId) {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
}
