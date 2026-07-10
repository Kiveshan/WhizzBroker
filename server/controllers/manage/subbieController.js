import {
  getAllSubcontractors,
  getSubcontractorById,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractorDriver,
  deleteSubcontractorTruck,
  toggleSubcontractorStatus,
  toggleSubcontractorDriverStatus,
} from "../../models/manage/subbieModel.js"

const getAllSubcontractorsHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching subcontractors - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}, Status: ${status}`)

    const result = await getAllSubcontractors({
      offset,
      limit: limitNum,
      search,
      status,
    })

    res.json({
      items: result.subcontractors,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching subcontractors:", err)
    res.status(500).json({ error: "Failed to fetch subcontractors" })
  }
}

const getSubcontractorByIdHandler = async (req, res) => {
  try {
    const { id } = req.params

    const parsedId = Number.parseInt(id)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid subcontractor ID" })
    }

    console.log(`Fetching subcontractor ID ${parsedId}`)
    const result = await getSubcontractorById(parsedId)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching subcontractor ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch subcontractor" })
  }
}

const createSubcontractorHandler = async (req, res) => {
  try {
    const { cellnum, email, companyname, location, contact_person, subei_reg_num, drivers, trucks } = req.body

    console.log("Creating subcontractor with data:", req.body)

    // Validate required fields
    if (!companyname || !location || !contact_person || !cellnum || !email || !subei_reg_num) {
      return res.status(400).json({ error: "Please fill in all required fields" })
    }

    // Validate drivers array
    if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
      return res.status(400).json({ error: "At least one driver is required" })
    }

    // Validate that at least one driver has a name
    const validDrivers = drivers.filter((driver) => driver.name && driver.name.trim())
    if (validDrivers.length === 0) {
      return res.status(400).json({ error: "At least one driver with a name is required" })
    }

    // Trucks are optional, but if provided, validate them
    const validTrucks = trucks ? trucks.filter((truck) => truck.truckregnum && truck.truckregnum.trim()) : []

    const result = await createSubcontractor({
      cellnum,
      email,
      companyname,
      location,
      contact_person,
      subei_reg_num,
      drivers: validDrivers,
      trucks: validTrucks,
    })

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.status(201).json(result.data)
  } catch (err) {
    console.error("Error creating subcontractor:", err)
    res.status(500).json({ error: "Failed to create subcontractor" })
  }
}

const updateSubcontractorHandler = async (req, res) => {
  try {
    const { id } = req.params

    const parsedId = Number.parseInt(id)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid subcontractor ID" })
    }

    const { cellnum, email, companyname, location, contact_person, subei_reg_num, drivers, trucks } = req.body

    console.log(`Updating subcontractor ID ${parsedId} with data:`, req.body)

    // Validate required fields
    if (!companyname || !location || !contact_person || !cellnum || !email || !subei_reg_num) {
      return res.status(400).json({ error: "Please fill in all required fields" })
    }

    // Validate drivers array
    if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
      return res.status(400).json({ error: "At least one driver is required" })
    }

    // Validate that at least one driver has a name
    const validDrivers = drivers.filter((driver) => driver.name && driver.name.trim())
    if (validDrivers.length === 0) {
      return res.status(400).json({ error: "At least one driver with a name is required" })
    }

    // Trucks are optional, but if provided, validate them
    const validTrucks = trucks ? trucks.filter((truck) => truck.truckregnum && truck.truckregnum.trim()) : []

    const result = await updateSubcontractor(parsedId, {
      cellnum,
      email,
      companyname,
      location,
      contact_person,
      subei_reg_num,
      drivers: validDrivers,
      trucks: validTrucks,
    })

    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error updating subcontractor ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update subcontractor" })
  }
}

const deleteSubcontractorDriverHandler = async (req, res) => {
  try {
    const { driverId } = req.params

    const parsedId = Number.parseInt(driverId)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid driver ID" })
    }

    console.log(`Deleting subcontractor driver ID ${parsedId}`)
    const result = await deleteSubcontractorDriver(parsedId)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting subcontractor driver ${req.params.driverId}:`, err)
    res.status(500).json({ error: "Failed to delete driver" })
  }
}

const deleteSubcontractorTruckHandler = async (req, res) => {
  try {
    const { truckId } = req.params

    const parsedId = Number.parseInt(truckId)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid truck ID" })
    }

    console.log(`Deleting subcontractor truck ID ${parsedId}`)
    const result = await deleteSubcontractorTruck(parsedId)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting subcontractor truck ${req.params.truckId}:`, err)
    res.status(500).json({ error: "Failed to delete truck" })
  }
}

const toggleSubcontractorStatusHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const parsedId = Number.parseInt(id)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid subcontractor ID" })
    }

    console.log(`Toggling status for subcontractor ID ${parsedId} to ${status}`)
    const result = await toggleSubcontractorStatus(parsedId, status)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error toggling subcontractor ${req.params.id} status:`, err)
    res.status(500).json({ error: "Failed to toggle subcontractor status" })
  }
}

const toggleSubcontractorDriverStatusHandler = async (req, res) => {
  try {
    const { driverId } = req.params
    const { driverstatus } = req.body

    const parsedId = Number.parseInt(driverId)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid driver ID" })
    }

    console.log(`Toggling driver status for driver ID ${parsedId} to ${driverstatus}`)
    const result = await toggleSubcontractorDriverStatus(parsedId, driverstatus)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error toggling driver ${req.params.driverId} status:`, err)
    res.status(500).json({ error: "Failed to toggle driver status" })
  }
}

export {
  getAllSubcontractorsHandler,
  getSubcontractorByIdHandler,
  createSubcontractorHandler,
  updateSubcontractorHandler,
  deleteSubcontractorDriverHandler,
  deleteSubcontractorTruckHandler,
  toggleSubcontractorStatusHandler,
  toggleSubcontractorDriverStatusHandler,
}
