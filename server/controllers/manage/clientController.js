import {
  checkClientEmailExists,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
} from "../../models/manage/clientModel.js"

const checkClientEmailExistsHandler = async (req, res) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" })
    }

    console.log(`Checking email existence for ${email}`)

    const exists = await checkClientEmailExists(email)

    res.json({ exists })
  } catch (err) {
    console.error("Error checking email existence:", err)
    res.status(500).json({ error: "Failed to check email existence" })
  }
}

const getAllClientsHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching clients - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}, Status: ${status}`)

    const result = await getAllClients({
      offset,
      limit: limitNum,
      search,
      status,
    })

    res.json({
      items: result.clients,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching clients:", err)
    res.status(500).json({ error: "Failed to fetch clients" })
  }
}

const getClientByIdHandler = async (req, res) => {
  try {
    const { id } = req.params

    console.log(`Fetching client ID ${id}`)

    const result = await getClientById(id)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch client" })
  }
}

const createClientHandler = async (req, res) => {
  try {
    const {
      client,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    } = req.body

    console.log("Creating client with data:", req.body)

    // Only validate client name is provided
    if (!client || client.trim() === "") {
      return res.status(400).json({ error: "Client name is required" })
    }

    const newClient = await createClient({
      client,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    })

    res.status(201).json(newClient)
  } catch (err) {
    console.error("Error creating client:", err)
    res.status(500).json({ error: "Failed to create client" })
  }
}

const updateClientHandler = async (req, res) => {
  try {
    const { id } = req.params

    const {
      client,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    } = req.body

    console.log(`Updating client ID ${id} with data:`, req.body)

    // Only validate client name is provided
    if (!client || client.trim() === "") {
      return res.status(400).json({ error: "Client name is required" })
    }

    const result = await updateClient(id, {
      client,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    })

    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error updating client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update client" })
  }
}

const toggleClientStatusHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    console.log(`Toggling status for client ID ${id} to ${status}`)

    const result = await toggleClientStatus(id, status)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error toggling client ${req.params.id} status:`, err)
    res.status(500).json({ error: "Failed to toggle client status" })
  }
}

const deleteClientHandler = async (req, res) => {
  try {
    const { id } = req.params

    console.log(`Deleting client ID ${id}`)

    const result = await deleteClient(id)

    if (!result.success) {
      const status = result.code === "IN_USE" ? 409 : 404
      return res.status(status).json({ message: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete client" })
  }
}

export {
  checkClientEmailExistsHandler,
  getAllClientsHandler,
  getClientByIdHandler,
  createClientHandler,
  updateClientHandler,
  toggleClientStatusHandler,
  deleteClientHandler,
}
