import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
} from "../../models/manage/supplierModel.js"

export const getAllSuppliersHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query

    console.log("Fetching suppliers with params:", { page, limit, search })

    // Remove status filtering - fetch all suppliers
    const result = await getAllSuppliers(Number.parseInt(page), Number.parseInt(limit), search)

    res.json({
      success: true,
      suppliers: result.suppliers,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      itemsPerPage: result.itemsPerPage,
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch suppliers",
      details: error.message,
    })
  }
}

export const getSupplierByIdHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ID parameter
    const supplierId = Number.parseInt(id)
    if (isNaN(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid supplier ID provided",
      })
    }

    console.log("Fetching supplier with ID:", supplierId)

    const supplier = await getSupplierById(supplierId)

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: "Supplier not found",
      })
    }

    res.json({
      success: true,
      supplier,
    })
  } catch (error) {
    console.error("Error fetching supplier:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch supplier",
      details: error.message,
    })
  }
}

export const createSupplierHandler = async (req, res) => {
  try {
    const supplierData = req.body

    // Basic validation
    if (!supplierData.supplier || !supplierData.representative) {
      return res.status(400).json({
        success: false,
        error: "Supplier name and representative are required",
      })
    }

    console.log("Creating supplier with data:", supplierData)

    const supplier = await createSupplier(supplierData)

    res.status(201).json({
      success: true,
      supplier,
      message: "Supplier created successfully",
    })
  } catch (error) {
    console.error("Error creating supplier:", error)
    res.status(500).json({
      success: false,
      error: "Failed to create supplier",
      details: error.message,
    })
  }
}

export const updateSupplierHandler = async (req, res) => {
  try {
    const { id } = req.params
    const supplierData = req.body

    // Validate ID parameter
    const supplierId = Number.parseInt(id)
    if (isNaN(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid supplier ID provided",
      })
    }

    // Basic validation
    if (!supplierData.supplier || !supplierData.representative) {
      return res.status(400).json({
        success: false,
        error: "Supplier name and representative are required",
      })
    }

    console.log("Updating supplier with ID:", supplierId, "Data:", supplierData)

    const supplier = await updateSupplier(supplierId, supplierData)

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: "Supplier not found",
      })
    }

    res.json({
      success: true,
      supplier,
      message: "Supplier updated successfully",
    })
  } catch (error) {
    console.error("Error updating supplier:", error)
    res.status(500).json({
      success: false,
      error: "Failed to update supplier",
      details: error.message,
    })
  }
}

export const deleteSupplierHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ID parameter
    const supplierId = Number.parseInt(id)
    if (isNaN(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid supplier ID provided",
      })
    }

    const deleted = await deleteSupplier(supplierId)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Supplier not found",
      })
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    res.status(500).json({
      success: false,
      error: "Failed to delete supplier",
      details: error.message,
    })
  }
}

export const toggleSupplierStatusHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ID parameter
    const supplierId = Number.parseInt(id)
    if (isNaN(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid supplier ID provided",
      })
    }

    console.log("Toggle supplier status request for ID:", supplierId)

    const supplier = await toggleSupplierStatus(supplierId)

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: "Supplier not found",
      })
    }

    console.log("Supplier status toggled successfully:", supplier.supplier_id, "New status:", supplier.status)

    res.json({
      success: true,
      supplier,
      message: `Supplier ${supplier.status ? "activated" : "deactivated"} successfully`,
    })
  } catch (error) {
    console.error("Error toggling supplier status:", error)
    res.status(500).json({
      success: false,
      error: "Failed to update supplier status",
      details: error.message,
    })
  }
}
