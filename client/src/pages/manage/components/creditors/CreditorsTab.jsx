"use client"

import { useState } from "react"
import SupplierTable from "../suppliers/SupplierTable"
import SupplierForm from "../suppliers/SupplierForm"
import ExpenseTypeTable from "../expenseTypes/ExpenseTypeTable"
import ExpenseTypeForm from "../expenseTypes/ExpenseTypeForm"

const CreditorsTab = ({ state, actions, api }) => {
  const [activeSubTab, setActiveSubTab] = useState("suppliers")

  // Supplier handlers
  const handleSupplierFormChange = (field, value) => {
    console.log(`Supplier form change: ${field} =`, value)
    actions.updateFormData("Supplier", { [field]: value })
  }

  const handleSupplierEdit = (id) => {
    console.log(`Editing supplier ID: ${id}`)
    api.loadItemForEdit("supplier", id)
  }

  const handleSupplierAdd = () => {
    console.log("Adding new supplier")
    actions.resetFormData("Supplier")
    actions.setEditing("Supplier", null)
    actions.showForm("showSupplierForm")
  }

  const handleSupplierCancel = () => {
    console.log("Cancelling supplier form")
    actions.resetFormData("Supplier")
    actions.setEditing("Supplier", null)
    actions.hideForm("showSupplierForm")
  }

  const handleSupplierSave = async (supplierData) => {
    console.log("handleSupplierSave called with data:", supplierData)
    console.log("Current editing supplier ID:", state.editingSupplierId)

    try {
      const success = await api.saveSupplier(supplierData)
      if (success) {
        console.log("Supplier saved successfully")
        actions.hideForm("showSupplierForm")
        actions.resetFormData("Supplier")
        actions.setEditing("Supplier", null)
        actions.showAlert("Supplier saved successfully!", "success")
      } else {
        console.log("Failed to save supplier")
        actions.showAlert("Failed to save supplier", "error")
      }
      return success
    } catch (error) {
      console.error("Error saving supplier:", error)
      actions.showAlert("Error saving supplier: " + error.message, "error")
      return false
    }
  }

  // Expense Type handlers
  const handleExpenseTypeFormChange = (field, value) => {
    console.log(`Expense type form change: ${field} =`, value)
    actions.updateFormData("ExpenseType", { [field]: value })
  }

  const handleExpenseTypeEdit = (id) => {
    console.log(`Editing expense type ID: ${id}`)
    api.loadItemForEdit("expenseType", id)
  }

  const handleExpenseTypeAdd = () => {
    console.log("Adding new expense type")
    actions.resetFormData("ExpenseType")
    actions.setEditing("ExpenseType", null)
    actions.showForm("showExpenseTypeForm")
  }

  const handleExpenseTypeCancel = () => {
    console.log("Cancelling expense type form")
    actions.resetFormData("ExpenseType")
    actions.setEditing("ExpenseType", null)
    actions.hideForm("showExpenseTypeForm")
  }

  const handleExpenseTypeSave = async (expenseTypeData) => {
    console.log("handleExpenseTypeSave called with data:", expenseTypeData)
    console.log("Current editing expense type ID:", state.editingExpenseTypeId)

    try {
      const success = await api.saveExpenseType(expenseTypeData)
      if (success) {
        console.log("Expense type saved successfully")
        actions.hideForm("showExpenseTypeForm")
        actions.resetFormData("ExpenseType")
        actions.setEditing("ExpenseType", null)
        actions.showAlert("Expense type saved successfully!", "success")
      } else {
        console.log("Failed to save expense type")
        actions.showAlert("Failed to save expense type", "error")
      }
      return success
    } catch (error) {
      console.error("Error saving expense type:", error)
      actions.showAlert("Error saving expense type: " + error.message, "error")
      return false
    }
  }

  return (
    <div className="creditors-tab">
      {/* Sub-tab Navigation */}
      <div className="sub-tab-navigation">
        <div className="sub-tab-container">
          <button
            className={`sub-tab-button ${activeSubTab === "suppliers" ? "active" : "inactive"}`}
            onClick={() => setActiveSubTab("suppliers")}
          >
            Suppliers
          </button>
          <button
            className={`sub-tab-button ${activeSubTab === "expenseTypes" ? "active" : "inactive"}`}
            onClick={() => setActiveSubTab("expenseTypes")}
          >
            Expense Types
          </button>
        </div>
      </div>

      {/* Suppliers Sub-tab */}
      {activeSubTab === "suppliers" && (
        <>
          {state.showSupplierForm ? (
            <SupplierForm
              supplier={state.newSupplier}
              loading={state.loading}
              isEditing={!!state.editingSupplierId}
              onSubmit={handleSupplierSave}
              onCancel={handleSupplierCancel}
              onChange={handleSupplierFormChange}
              allExpenseTypes={state.allExpenseTypes || []}
            />
          ) : (
            <SupplierTable
              suppliers={state.suppliers}
              loading={state.loading}
              error={state.error}
              onEdit={handleSupplierEdit}
              onToggleStatus={api.toggleSupplierStatus}
              onAdd={handleSupplierAdd}
              pagination={state.pagination.suppliers}
              onPageChange={(page) => api.changePage("suppliers", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("suppliers", itemsPerPage)}
              filters={state.filters.suppliers}
              onSearchChange={(value) => actions.setFilter("suppliers", "search", value)}
              onStatusChange={(value) => actions.setFilter("suppliers", "status", value)}
              onApplyFilters={() => api.applyFilters("suppliers")}
            />
          )}
        </>
      )}

      {/* Expense Types Sub-tab */}
      {activeSubTab === "expenseTypes" && (
        <>
          {state.showExpenseTypeForm ? (
            <ExpenseTypeForm
              expenseType={state.newExpenseType}
              loading={state.loading}
              isEditing={!!state.editingExpenseTypeId}
              onSubmit={handleExpenseTypeSave}
              onCancel={handleExpenseTypeCancel}
              onChange={handleExpenseTypeFormChange}
            />
          ) : (
            <ExpenseTypeTable
              expenseTypes={state.expenseTypes}
              loading={state.loading}
              error={state.error}
              onEdit={handleExpenseTypeEdit}
              onDelete={(id) => api.deleteItem("expenseType", id)}
              onAdd={handleExpenseTypeAdd}
              pagination={state.pagination.expenseTypes}
              onPageChange={(page) => api.changePage("expenseTypes", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("expenseTypes", itemsPerPage)}
              filters={state.filters.expenseTypes}
              onSearchChange={(value) => actions.setFilter("expenseTypes", "search", value)}
              onApplyFilters={() => api.applyFilters("expenseTypes")}
            />
          )}
        </>
      )}
    </div>
  )
}

export default CreditorsTab
