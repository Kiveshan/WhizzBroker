import { getClientCreditNotes, getInstructions, getContainers,getCompanyDetails,getClientDetails,getLatestDocumentNumber,getInstructionDetails,createCreditNote,getCreditNoteById } from "../../models/creditNote/creditNoteModel.js";
import { auditFromReq } from "../../utils/auditLogger.js";

const getClientCreditNotesHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(`Fetching credit notes for client ${clientId} with query:`, req.query);

    const result = await getClientCreditNotes(clientId, { year, month });
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching credit notes for client ${req.params.clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getInstructionsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(`Fetching instructions for client ${clientId} with query:`, req.query);

    const result = await getInstructions(clientId, { year, month });
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching instructions for client ${req.params.clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getContainersHandler = async (req, res) => {
  try {
    const { m1key } = req.params;
    console.log(`Fetching containers for m1key ${m1key}`);

    const result = await getContainers(m1key);
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching containers for m1key ${req.params.m1key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};
const getCompanyDetailsHandler = async (req, res) => {
  try {
    console.log(`Fetching company details for KSM Carriers`);

    const result = await getCompanyDetails();
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching company details:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};
const getClientDetailsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await getClientDetails(clientId);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching client details for ${req.params.clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};
const getLatestDocumentNumberHandler = async (req, res) => {
  try {
    console.log(`Fetching latest document number`);

    const result = await getLatestDocumentNumber();
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching latest document number:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getInstructionDetailsHandler = async (req, res) => {
  try {
    const { m1key } = req.params;
    console.log(`Fetching instruction details for m1key ${m1key}`);

    const result = await getInstructionDetails(m1key);
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching instruction details for m1key ${req.params.m1key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const createCreditNoteHandler = async (req, res) => {
  try {
    const creditNoteData = req.body;
    console.log(`Creating credit note for client ${creditNoteData.client_id}`);

    const result = await createCreditNote(creditNoteData);

    auditFromReq(req, {
      actionType: "CREDIT_NOTE_CREATED",
      entityType: "credit_note",
      targetId: result.data?.credit_note_id ?? result.data?.id,
      targetName: creditNoteData.document_number || `client ${creditNoteData.client_id}`,
      details: `Credit note created for client ${creditNoteData.client_id} (total: ${creditNoteData.total ?? "n/a"})`,
    });

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error creating credit note:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getCreditNoteByIdHandler = async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    console.log(`Fetching credit note by ID: ${creditNoteId}`);

    const result = await getCreditNoteById(creditNoteId);
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching credit note by ID:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  getClientCreditNotesHandler,
  getInstructionsHandler,
  getContainersHandler,
  getCompanyDetailsHandler,
  getClientDetailsHandler,
  getLatestDocumentNumberHandler,
  getInstructionDetailsHandler,
  createCreditNoteHandler,
  getCreditNoteByIdHandler
};