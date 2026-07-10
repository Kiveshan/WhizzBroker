import { s3, getSignedUrl } from "../../utils/s3-config.js";
import { uploadFileToS3 } from "../../utils/dbUtils.js";
import {
  getDocumentsByInstructionId,
  insertDocument,
  getDocumentsByClientId,
  deleteDocument,
} from "../../models/assignments/documentModel.js";

const getDocumentsByInstructionHandler = async (req, res) => {
  try {
    const { instructionId } = req.params;
    console.log(`Fetching documents for instruction ID: ${instructionId}`);

    const documents = await getDocumentsByInstructionId(instructionId);

    const documentsWithUrls = documents.map((doc) => ({
      id: doc.document_id.toString(),
      name: doc.name,
      type: doc.type,
      legNumber: doc.leg_number,
      date: new Date(doc.upload_date).toLocaleDateString("en-GB"),
      url: getSignedUrl(doc.s3key, 86400),
    }));

    res.status(200).json(documentsWithUrls);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error.message,
    });
  }
};

const uploadDocumentHandler = async (req, res) => {
  console.log("Document upload route accessed");
  console.log("Request body:", req.body);

  try {
    const { name, type, instructionId, legNumber } = req.body;
    const uploadDate = new Date();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const s3Key = await uploadFileToS3(s3, req.file, instructionId);
    console.log(`File uploaded to S3 with key: ${s3Key}`);

    const documentName = name || req.file.originalname;
    const fileUrl = getSignedUrl(s3Key, 604800);

    console.log("S3 Upload successful:", { documentName, s3Key, fileUrl });

    const documentId = await insertDocument({
      name: documentName,
      type: type || "Instruction Document",
      legNumber: legNumber || null,
      s3Key,
      uploadDate,
      instructionId,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      id: documentId.toString(),
      name: documentName,
      type: type || "Instruction Document",
      legNumber: legNumber || null,
      url: fileUrl,
      date: uploadDate.toLocaleDateString("en-GB"),
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
};

const getDocumentsByClientHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`Fetching documents for client ID: ${clientId}`);

    const documents = await getDocumentsByClientId(clientId);

    const documentsWithUrls = documents.map((doc) => ({
      id: doc.document_id.toString(),
      name: doc.name,
      type: doc.type,
      legNumber: doc.leg_number,
      date: new Date(doc.upload_date).toLocaleDateString("en-GB"),
      url: getSignedUrl(doc.s3key, 86400),
      instructionId: doc.m1key,
      instructionReference: doc.instruction_reference,
    }));

    res.status(200).json(documentsWithUrls);
  } catch (error) {
    console.error("Error fetching documents for client:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client documents",
      error: error.message,
    });
  }
};

const deleteDocumentHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`Deleting document with ID: ${documentId}`);

    const result = await deleteDocument(documentId, s3);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    });
  }
};

export {
  getDocumentsByInstructionHandler,
  uploadDocumentHandler,
  getDocumentsByClientHandler,
  deleteDocumentHandler,
};
