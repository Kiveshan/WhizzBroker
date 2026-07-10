"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../css/Manage.css"
import "../css/pagination.css"
import "../css/additional-styles.css"

// Hooks
import { useManageState } from "../hooks/useManageState"
import { useApi } from "../hooks/useApi"
import { useTruckNotifications } from "../hooks/useTruckNotifications"
import { useTrailerNotifications } from "../hooks/useTrailerNotifications"

// Components
import CustomAlert from "../components/common/CustomAlert"
import NotificationBell from "../components/common/NotificationBell"

// Employee Components
import EmployeeTable from "../components/employees/Employeetable"
import EmployeeForm from "../components/employees/EmployeeForm"

// Client Components
import ClientTable from "../components/clients/ClientTable"
import ClientForm from "../components/clients/ClientForm"

// Truck Components
import TruckTable from "../components/trucks/TruckTable"
import TruckForm from "../components/trucks/TruckForm"

// Trailer Components
import TrailerTable from "../components/trailers/TrailerTable"
import TrailerForm from "../components/trailers/TrailerForm"

// Driver Rate Components
import DriverRatesTable from "../components/rates/DriverRatesTable"
import DriverRateForm from "../components/rates/DriverRateForm"
import DriverRatePeriodsForm from "../components/rates/DriverRatePeriodsForm"

// Subcontractor Components
import SubcontractorTable from "../components/subcontractors/SubcontractorTable"
import SubcontractorForm from "../components/subcontractors/SubcontractorForm"

// Client Rate Components
import ClientRatesTable from "../components/clientRates/ClientRatesTable"
import ClientRatesForm from "../components/clientRates/ClientRatesForm"

// Creditors Components
import CreditorsTab from "../components/creditors/CreditorsTab"

// Company Components
import CompanyTable from "../components/company/CompanyTable"
import CompanyForm from "../components/company/CompanyForm"

const Manage = () => {
  const navigate = useNavigate()
  const { state, actions } = useManageState()
  const api = useApi(state, actions)
  const { notifications: truckNotifications, refreshNotifications: refreshTruckNotifications } = useTruckNotifications()
  const { notifications: trailerNotifications, refreshNotifications: refreshTrailerNotifications } =
    useTrailerNotifications()

  // Fetch data on component mount
  useEffect(() => {
    api.fetchAllData()
  }, [])

  // Auto-hide alerts after 5 seconds
  useEffect(() => {
    if (state.showAlert) {
      const timer = setTimeout(() => {
        actions.hideAlert()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [state.showAlert, actions])

  // Debug company tab state
  useEffect(() => {
    if (state.activeTab === "company") {
      console.log("Company tab active, showCompanyForm:", state.showCompanyForm)
      // Ensure form is hidden unless explicitly editing
      if (state.showCompanyForm && !state.editingCompanyId) {
        console.log("Resetting showCompanyForm to false")
        actions.hideForm("showCompanyForm")
        actions.resetFormData("Company")
        actions.setEditing("Company", null)
      }
    }
  }, [state.activeTab, state.showCompanyForm, state.editingCompanyId, actions])

  const handleBack = () => {
    // Check if any form is currently showing
    const isAnyFormShowing =
      state.showEmployeeForm ||
      state.showClientForm ||
      state.showClientRateForm ||
      state.showTruckForm ||
      state.showTrailerForm ||
      state.showDriverRateForm ||
      state.showDriverRatePeriods ||
      state.showSubcontractorForm ||
      state.showSupplierForm ||
      state.showExpenseTypeForm ||
      state.showCompanyForm

    if (isAnyFormShowing) {
      // If a form is showing, hide it and return to the table
      actions.hideForm("showEmployeeForm")
      actions.hideForm("showClientForm")
      actions.hideForm("showClientRateForm")
      actions.hideForm("showTruckForm")
      actions.hideForm("showTrailerForm")
      actions.hideForm("showDriverRateForm")
      actions.hidePeriods()
      actions.hideForm("showSubcontractorForm")
      actions.hideForm("showSupplierForm")
      actions.hideForm("showExpenseTypeForm")
      actions.hideForm("showCompanyForm")

      // Reset all form data and editing states
      actions.resetFormData("Employee")
      actions.resetFormData("Client")
      actions.resetFormData("ClientRate")
      actions.resetFormData("Truck")
      actions.resetFormData("Trailer")
      actions.resetFormData("DriverRate")
      actions.resetFormData("Subcontractor")
      actions.resetFormData("Supplier")
      actions.resetFormData("ExpenseType")
      actions.resetFormData("Company")
      actions.setEditing("Employee", null)
      actions.setEditing("Client", null)
      actions.setEditing("ClientRate", null)
      actions.setEditing("Truck", null)
      actions.setEditing("Trailer", null)
      actions.setEditing("Rate", null)
      actions.setEditing("Subcontractor", null)
      actions.setEditing("Supplier", null)
      actions.setEditing("ExpenseType", null)
      actions.setEditing("Company", null)
    } else {
      // If no form is showing (we're in table view), navigate to dashboard
      navigate("/Dashboard")
    }
  }

  // Employee handlers
  const handleEmployeeFormChange = (field, value) => {
    actions.updateFormData("Employee", { [field]: value })
  }

  const handleEmployeeEdit = (id) => {
    api.loadItemForEdit("employee", id)
  }

  const handleEmployeeAdd = () => {
    actions.resetFormData("Employee")
    actions.setEditing("Employee", null)
    actions.showForm("showEmployeeForm")
  }

  const handleEmployeeCancel = () => {
    actions.resetFormData("Employee")
    actions.setEditing("Employee", null)
    actions.hideForm("showEmployeeForm")
  }

  // Client handlers
  const handleClientFormChange = (field, value) => {
    actions.updateFormData("Client", { [field]: value })
  }

  const handleClientEdit = (id) => {
    api.loadItemForEdit("client", id)
  }

  const handleClientAdd = () => {
    actions.resetFormData("Client")
    actions.setEditing("Client", null)
    actions.showForm("showClientForm")
  }

  const handleClientCancel = () => {
    actions.resetFormData("Client")
    actions.setEditing("Client", null)
    actions.hideForm("showClientForm")
  }

  // Truck handlers
  const handleTruckFormChange = (field, value) => {
    actions.updateFormData("Truck", { [field]: value })
  }

  const handleTruckEdit = (id) => {
    api.loadItemForEdit("truck", id)
  }

  const handleTruckAdd = () => {
    actions.resetFormData("Truck")
    actions.setEditing("Truck", null)
    actions.showForm("showTruckForm")
  }

  const handleTruckCancel = () => {
    actions.resetFormData("Truck")
    actions.setEditing("Truck", null)
    actions.hideForm("showTruckForm")
  }

  // Trailer handlers
  const handleTrailerFormChange = (field, value) => {
    actions.updateFormData("Trailer", { [field]: value })
  }

  const handleTrailerEdit = (id) => {
    api.loadItemForEdit("trailer", id)
  }

  const handleTrailerAdd = () => {
    actions.resetFormData("Trailer")
    actions.setEditing("Trailer", null)
    actions.showForm("showTrailerForm")
  }

  const handleTrailerCancel = () => {
    actions.resetFormData("Trailer")
    actions.setEditing("Trailer", null)
    actions.hideForm("showTrailerForm")
  }

  // Driver Rate handlers
  const handleDriverRateFormChange = (field, value) => {
    actions.updateFormData("DriverRate", { [field]: value })
  }

  const handleDriverRateFormChangeWithOverlapCheck = async (field, value) => {
    // First update the form data
    const updatedRate = { ...state.newDriverRate, [field]: value }
    actions.updateFormData("DriverRate", { [field]: value })

    // Check for overlaps if we have the required fields
    if (
      updatedRate.startingpoint &&
      updatedRate.destination &&
      updatedRate.effective_from &&
      (field === "startingpoint" || field === "destination" || field === "effective_from" || field === "effective_to")
    ) {
      const overlapResult = await api.checkDriverRateOverlap(updatedRate)
      if (overlapResult.hasOverlaps) {
        actions.updateFormData("DriverRate", { _overlapWarning: overlapResult.message })
      } else {
        actions.updateFormData("DriverRate", { _overlapWarning: null })
      }
    }
  }

  const handleDriverRateEdit = (startingpoint, destination) => {
    api.loadRouteForEdit(startingpoint, destination)
  }

  const handleDriverRateAdd = () => {
    actions.resetFormData("DriverRate")
    actions.setEditing("Rate", null)
    actions.showForm("showDriverRateForm")
  }

  const handleDriverRateCancel = () => {
    actions.resetFormData("DriverRate")
    actions.setEditing("Rate", null)
    actions.hideForm("showDriverRateForm")
  }

  // Subcontractor handlers
  const handleSubcontractorFormChange = (field, value) => {
    console.log(`Subcontractor form change: ${field} =`, value)
    actions.updateFormData("Subcontractor", { [field]: value })
  }

  const handleSubcontractorEdit = (id) => {
    console.log(`Editing subcontractor ID: ${id}`)
    api.loadItemForEdit("subcontractor", id)
  }

  const handleSubcontractorAdd = () => {
    console.log("Adding new subcontractor")
    actions.resetFormData("Subcontractor")
    actions.setEditing("Subcontractor", null)
    actions.showForm("showSubcontractorForm")
  }

  const handleSubcontractorCancel = () => {
    console.log("Cancelling subcontractor form")
    actions.resetFormData("Subcontractor")
    actions.setEditing("Subcontractor", null)
    actions.hideForm("showSubcontractorForm")
  }

  // Client Rate handlers
  const handleClientRateFormChange = (field, value) => {
    actions.updateFormData("ClientRate", { [field]: value })
  }

  const handleClientRateEdit = (clientId, clientName) => {
    console.log("Editing client rates for:", { clientId, clientName })
    // Set client info first
    actions.updateFormData("ClientRate", {
      clientId: clientId,
      client: clientName,
      rates: [],
    })
    // Load existing rates for this client
    api.loadItemForEdit("clientRate", clientId)
  }

  const handleClientRateCancel = () => {
    actions.resetFormData("ClientRate")
    actions.setEditing("ClientRate", null)
    actions.hideForm("showClientRateForm")
  }

  // Company handlers
  const handleCompanyFormChange = (field, value) => {
    actions.updateFormData("Company", { [field]: value })
  }

  const handleCompanyEdit = () => {
    console.log("Editing company")
    api.loadItemForEdit("company", "company")
  }

  const handleCompanyCancel = () => {
    console.log("Cancelling company form")
    actions.resetFormData("Company")
    actions.setEditing("Company", null)
    actions.hideForm("showCompanyForm")
  }

  return (
    <div className="manage-container">
      {/* Header */}
      <div className="manage-header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      {/* Alert */}
      {state.showAlert && <CustomAlert message={state.alertMessage} onClose={actions.hideAlert} />}

      {/* Tab Navigation */}
      <div className="manage-button-row">
        <button
          className={`manage-tab-button ${state.activeTab === "employees" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "clients" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("clients")}
        >
          Clients
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "clientRates" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("clientRates")}
        >
          Client Rates
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "rates" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("rates")}
        >
          Driver Rates
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "subcontractors" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("subcontractors")}
        >
          Subcontractors
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "creditors" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("creditors")}
        >
          Creditors
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "trucks" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("trucks")}
          style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}
        >
          Trucks
          <NotificationBell
            count={truckNotifications.count}
            notifications={truckNotifications}
            onRefresh={refreshTruckNotifications}
            type="truck"
          />
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "trailers" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("trailers")}
          style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}
        >
          Trailers
          <NotificationBell
            count={trailerNotifications.count}
            notifications={trailerNotifications}
            onRefresh={refreshTrailerNotifications}
            type="trailer"
          />
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "company" ? "active" : ""}`}
          onClick={() => {
            console.log("Switching to company tab")
            actions.setActiveTab("company")
            // Ensure form is hidden when switching to company tab
            actions.hideForm("showCompanyForm")
            actions.resetFormData("Company")
            actions.setEditing("Company", null)
          }}
        >
          Company details
        </button>
      </div>

      {/* Tab Content */}
      {/* Employees Tab */}
      {state.activeTab === "employees" && (
        <>
          {state.showEmployeeForm ? (
            <EmployeeForm
              employee={state.newEmployee}
              loading={state.loading}
              isEditing={!!state.editingEmployeeId}
              onSave={api.saveEmployee}
              onCancel={handleEmployeeCancel}
              onChange={handleEmployeeFormChange}
              onDeleteDocument={api.deleteDocument}
            />
          ) : (
            <EmployeeTable
              employees={state.employees}
              loading={state.loading}
              error={state.error}
              onEdit={handleEmployeeEdit}
              onToggleStatus={api.toggleEmployeeStatus}
              onAdd={handleEmployeeAdd}
              pagination={state.pagination.employees}
              onPageChange={(page) => api.changePage("employees", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("employees", itemsPerPage)}
              filters={state.filters.employees}
              onSearchChange={(value) => actions.setFilter("employees", "search", value)}
              onStatusChange={(value) => actions.setFilter("employees", "status", value)}
              onApplyFilters={() => api.applyFilters("employees")}
            />
          )}
        </>
      )}

      {/* Clients Tab */}
      {state.activeTab === "clients" && (
        <>
          {state.showClientForm ? (
            <ClientForm
              client={state.newClient}
              loading={state.loading}
              isEditing={state.isEditing}
              onSave={api.saveClient}
              onCancel={handleClientCancel}
              onChange={handleClientFormChange}
            />
          ) : (
            <ClientTable
              clients={state.clients}
              loading={state.loading}
              error={state.error}
              onEdit={handleClientEdit}
              onToggleStatus={api.toggleClientStatus}
              onAdd={handleClientAdd}
              pagination={state.pagination.clients}
              onPageChange={(page) => api.changePage("clients", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("clients", itemsPerPage)}
              filters={state.filters.clients}
              onSearchChange={(value) => actions.setFilter("clients", "search", value)}
              onStatusChange={(value) => actions.setFilter("clients", "status", value)}
              onApplyFilters={() => api.applyFilters("clients")}
            />
          )}
        </>
      )}

      {/* Client Rates Tab */}
      {state.activeTab === "clientRates" && (
        <>
          {state.showClientRateForm ? (
            <ClientRatesForm
              clientData={state.newClientRate}
              loading={state.loading}
              isEditing={!!state.editingClientRateId}
              onSave={(ratesData) => api.saveClientRates(ratesData)}
              onCancel={handleClientRateCancel}
              onChange={handleClientRateFormChange}
              onDeleteRate={api.deleteClientRate}
            />
          ) : (
            <ClientRatesTable
              clients={state.clientRates}
              loading={state.loading}
              error={state.error}
              onEditRates={handleClientRateEdit}
              pagination={state.pagination.clientRates}
              onPageChange={(page) => api.changePage("clientRates", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("clientRates", itemsPerPage)}
              filters={state.filters.clientRates}
              onSearchChange={(value) => actions.setFilter("clientRates", "search", value)}
              onApplyFilters={() => api.applyFilters("clientRates")}
            />
          )}
        </>
      )}

      {/* Trucks Tab */}
      {state.activeTab === "trucks" && (
        <>
          {state.showTruckForm ? (
            <TruckForm
              truck={state.newTruck}
              loading={state.loading}
              isEditing={!!state.editTruckId}
              onSave={api.saveTruck}
              onCancel={handleTruckCancel}
              onChange={handleTruckFormChange}
              onDeleteDocument={api.deleteDocument}
            />
          ) : (
            <TruckTable
              trucks={state.trucks}
              loading={state.loading}
              error={state.error}
              onEdit={handleTruckEdit}
              onToggleStatus={api.toggleTruckStatus}
              onDelete={(id) => api.deleteItem("truck", id)}
              onAdd={handleTruckAdd}
              pagination={state.pagination.trucks}
              onPageChange={(page) => api.changePage("trucks", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("trucks", itemsPerPage)}
              filters={state.filters.trucks}
              onSearchChange={(value) => actions.setFilter("trucks", "search", value)}
              onApplyFilters={() => api.applyFilters("trucks")}
            />
          )}
        </>
      )}

      {/* Trailers Tab */}
      {state.activeTab === "trailers" && (
        <>
          {state.showTrailerForm ? (
            <TrailerForm
              trailer={state.newTrailer}
              loading={state.loading}
              isEditing={!!state.editTrailerId}
              onSave={api.saveTrailer}
              onCancel={handleTrailerCancel}
              onChange={handleTrailerFormChange}
              onDeleteDocument={api.deleteDocument}
            />
          ) : (
            <TrailerTable
              trailers={state.trailers}
              loading={state.loading}
              error={state.error}
              onEdit={handleTrailerEdit}
              onToggleStatus={api.toggleTrailerStatus}
              onDelete={(id) => api.deleteItem("trailer", id)}
              onAdd={handleTrailerAdd}
              pagination={state.pagination.trailers}
              onPageChange={(page) => api.changePage("trailers", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("trailers", itemsPerPage)}
              filters={state.filters.trailers || { search: "" }}
              onSearchChange={(value) => actions.setFilter("trailers", "search", value)}
              onApplyFilters={() => api.applyFilters("trailers")}
            />
          )}
        </>
      )}

      {/* Driver Rates Tab */}
      {state.activeTab === "rates" && (
        <>
          {state.showDriverRatePeriods ? (
            <DriverRatePeriodsForm
              route={state.editingRoute}
              periods={state.driverRatePeriods}
              legDates={state.routeLegDates}
              loading={state.loading}
              onSave={api.saveRoutePeriods}
              onCancel={actions.hidePeriods}
              onAddPeriod={actions.addPeriodCard}
              onRemovePeriod={actions.removePeriodCard}
              onChangePeriod={actions.updatePeriodCard}
            />
          ) : state.showDriverRateForm ? (
            <DriverRateForm
              driverRate={state.newDriverRate}
              loading={state.loading}
              isEditing={state.isEditingRate}
              onSave={api.saveDriverRate}
              onCancel={handleDriverRateCancel}
              onChange={handleDriverRateFormChangeWithOverlapCheck}
            />
          ) : (
            <DriverRatesTable
              driverRates={state.driverRates}
              loading={state.loading}
              error={state.error}
              onEdit={(sp, dest) => api.loadRouteForEdit(sp, dest)}
              onDelete={(sp, dest) => api.deleteRoute(sp, dest)}
              onAdd={handleDriverRateAdd}
              pagination={state.pagination.driverRates}
              onPageChange={(page) => api.changePage("driverRates", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("driverRates", itemsPerPage)}
              filters={state.filters.driverRates}
              onSearchChange={(value) => actions.setFilter("driverRates", "search", value)}
              onApplyFilters={() => api.applyFilters("driverRates")}
            />
          )}
        </>
      )}

      {/* Subcontractors Tab */}
      {state.activeTab === "subcontractors" && (
        <>
          {state.showSubcontractorForm ? (
            <SubcontractorForm
              subcontractor={state.newSubcontractor}
              loading={state.loading}
              isEditing={state.isEditMode}
              onSave={api.saveSubcontractor}
              onCancel={handleSubcontractorCancel}
              onChange={handleSubcontractorFormChange}
              onToggleDriverStatus={api.toggleSubcontractorDriverStatus}
            />
          ) : (
            <SubcontractorTable
              subcontractors={state.subcontractors}
              loading={state.loading}
              error={state.error}
              onEdit={handleSubcontractorEdit}
              onToggleStatus={api.toggleSubcontractorStatus}
              onAdd={handleSubcontractorAdd}
              pagination={state.pagination.subcontractors}
              onPageChange={(page) => api.changePage("subcontractors", page)}
              onItemsPerPageChange={(itemsPerPage) => api.changeItemsPerPage("subcontractors", itemsPerPage)}
              filters={state.filters.subcontractors}
              onSearchChange={(value) => actions.setFilter("subcontractors", "search", value)}
              onStatusChange={(value) => actions.setFilter("subcontractors", "status", value)}
              onApplyFilters={() => api.applyFilters("subcontractors")}
            />
          )}
        </>
      )}

      {/* Creditors Tab */}
      {state.activeTab === "creditors" && <CreditorsTab state={state} actions={actions} api={api} />}

      {/* Company Tab */}
      {state.activeTab === "company" && (
        <>
          {state.showCompanyForm ? (
            <CompanyForm
              company={state.newCompany}
              loading={state.loading}
              isEditing={!!state.editingCompanyId}
              onSave={api.saveCompany}
              onCancel={handleCompanyCancel}
              onChange={handleCompanyFormChange}
            />
          ) : (
            <CompanyTable
              company={state.company}
              loading={state.loading}
              error={state.error}
              onEdit={handleCompanyEdit}
            />
          )}
        </>
      )}
    </div>
  )
}

export default Manage