import {
  getAllTrailers,
  getTrailerById,
  createTrailer,
  updateTrailer,
  deleteTrailerDocument,
  toggleTrailerStatus,
  getTrailersWithExpiringLicenses,
  getTrailersWithExpiredLicenses,
} from "../../models/manage/trailerModel.js"
import { s3Trucks, getSignedUrl } from "../../utils/s3Config.js"

const getAllTrailersHandler = async (req, res) => {
  try {
    console.log("=== TRAILER API DEBUG ===")
    console.log("Request query:", req.query)
    console.log("Request headers:", req.headers.authorization ? "Token present" : "No token")

    const { page = 1, limit = 10, search = "" } = req.query
    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching trailers - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}`)

    const result = await getAllTrailers({
      offset,
      limit: limitNum,
      search,
    })

    console.log("Database result:", {
      trailerCount: result.trailers?.length || 0,
      totalCount: result.totalCount,
    })

    const response = {
      items: result.trailers,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    }

    console.log("Sending response:", response)
    res.json(response)
  } catch (err) {
    console.error("=== TRAILER API ERROR ===")
    console.error("Error details:", err)
    console.error("Stack trace:", err.stack)
    res.status(500).json({ error: "Failed to fetch trailers", details: err.message })
  }
}

const getTrailerByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Fetching trailer ID ${id}`)
    const result = await getTrailerById(id)
    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }
    const trailer = result.data

    // Format dates for proper display in date inputs
    if (trailer.trailerpurchasedate) {
      trailer.trailerpurchasedate = new Date(trailer.trailerpurchasedate).toISOString().split("T")[0]
    }
    if (trailer.trailer_license_expiry) {
      trailer.trailer_license_expiry = new Date(trailer.trailer_license_expiry).toISOString().split("T")[0]
    }

    const extractKeyFromUrl = (url) => {
      if (!url) {
        console.log("No document URL provided, skipping key extraction")
        return null
      }
      try {
        const key = decodeURIComponent(new URL(url).pathname.substring(1))
        console.log(`Extracted S3 key from URL: ${key}`)
        return key
      } catch (error) {
        console.error(`Error extracting key from URL ${url}:`, error)
        return url // Fallback to URL if parsing fails
      }
    }

    const signedUrls = await Promise.all(
      [trailer.document_url1, trailer.document_url2, trailer.document_url3].map(async (url) => {
        if (!url) {
          console.log("No document URL provided, skipping signed URL generation")
          return null
        }
        const key = extractKeyFromUrl(url)
        if (!key) {
          console.log("No valid key extracted, skipping signed URL generation")
          return null
        }
        try {
          const signedUrl = await getSignedUrl(key, 3600, process.env.Trucks_AWS_BUCKET_NAME)
          console.log(`Generated signed URL for key ${key}: ${signedUrl}`)
          return signedUrl
        } catch (error) {
          console.error(`Failed to generate signed URL for key ${key}:`, error)
          return null // Return null to avoid breaking the response
        }
      }),
    )

    trailer.document_url1 = signedUrls[0]
    trailer.document_url2 = signedUrls[1]
    trailer.document_url3 = signedUrls[2]

    res.json(trailer)
  } catch (err) {
    console.error("Error fetching trailer details:", err)
    res.status(500).json({ error: "Failed to fetch trailer details" })
  }
}

const createTrailerHandler = async (req, res) => {
  try {
    const {
      trailerregnum,
      trailersize,
      trailerpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      trailer_license_expiry,
    } = req.body

    // Server-side validation for required fields
    if (!trailerregnum || !trailer_license_expiry) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Trailer Registration and License Expiry Date are required",
      })
    }

    const fileLocations = (req.files || []).map((file) => file.location)
    console.log("Creating trailer with data:", req.body, "Files:", fileLocations)

    const newTrailer = await createTrailer(
      {
        trailerregnum,
        trailersize,
        trailerpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        trailer_license_expiry,
      },
      fileLocations,
    )
    res.status(201).json(newTrailer)
  } catch (err) {
    console.error("Error creating trailer:", err)
    res.status(500).json({ error: "Failed to create trailer" })
  }
}

const updateTrailerHandler = async (req, res) => {
  try {
    const { id } = req.params
    const {
      trailerregnum,
      trailersize,
      trailerpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      trailer_license_expiry,
    } = req.body

    // Server-side validation for required fields
    if (!trailerregnum || !trailer_license_expiry) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Trailer Registration and License Expiry Date are required",
      })
    }

    const newDocLocations = (req.files || []).map((file) => file.location)
    console.log(`Updating trailer ID ${id}, New files:`, newDocLocations)

    const result = await updateTrailer(
      id,
      {
        trailerregnum,
        trailersize,
        trailerpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        trailer_license_expiry,
      },
      newDocLocations,
    )
    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error("Error updating trailer:", err)
    res.status(500).json({ error: "Failed to update trailer" })
  }
}

// New handler to toggle trailer status
const toggleTrailerStatusHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    console.log(`Toggling trailer ${id} status to ${status}`)

    const result = await toggleTrailerStatus(id, status)
    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    res.json({
      message: `Trailer ${status ? "enabled" : "disabled"} successfully`,
      trailer: result.data,
    })
  } catch (err) {
    console.error(`Error toggling trailer status ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to toggle trailer status" })
  }
}

// New endpoint to get trailers with expiring licenses
const getTrailersWithExpiringLicensesHandler = async (req, res) => {
  try {
    const { days = 30 } = req.query
    const expiringTrailers = await getTrailersWithExpiringLicenses(Number.parseInt(days))
    res.json(expiringTrailers)
  } catch (err) {
    console.error("Error fetching trailers with expiring licenses:", err)
    res.status(500).json({ error: "Failed to fetch expiring licenses" })
  }
}

// New endpoint to get trailers with expired licenses
const getTrailersWithExpiredLicensesHandler = async (req, res) => {
  try {
    const expiredTrailers = await getTrailersWithExpiredLicenses()
    res.json(expiredTrailers)
  } catch (err) {
    console.error("Error fetching trailers with expired licenses:", err)
    res.status(500).json({ error: "Failed to fetch expired licenses" })
  }
}

const deleteTrailerDocumentHandler = async (req, res) => {
  try {
    const { trailerId, url } = req.body
    if (!trailerId || !url) {
      return res.status(400).json({ message: "Missing trailer ID or document URL" })
    }

    console.log(`Deleting document for trailer ID ${trailerId}`)
    let s3Key
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1))
    } catch {
      s3Key = url
    }

    await s3Trucks
      .deleteObject({
        Bucket: process.env.Trucks_AWS_BUCKET_NAME,
        Key: s3Key,
      })
      .promise()

    const result = await deleteTrailerDocument(trailerId, s3Key)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json({ message: result.message })
  } catch (error) {
    console.error("Failed to delete trailer document:", error)
    res.status(500).json({ message: "Server error during document deletion" })
  }
}

export {
  getAllTrailersHandler,
  getTrailerByIdHandler,
  createTrailerHandler,
  updateTrailerHandler,
  deleteTrailerDocumentHandler,
  toggleTrailerStatusHandler,
  getTrailersWithExpiringLicensesHandler,
  getTrailersWithExpiredLicensesHandler,
}
