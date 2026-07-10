import { pool } from "../../config/database.js";

const getDocumentsByInstructionId = async (instructionId) => {
  const queryText = `
    SELECT document_id, name, type, leg_number, s3key, upload_date 
    FROM documents 
    WHERE m1key = $1
  `;
  const result = await pool.query(queryText, [instructionId]);
  return result.rows;
};

const insertDocument = async ({
  name,
  type,
  legNumber,
  s3Key,
  uploadDate,
  instructionId,
}) => {
  const instructionResult = await pool.query(
    "SELECT client FROM m1_controller WHERE m1key = $1",
    [instructionId]
  );
  const clientId =
    instructionResult.rows.length > 0 ? instructionResult.rows[0].client : 0;

  const query = `
    INSERT INTO documents (name, type, leg_number, s3key, upload_date, m1key, client) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING document_id
  `;
  const values = [
    name,
    type,
    legNumber,
    s3Key,
    uploadDate,
    instructionId,
    clientId,
  ];
  const result = await pool.query(query, values);
  return result.rows[0].document_id;
};

const getDocumentsByClientId = async (clientId) => {
  const queryText = `
    SELECT d.document_id, d.name, d.type, d.leg_number, d.s3key, d.upload_date, d.m1key, 
           m.fileref as instruction_reference
    FROM documents d
    JOIN m1_controller m ON d.m1key = m.m1key
    WHERE d.client = $1
    ORDER BY d.upload_date DESC
  `;
  const result = await pool.query(queryText, [clientId]);
  return result.rows;
};

const deleteDocument = async (documentId, s3) => {
  const keyResult = await pool.query(
    "SELECT s3key FROM documents WHERE document_id = $1",
    [documentId]
  );
  if (keyResult.rows.length === 0) {
    return { success: false, message: "Document not found" };
  }

  const s3Key = keyResult.rows[0].s3key;
  await s3
    .deleteObject({
      Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
      Key: s3Key,
    })
    .promise();

  console.log(`Deleted file from S3: ${s3Key}`);

  await pool.query("DELETE FROM documents WHERE document_id = $1", [
    documentId,
  ]);
  return { success: true };
};

export {
  getDocumentsByInstructionId,
  insertDocument,
  getDocumentsByClientId,
  deleteDocument,
};
