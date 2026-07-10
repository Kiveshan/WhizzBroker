// S3 config for OPERATIONAL documents (instruction docs, fuel slips, payment
// proofs, purchase orders) — single bucket via AWS_ACCESS_KEY_ID/S3_BUCKET_NAME.
// NOT the same as ./s3Config.js, which handles employee/truck/trailer document
// buckets with their own credentials. Exports a sync getSignedUrl(key, expires).
import AWS from "aws-sdk";
import multer from "multer";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_REGION || "af-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME || "sherwyn-whizz-away";

const storage = multer.memoryStorage();

const checkBucket = async (bucketName) => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`Bucket ${bucketName} exists`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Bucket ${bucketName} doesn't exist, creating...`);
      await s3.createBucket({ Bucket: bucketName }).promise();
      console.log(`Bucket ${bucketName} created`);
    } else {
      console.error(`Error checking bucket: ${error.message}`);
    }
  }
};

checkBucket(bucketName);

const uploadPaymentProof = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"));
    }
  },
});
const uploadPurchaseOrder = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"));
    }
  },
});

const uploadInstruction = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"));
    }
  },
});

const uploadFuelExpense = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"));
    }
  },
});

const getSignedUrl = (key, expiresInSeconds = 3600) => {
  return s3.getSignedUrl("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: expiresInSeconds,
  });
};

export {
  s3,
  uploadInstruction,
  uploadFuelExpense,
  uploadPaymentProof,
  getSignedUrl,
  bucketName,
  uploadPurchaseOrder,
};
