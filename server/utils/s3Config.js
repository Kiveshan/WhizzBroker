// S3 config for FLEET/HR documents (employee, truck, trailer PDFs) — two
// buckets with separate credentials (Employee_* / Trucks_* env vars).
// NOT the same as ./s3-config.js, which handles operational docs in a single
// bucket. Exports an async getSignedUrl(key, expires, bucketName).
import AWS from "aws-sdk"
import multer from "multer"
import multerS3 from "multer-s3"
import dotenv from "dotenv"

dotenv.config()

// Validate environment variables
const requiredEnvVars = [
  "AWS_REGION",
  "Employee_AWS_ACCESS_KEY_ID",
  "Employee_AWS_SECRET_ACCESS_KEY",
  "Employee_AWS_BUCKET_NAME",
  "Trucks_AWS_ACCESS_KEY_ID",
  "Trucks_AWS_SECRET_ACCESS_KEY",
  "Trucks_AWS_BUCKET_NAME",
]
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])
if (missingEnvVars.length) {
  throw new Error(`Missing environment variables: ${missingEnvVars.join(", ")}`)
}

// Initialize S3 client for employee documents
const s3Employees = new AWS.S3({
  region: process.env.AWS_REGION || "af-south-1",
  accessKeyId: process.env.Employee_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.Employee_AWS_SECRET_ACCESS_KEY,
})

// Initialize S3 client for truck documents (also used for trailers)
const s3Trucks = new AWS.S3({
  region: process.env.AWS_REGION || "af-south-1",
  accessKeyId: process.env.Trucks_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.Trucks_AWS_SECRET_ACCESS_KEY,
})

const employeeBucketName = process.env.Employee_AWS_BUCKET_NAME
const truckBucketName = process.env.Trucks_AWS_BUCKET_NAME

// Check if buckets exist, create if they don't
const checkBucket = async (s3, bucketName) => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise()
    console.log(`Bucket ${bucketName} exists`)
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Bucket ${bucketName} doesn't exist, creating...`)
      await s3.createBucket({ Bucket: bucketName }).promise()
      console.log(`Bucket ${bucketName} created`)
    } else {
      console.error(`Error checking bucket ${bucketName}:`, error)
      throw error
    }
  }
}

// Initialize buckets
Promise.all([checkBucket(s3Employees, employeeBucketName), checkBucket(s3Trucks, truckBucketName)]).catch((error) => {
  console.error("Failed to initialize buckets:", error)
  process.exit(1)
})

// Function to generate unique key by appending suffix if file exists
const getUniqueKey = async (s3, bucket, baseKey) => {
  let key = baseKey
  let counter = 1
  while (true) {
    try {
      await s3.headObject({ Bucket: bucket, Key: key }).promise()
      // File exists, append suffix
      const extIndex = baseKey.lastIndexOf(".")
      const name = extIndex !== -1 ? baseKey.substring(0, extIndex) : baseKey
      const ext = extIndex !== -1 ? baseKey.substring(extIndex) : ""
      key = `${name}(${counter})${ext}`
      counter++
    } catch (error) {
      if (error.statusCode === 404) {
        // File doesn't exist, key is unique
        return key
      }
      console.error(`Error checking key ${key}:`, error)
      throw error
    }
  }
}

// Configure Multer-S3 for employee document uploads
const uploadEmployeeDocs = multer({
  storage: multerS3({
    s3: s3Employees,
    bucket: employeeBucketName,
    key: async (req, file, cb) => {
      try {
        const employeeNum = req.body.employeenum || "default"
        const employeeName = req.body.name || "unknown"
        const sanitizedEmployeeName = employeeName.trim().replace(/\s+/g, "_")
        const folderName = `Employees/${employeeNum}_${sanitizedEmployeeName}`
        const baseFileName = file.originalname
        const key = `${folderName}/${baseFileName}`
        const uniqueKey = await getUniqueKey(s3Employees, employeeBucketName, key)
        console.log(`Uploading employee document to S3 key: ${uniqueKey}`)
        cb(null, uniqueKey)
      } catch (error) {
        console.error(`Error generating unique key for ${file.originalname}:`, error)
        cb(error)
      }
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/
    const extname = filetypes.test(file.originalname.toLowerCase().split(".").pop())
    const mimetype = file.mimetype === "application/pdf"
    if (mimetype && extname) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed!"), false)
    }
  },
})

// Configure Multer-S3 for truck document uploads
const uploadTruckDocs = multer({
  storage: multerS3({
    s3: s3Trucks,
    bucket: truckBucketName,
    key: async (req, file, cb) => {
      try {
        const truckregnum = req.body.truckregnum || "default"
        const baseFileName = file.originalname
        const key = `Trucks/${truckregnum}/${baseFileName}`
        const uniqueKey = await getUniqueKey(s3Trucks, truckBucketName, key)
        console.log(`Uploading truck document to S3 key: ${uniqueKey}`)
        cb(null, uniqueKey)
      } catch (error) {
        console.error(`Error generating unique key for ${file.originalname}:`, error)
        cb(error)
      }
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/
    const extname = filetypes.test(file.originalname.toLowerCase().split(".").pop())
    const mimetype = file.mimetype === "application/pdf"
    if (mimetype && extname) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed!"), false)
    }
  },
})

// Configure Multer-S3 for trailer document uploads
const uploadTrailerDocs = multer({
  storage: multerS3({
    s3: s3Trucks, // Using the same S3 client as trucks
    bucket: truckBucketName, // Using the same bucket as trucks
    key: async (req, file, cb) => {
      try {
        const trailerregnum = req.body.trailerregnum || "default"
        const baseFileName = file.originalname
        const key = `Trailers/${trailerregnum}/${baseFileName}`
        const uniqueKey = await getUniqueKey(s3Trucks, truckBucketName, key)
        console.log(`Uploading trailer document to S3 key: ${uniqueKey}`)
        cb(null, uniqueKey)
      } catch (error) {
        console.error(`Error generating unique key for ${file.originalname}:`, error)
        cb(error)
      }
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/
    const extname = filetypes.test(file.originalname.toLowerCase().split(".").pop())
    const mimetype = file.mimetype === "application/pdf"
    if (mimetype && extname) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed!"), false)
    }
  },
})

// Generate signed URL for accessing S3 objects
const getSignedUrl = async (key, expiresInSeconds, bucketName) => {
  try {
    if (!key || !bucketName) {
      throw new Error(`Missing key (${key}) or bucket (${bucketName})`)
    }
    const s3 = bucketName === employeeBucketName ? s3Employees : s3Trucks
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: expiresInSeconds,
    }
    console.log(`Generating signed URL for key: ${key} in bucket: ${bucketName}`)
    return await s3.getSignedUrlPromise("getObject", params)
  } catch (error) {
    console.error(`Error generating signed URL for ${key}:`, error)
    throw error
  }
}

export {
  s3Employees,
  s3Trucks,
  uploadEmployeeDocs,
  uploadTruckDocs,
  uploadTrailerDocs, // New export for trailer documents
  getSignedUrl,
}
