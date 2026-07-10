import {
  getAllTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  toggleTruckStatus,
  deleteTruckDocument,
  deleteTruck,
  getTrucksWithExpiringLicenses,
  getTrucksWithExpiredLicenses,
} from "../../models/manage/truckModel.js"
import { s3Trucks, getSignedUrl } from "../../utils/s3Config.js"

const getAllTrucksHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query
    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching trucks - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}`)

    const result = await getAllTrucks({
      offset,
      limit: limitNum,
      search,
    })

    res.json({
      items: result.trucks,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching trucks:", err)
    res.status(500).json({ error: "Failed to fetch trucks" })
  }
}

const getTruckByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Fetching truck ID ${id}`)

    const result = await getTruckById(id)

    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    const truck = result.data

    // Format dates for proper display in date inputs
    if (truck.truckpurchasedate) {
      truck.truckpurchasedate = new Date(truck.truckpurchasedate).toISOString().split("T")[0]
    }
    if (truck.truck_license_expiry) {
      truck.truck_license_expiry = new Date(truck.truck_license_expiry).toISOString().split("T")[0]
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
      [truck.document_url1, truck.document_url2, truck.document_url3].map(async (url) => {
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

    truck.document_url1 = signedUrls[0]
    truck.document_url2 = signedUrls[1]
    truck.document_url3 = signedUrls[2]

    res.json(truck)
  } catch (err) {
    console.error("Error fetching truck details:", err)
    res.status(500).json({ error: "Failed to fetch truck details" })
  }
}

const createTruckHandler = async (req, res) => {
  try {
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      truck_license_expiry,
      git,
    } = req.body

    // Validate required fields
    if (!truckregnum || !truck_license_expiry) {
      return res.status(400).json({
        error: "Missing required fields: Truck Registration and License Expiry Date are required",
      })
    }

    const fileLocations = (req.files || []).map((file) => file.location)
    console.log("Creating truck with data:", req.body, "Files:", fileLocations)

    const newTruck = await createTruck(
      {
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
        truck_license_expiry,
        git,
      },
      fileLocations,
    )

    res.status(201).json(newTruck)
  } catch (err) {
    console.error("Error creating truck:", err)
    res.status(500).json({ error: "Failed to create truck" })
  }
}

const updateTruckHandler = async (req, res) => {
  try {
    const { id } = req.params
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      truck_license_expiry,
      git,
    } = req.body

    // Validate required fields
    if (!truckregnum || !truck_license_expiry) {
      return res.status(400).json({
        error: "Missing required fields: Truck Registration and License Expiry Date are required",
      })
    }

    const newDocLocations = (req.files || []).map((file) => file.location)
    console.log(`Updating truck ID ${id}, New files:`, newDocLocations)

    const result = await updateTruck(
      id,
      {
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
        truck_license_expiry,
        git,
      },
      newDocLocations,
    )

    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error("Error updating truck:", err)
    res.status(500).json({ error: "Failed to update truck" })
  }
}

// New handler for toggling truck status
const toggleTruckStatusHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    console.log(`Toggling truck status - ID: ${id}, New Status: ${status}`)

    const result = await toggleTruckStatus(id, status)

    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    res.json({
      message: `Truck ${status ? "enabled" : "disabled"} successfully`,
      truck: result.data,
    })
  } catch (err) {
    console.error(`Error toggling truck status ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to toggle truck status" })
  }
}

// New endpoint to get trucks with expiring licenses
const getTrucksWithExpiringLicensesHandler = async (req, res) => {
  try {
    const { days = 30 } = req.query
    const expiringTrucks = await getTrucksWithExpiringLicenses(Number.parseInt(days))
    res.json(expiringTrucks)
  } catch (err) {
    console.error("Error fetching trucks with expiring licenses:", err)
    res.status(500).json({ error: "Failed to fetch expiring licenses" })
  }
}

// New endpoint to get trucks with expired licenses
const getTrucksWithExpiredLicensesHandler = async (req, res) => {
  try {
    const expiredTrucks = await getTrucksWithExpiredLicenses()
    res.json(expiredTrucks)
  } catch (err) {
    console.error("Error fetching trucks with expired licenses:", err)
    res.status(500).json({ error: "Failed to fetch expired licenses" })
  }
}

const deleteTruckDocumentHandler = async (req, res) => {
  try {
    const { truckId, url } = req.body

    if (!truckId || !url) {
      return res.status(400).json({ message: "Missing truck ID or document URL" })
    }

    console.log(`Deleting document for truck ID ${truckId}`)

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

    const result = await deleteTruckDocument(truckId, s3Key)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json({ message: result.message })
  } catch (error) {
    console.error("Failed to delete truck document:", error)
    res.status(500).json({ message: "Server error during document deletion" })
  }
}

const deleteTruckHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Deleting truck ID ${id}`)

    const result = await deleteTruck(id)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting truck ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete truck" })
  }
}

export {
  getAllTrucksHandler,
  getTruckByIdHandler,
  createTruckHandler,
  updateTruckHandler,
  toggleTruckStatusHandler,
  deleteTruckDocumentHandler,
  deleteTruckHandler,
  getTrucksWithExpiringLicensesHandler,
  getTrucksWithExpiredLicensesHandler,
}
