import { pool } from "../config/database.js";

const getClientName = async (clientId) => {
  try {
    const result = await pool.query(
      "SELECT client FROM m5_client WHERE m5clientkey = $1",
      [clientId]
    );
    if (result.rows.length > 0) {
      return result.rows[0].client.replace(/[^a-zA-Z0-9-_]/g, "-");
    }
    return "unknown-client";
  } catch (error) {
    console.error("Error fetching client name:", error);
    return "unknown-client";
  }
};

const getInstructionDetails = async (instructionId) => {
  try {
    const result = await pool.query(
      "SELECT m1key, client FROM m1_controller WHERE m1key = $1",
      [instructionId]
    );
    if (result.rows.length > 0) {
      return {
        instructionId: result.rows[0].m1key,
        clientId: result.rows[0].client,
      };
    }
    return { instructionId, clientId: null };
  } catch (error) {
    console.error("Error fetching instruction details:", error);
    return { instructionId, clientId: null };
  }
};

const getTruckRegNum = async (truckId) => {
  try {
    const result = await pool.query(
      "SELECT truckregnum FROM m5_trucks WHERE m5truckskey = $1",
      [truckId]
    );
    if (result.rows.length > 0) {
      return result.rows[0].truckregnum.replace(/[^a-zA-Z0-9-_]/g, "-");
    }
    return "unknown-truck";
  } catch (error) {
    console.error("Error fetching truck registration number:", error);
    return "unknown-truck";
  }
};

const uploadFileToS3 = async (s3, file, instructionId) => {
  try {
    if (!instructionId) {
      const key = `assignment-docs/${Date.now()}-${file.originalname}`;
      console.log("No instruction ID provided, using default path:", key);

      await s3
        .upload({
          Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      return key;
    }

    const instructionDetails = await getInstructionDetails(instructionId);
    const clientId = instructionDetails.clientId;

    if (!clientId) {
      const key = `assignment-docs/${instructionId}/${file.originalname}`;
      console.log(
        `No client found for instruction ${instructionId}, using instruction-only path:`,
        key
      );

      await s3
        .upload({
          Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      return key;
    }

    const clientName = await getClientName(clientId);
    const key = `assignment-docs/${clientName}-${instructionId}/${file.originalname}`;
    console.log(`Uploading to: ${key}`);

    await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return key;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    const key = `assignment-docs/error-${Date.now()}/${file.originalname}`;

    await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return key;
  }
};

const uploadFuelSlipToS3 = async (s3, file, truckId) => {
  try {
    if (!truckId) {
      const key = `fuel-slips/${file.originalname}`;
      console.log("No truck ID provided, using default path:", key);

      await s3
        .upload({
          Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      return key;
    }

    const key = `fuel-slips/${truckId}/${file.originalname}`;
    console.log(`Uploading fuel slip to: ${key}`);

    await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return key;
  } catch (error) {
    console.error("Error uploading fuel expense to S3:", error);
    const key = `fuel-slips/error/${file.originalname}`;

    await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return key;
  }
};

export {
  getClientName,
  getInstructionDetails,
  getTruckRegNum,
  uploadFileToS3,
  uploadFuelSlipToS3,
};
