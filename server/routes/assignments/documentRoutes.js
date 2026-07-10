import express from "express";
import {
  getDocumentsByInstructionHandler,
  uploadDocumentHandler,
  getDocumentsByClientHandler,
  deleteDocumentHandler,
} from "../../controllers/assignments/documentController.js";
import { uploadInstruction } from "../../utils/s3-config.js";

const router = express.Router();

router.get("/:instructionId", getDocumentsByInstructionHandler);
router.post("/upload", uploadInstruction.single("file"), uploadDocumentHandler);
router.get("/client/:clientId", getDocumentsByClientHandler);
router.delete("/:documentId", deleteDocumentHandler);

console.log("Document routes loaded successfully");

export default router;
