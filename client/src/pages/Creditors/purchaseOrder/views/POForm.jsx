"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, Trash2 } from "lucide-react"
import api from "../../../../api.js"
import "../css/PO.css"
import CompanyHeader from "../../../../components/CompanyHeader"

const POForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { categoryId, categoryName } = location.state || {}

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [trucks, setTrucks] = useState([]) 
  const isFuelExpense = categoryId === 5 || categoryId === "5"

  const [headerData, setHeaderData] = useState({
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    attentionTo: "",
    receivedBy: "",
    regNo: "",
    subbie: "",
  })

  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      expenseType: categoryName || "",
      expenseTypeId: categoryId || "",
      description: "",
      trucks: "",
    },
  ])

  useEffect(() => {
    if (categoryId) {
      const fetchSuppliers = async () => {
        try {
          setLoading(true)
          const response = await api.get(`/api/po-form/suppliers/${categoryId}`)
          setSuppliers(response.data)
          setError(null)
        } catch (err) {
          setError("Failed to load suppliers. Please try again.")
          console.error("Error fetching suppliers:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchSuppliers()
    }
  }, [categoryId])

  useEffect(() => {
    if (isFuelExpense) {
      const fetchTrucks = async () => {
        try {
          const response = await api.get("/api/po-form/trucks")
          setTrucks(response.data)
        } catch (err) {
          console.error("Error fetching trucks:", err)
          setError("Failed to load trucks. Please try again.")
        }
      }
      fetchTrucks()
    }
  }, [isFuelExpense])

  const handleHeaderChange = (e) => {
    const { name, value } = e.target
    setHeaderData({
      ...headerData,
      [name]: value,
    })
  }

  const handleLineItemChange = (id, field, value) => {
    setLineItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const addLineItem = () => {
    const newId = Math.max(...lineItems.map((item) => item.id)) + 1
    setLineItems([
      ...lineItems,
      {
        id: newId,
        expenseType: categoryName || "",
        expenseTypeId: categoryId || "",
        description: "",
        trucks: "",
      },
    ])
  }

  const deleteLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id))
    }
  }

  const handleBack = () => {
    navigate("/Creditors/CreatePO")
  }

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!headerData.supplier) {
    alert("Please select a supplier")
    return
  }
  if (lineItems.some((item) => !item.description || !item.trucks)) {
    alert("Please fill in all required fields for all line items")
    return
  }

  try {
    setLoading(true)
    const purchaseOrderData = {
      ...headerData,
      supplierId: Number.parseInt(headerData.supplier),
      lineItems: lineItems.map((item) => {
        const truckId = isFuelExpense ? Number.parseInt(item.trucks) : null
        console.log(`Submitting line item: expenseTypeId=${item.expenseTypeId}, truckid=${truckId}, quantity=${isFuelExpense ? 0 : Number.parseInt(item.trucks)}`)
        return {
          expenseTypeId: item.expenseTypeId,
          description: item.description,
          quantity: isFuelExpense ? 0 : Number.parseInt(item.trucks),
          truckid: isFuelExpense && item.trucks ? truckId : null,
        }
      }),
    }
    console.log("Purchase Order Data:", JSON.stringify(purchaseOrderData, null, 2))
    const response = await api.post("/api/po-form/create-multiple", purchaseOrderData)
    navigate("/Creditors/CreditorsOther")
  } catch (err) {
    setError("Failed to create purchase order. Please try again.")
    console.error("Error creating purchase order:", err)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <CompanyHeader />
        <button className="back-button" onClick={handleBack}>
          Back
        </button>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="supplier">Supplier</label>
                <select
                  id="supplier"
                  name="supplier"
                  className="dropdown"
                  value={headerData.supplier}
                  onChange={handleHeaderChange}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="form-control"
                  value={headerData.date}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="attentionTo">Att</label>
                <input
                  type="text"
                  id="attentionTo"
                  name="attentionTo"
                  className="form-control"
                  value={headerData.attentionTo}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="receivedBy">Received by</label>
                <input
                  type="text"
                  id="receivedBy"
                  name="receivedBy"
                  className="form-control"
                  value={headerData.receivedBy}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="regNo">Ref/Reg No</label>
                <input
                  type="text"
                  id="regNo"
                  name="regNo"
                  className="form-control"
                  value={headerData.regNo}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="subbie">Subbie</label>
                <input
                  type="text"
                  id="subbie"
                  name="subbie"
                  className="form-control"
                  value={headerData.subbie}
                  onChange={handleHeaderChange}
                />
              </div>
            </div>
          </div>

<div className="line-items">
  <div className="line-items-header">
    <h3>Line Items</h3>
    {!isFuelExpense && (
      <button type="button" className="add-item-btn" onClick={addLineItem}>
        <Plus size={16} />
        Add Item
      </button>
    )}
  </div>

  <table className="line-items-table">
    <thead>
      <tr>
        <th>Expense Type</th>
        <th>Description</th>
        {isFuelExpense ? <th>Trucks</th> : <th>Quantity</th>}
        {!isFuelExpense && <th>Actions</th>}
      </tr>
    </thead>
    <tbody>
      {lineItems.map((item) => (
        <tr key={item.id}>
          <td>
            <input type="text" value={item.expenseType} readOnly />
          </td>
          <td>
            <input
              type="text"
              value={item.description}
              onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
              required
            />
          </td>
          <td>
            {isFuelExpense ? (
              <select
                value={item.trucks}
                onChange={(e) => handleLineItemChange(item.id, "trucks", e.target.value)}
                className="form-control"
                required
              >
                <option value="">Select Truck</option>
                {trucks.map((truck) => (
                  <option key={truck.truckid} value={truck.truckid}>
                    {truck.truckregnum}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={item.trucks}
                onChange={(e) => handleLineItemChange(item.id, "trucks", e.target.value)}
                className="form-control"
                min="1"
                required
              />
            )}
          </td>
          {!isFuelExpense && (
            <td>
              <button
                type="button"
                className="delete-item-btn"
                onClick={() => deleteLineItem(item.id)}
                disabled={lineItems.length === 1}
                title="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  </table>
</div>

          <div className="submit-section">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit Purchase Order"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  )
}

export default POForm