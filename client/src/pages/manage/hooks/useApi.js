"use client"
import { useCallback } from "react"
import api from "../../../api.js"
import { showConfirmDialog, showAlert } from '../utils/alertUtils.js';

export function useApi(state, actions) {
  const fetchPaginatedData = useCallback(
    async (type, page = 1, itemsPerPage = 10, filters = {}) => {
      actions.setLoading(true)
      actions.setError(null)
      try {
        const endpoints = {
          employees: "/api/employees",
          clients: "/api/m5Clients",
          trucks: "/api/trucks",
          trailers: "/api/trailers",
          driverRates: "/api/driver-rates/routes",
          subcontractors: "/api/subcontractors",
          clientRates: "/api/client-rates",
          suppliers: "/api/suppliers",
          expenseTypes: "/api/expense-types",
          company: "/api/companies",
        }

        const endpoint = endpoints[type]
        if (!endpoint) {
          throw new Error(`Invalid data type: ${type}`)
        }

        // Skip pagination for company since there's only one record
        if (type === "company") {
          const response = await api.get(endpoint)
          actions.setData("company", response.data || {})
          return
        }

        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          ...filters,
        })

        // For suppliers, don't add status filter to get ALL suppliers
        if (type === "suppliers") {
          params.delete("status")
        }

        const response = await api.get(`${endpoint}?${params}`)

        // Handle different response structures
        let responseData = response.data
        if (type === "suppliers") {
          if (responseData.suppliers) {
            responseData.items = Array.isArray(responseData.suppliers) ? responseData.suppliers : []
          } else if (Array.isArray(responseData)) {
            responseData = { items: responseData, totalItems: responseData.length }
          } else if (!responseData.items) {
            responseData.items = []
          }
        } else if (type === "expenseTypes") {
          if (responseData.expenseTypes) {
            responseData.items = Array.isArray(responseData.expenseTypes) ? responseData.expenseTypes : []
          } else if (Array.isArray(responseData)) {
            responseData = { items: responseData, totalItems: responseData.length }
          } else if (!responseData.items) {
            responseData.items = []
          }
        }

        // Update data and pagination
        actions.setData(type, responseData.items || responseData || [])
        actions.setPagination(type, {
          currentPage: responseData.currentPage || page,
          totalPages: responseData.totalPages || 1,
          totalItems: responseData.totalItems || responseData.items?.length || responseData.length || 0,
          itemsPerPage: responseData.itemsPerPage || itemsPerPage,
        })
      } catch (err) {
        console.error(`Error fetching ${type}:`, err)
        let errorMessage = `Failed to load ${type}. Please try again.`
        if (err.response) {
          const { status } = err.response
          if (status === 401 || status === 403) {
            return
          }
          errorMessage = err.response.data?.error || errorMessage
        }
        actions.setError(errorMessage)
        actions.setData(type, type === "company" ? {} : [])
      } finally {
        actions.setLoading(false)
      }
    },
    [actions],
  )

  // Add a separate function to fetch ALL expense types for dropdowns
  const fetchAllExpenseTypes = useCallback(async () => {
    try {
      console.log("Fetching ALL expense types for dropdown...")
      const response = await api.get("/api/expense-types/simple")
      console.log("Fetched all expense types:", response.data)
      // Update the expense types in state - use allExpenseTypes key
      actions.setData("allExpenseTypes", response.data || [])
      return response.data || []
    } catch (error) {
      console.error("Error fetching all expense types:", error)
      // Try fallback to regular endpoint
      try {
        console.log("Trying fallback endpoint...")
        const fallbackResponse = await api.get("/api/expense-types?limit=1000")
        const fallbackData = fallbackResponse.data.expenseTypes || fallbackResponse.data || []
        console.log("Fallback expense types:", fallbackData)
        actions.setData("allExpenseTypes", fallbackData)
        return fallbackData
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError)
        actions.setData("allExpenseTypes", [])
        return []
      }
    }
  }, [actions])

  const fetchCompany = useCallback(async () => {
    actions.setLoading(true)
    actions.setError(null)
    try {
      const response = await api.get("/api/companies")
      console.log("Fetched company:", response.data)
      actions.setData("company", response.data || {})
    } catch (err) {
      console.error("Error fetching company:", err)
      let errorMessage = "Failed to load company details. Please try again."
      if (err.response) {
        const { status } = err.response
        if (status === 401 || status === 403) {
          return
        }
        errorMessage = err.response.data?.error || errorMessage
      }
      actions.setError(errorMessage)
      actions.setData("company", {})
    } finally {
      actions.setLoading(false)
    }
  }, [actions])

  const fetchAllData = useCallback(async () => {
    const { pagination, filters } = state
    await Promise.all([
      fetchPaginatedData(
        "employees",
        pagination.employees.currentPage,
        pagination.employees.itemsPerPage,
        filters.employees,
      ),
      fetchPaginatedData("clients", pagination.clients.currentPage, pagination.clients.itemsPerPage, filters.clients),
      fetchPaginatedData("trucks", pagination.trucks.currentPage, pagination.trucks.itemsPerPage, filters.trucks),
      fetchPaginatedData(
        "trailers",
        pagination.trailers.currentPage,
        pagination.trailers.itemsPerPage,
        filters.trailers,
      ),
      fetchPaginatedData(
        "driverRates",
        pagination.driverRates.currentPage,
        pagination.driverRates.itemsPerPage,
        filters.driverRates,
      ),
      fetchPaginatedData(
        "subcontractors",
        pagination.subcontractors.currentPage,
        pagination.subcontractors.itemsPerPage,
        filters.subcontractors,
      ),
      fetchPaginatedData(
        "clientRates",
        pagination.clientRates.currentPage,
        pagination.clientRates.itemsPerPage,
        filters.clientRates,
      ),
      fetchPaginatedData(
        "suppliers",
        pagination.suppliers.currentPage,
        pagination.suppliers.itemsPerPage,
        filters.suppliers,
      ),
      fetchPaginatedData(
        "expenseTypes",
        pagination.expenseTypes.currentPage,
        pagination.expenseTypes.itemsPerPage,
        filters.expenseTypes,
      ),
      // Also fetch all expense types for dropdowns
      fetchAllExpenseTypes(),
      fetchCompany(),
    ])
  }, [state, fetchPaginatedData, fetchAllExpenseTypes, fetchCompany])

  const changePage = useCallback(
    async (type, page) => {
      if (type === "company") return // No pagination for company
      const { pagination, filters } = state
      const currentPagination = pagination[type]
      if (page >= 1 && page <= currentPagination.totalPages) {
        await fetchPaginatedData(type, page, currentPagination.itemsPerPage, filters[type])
      }
    },
    [state, fetchPaginatedData],
  )

  const changeItemsPerPage = useCallback(
    async (type, itemsPerPage) => {
      if (type === "company") return // No pagination for company
      const { filters } = state
      actions.resetPagination(type)
      await fetchPaginatedData(type, 1, itemsPerPage, filters[type])
    },
    [state, actions, fetchPaginatedData],
  )

  const applyFilters = useCallback(
    async (type) => {
      if (type === "company") return // No filters for company
      const { filters } = state
      actions.resetPagination(type)
      await fetchPaginatedData(type, 1, state.pagination[type].itemsPerPage, filters[type])
    },
    [state, actions, fetchPaginatedData],
  )

  const saveEmployee = useCallback(
    async (employeeData, emailRef) => {
      actions.setLoading(true)
      try {
        // Validate required fields
        if (!employeeData.name || !employeeData.surname) {
          actions.showAlert("Name and surname are required.")
          actions.setLoading(false)
          return false
        }

        // Build FormData
        const formData = new FormData()
        // Append all scalar fields
        Object.keys(employeeData).forEach((field) => {
          if (field === "password" && state.editingEmployeeId && !employeeData.password) return
          if (field !== "documents" && employeeData[field] !== undefined) {
            formData.append(field, employeeData[field] ?? "")
          }
        })

        // Append documents
        if (employeeData.documents) {
          employeeData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editingEmployeeId ? `/api/employees/${state.editingEmployeeId}` : "/api/employees"
        const method = state.editingEmployeeId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "employees",
          state.pagination.employees.currentPage,
          state.pagination.employees.itemsPerPage,
          state.filters.employees,
        )

        // Reset form
        actions.resetFormData("Employee")
        actions.setEditing("Employee", null)
        actions.hideForm("showEmployeeForm")
        actions.showAlert(state.editingEmployeeId ? "Employee updated!" : "Employee added!")
        return true
      } catch (err) {
        console.error("Error saving employee:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveClient = useCallback(
    async (clientData, emailRef) => {
      actions.setLoading(true)
      try {
        if (!state.isEditing) {
          const { data } = await api.get(
            `/api/m5Clients/check-email-existence?email=${encodeURIComponent(clientData.email)}`,
          )
          if (data.exists) {
            emailRef.current?.setCustomValidity("Email already exists. Please use a different one.")
            emailRef.current?.reportValidity()
            actions.setLoading(false)
            return false
          }
        }

        // Prepare client data with proper field mapping and type conversion
        const preparedClientData = {
          client: clientData.client || "",
          representative: clientData.representative || "",
          companyaddress: clientData.companyaddress || "",
          suburb: clientData.suburb || "",
          postalcode: clientData.postalcode || "",
          email: clientData.email || "",
          client_reg_num: clientData.client_reg_num || "",
          cellnum: clientData.cellnum || "",
          vatregno: clientData.vatregno || "",
          city: clientData.city || "",
          streetaddress: clientData.streetaddress || "",
          payment_type: clientData.payment_type || "",
          insurance:
            clientData.insurance === "" || clientData.insurance === undefined
              ? 0
              : Number.parseFloat(clientData.insurance),
          starting_point: clientData.starting_point || null,
          destination: clientData.destination || null,
          driver_six_meter_rate:
            clientData.driver_six_meter_rate === "" || clientData.driver_six_meter_rate === undefined
              ? null
              : Number.parseFloat(clientData.driver_six_meter_rate),
          driver_twelve_meter_rate:
            clientData.driver_twelve_meter_rate === "" || clientData.driver_twelve_meter_rate === undefined
              ? null
              : Number.parseFloat(clientData.driver_twelve_meter_rate),
        }

        if (state.isEditing) {
          await api.put(`/api/m5Clients/${state.editingClientId}`, preparedClientData)
        } else {
          await api.post("/api/m5Clients", preparedClientData)
        }

        // Refresh current page
        await fetchPaginatedData(
          "clients",
          state.pagination.clients.currentPage,
          state.pagination.clients.itemsPerPage,
          state.filters.clients,
        )

        actions.resetFormData("Client")
        actions.setEditing("Client", null)
        actions.hideForm("showClientForm")
        actions.showAlert(state.isEditing ? "Client updated!" : "Client added!")
        return true
      } catch (err) {
        console.error("Error saving client:", err)
        actions.showAlert(`Error saving client: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveTruck = useCallback(
    async (truckData) => {
      actions.setLoading(true)
      try {
        const formData = new FormData()
        // Append all scalar fields including git
        Object.keys(truckData).forEach((key) => {
          if (key !== "documents" && truckData[key] !== undefined) {
            formData.append(key, truckData[key])
          }
        })

        // Append documents
        if (truckData.documents && truckData.documents.length) {
          truckData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editTruckId ? `/api/trucks/${state.editTruckId}` : "/api/trucks"
        const method = state.editTruckId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "trucks",
          state.pagination.trucks.currentPage,
          state.pagination.trucks.itemsPerPage,
          state.filters.trucks,
        )

        actions.resetFormData("Truck")
        actions.setEditing("Truck", null)
        actions.hideForm("showTruckForm")
        actions.showAlert(state.editTruckId ? "Truck updated!" : "Truck added!")
        return true
      } catch (err) {
        console.error("Error saving truck:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveTrailer = useCallback(
    async (trailerData) => {
      actions.setLoading(true)
      try {
        const formData = new FormData()
        // Append all scalar fields
        Object.keys(trailerData).forEach((key) => {
          if (key !== "documents" && trailerData[key] !== undefined) {
            formData.append(key, trailerData[key])
          }
        })

        // Append documents
        if (trailerData.documents && trailerData.documents.length) {
          trailerData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editTrailerId ? `/api/trailers/${state.editTrailerId}` : "/api/trailers"
        const method = state.editTrailerId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "trailers",
          state.pagination.trailers.currentPage,
          state.pagination.trailers.itemsPerPage,
          state.filters.trailers,
        )

        actions.resetFormData("Trailer")
        actions.setEditing("Trailer", null)
        actions.hideForm("showTrailerForm")
        actions.showAlert(state.editTrailerId ? "Trailer updated!" : "Trailer added!")
        return true
      } catch (err) {
        console.error("Error saving trailer:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveDriverRate = useCallback(
    async (rateData) => {
      actions.setLoading(true)
      try {
        let instructionsToRefresh = []
        let shouldRefreshLegs = false

        if (state.editingRateId) {
          try {
            const usageResponse = await api.get(`/api/driver-rates/${state.editingRateId}/usage`)
            const usageData = usageResponse.data

            if (usageData?.inUse) {
              const usedRateFields = Array.isArray(usageData.usedRateFields) ? usageData.usedRateFields : []

              const isMatchingNumber = (a, b) => {
                if (a === null || a === undefined || a === "" || b === null || b === undefined || b === "") return false
                const numA = Number(a)
                const numB = Number(b)
                if (Number.isNaN(numA) || Number.isNaN(numB)) return false
                return Math.abs(numA - numB) < 0.005
              }

              const isWarnableRateValue = (value) => {
                if (value === null || value === undefined || value === "") return false
                const num = Number(value)
                if (Number.isNaN(num)) return true
                return Math.abs(num) >= 1
              }

              const affectedUsedRateFields = usedRateFields.filter((rf) => {
                const newValue = rateData?.[rf.field]
                const oldValue = rf.value

                if ((newValue === "" || newValue === null || newValue === undefined) && (oldValue === null || oldValue === undefined)) {
                  return false
                }

                if (newValue === "" || newValue === null || newValue === undefined) {
                  return oldValue !== null && oldValue !== undefined
                }

                if (oldValue === null || oldValue === undefined) {
                  return newValue !== "" && newValue !== null && newValue !== undefined
                }

                return !isMatchingNumber(newValue, oldValue)
              })

              if (affectedUsedRateFields.length > 0) {
                shouldRefreshLegs = true
                instructionsToRefresh = [
                  ...new Set(
                    affectedUsedRateFields
                      .flatMap((rf) => (Array.isArray(rf.instructions) ? rf.instructions : []))
                      .filter((v) => v !== null && v !== undefined),
                  ),
                ]
                const warnableAffectedRateFields = affectedUsedRateFields.filter((rf) => isWarnableRateValue(rf.value))

                if (warnableAffectedRateFields.length > 0) {
                  const escapeHtml = (value) => {
                    if (value === null || value === undefined) return ""
                    return String(value)
                      .replaceAll("&", "&amp;")
                      .replaceAll("<", "&lt;")
                      .replaceAll(">", "&gt;")
                      .replaceAll('"', "&quot;")
                      .replaceAll("'", "&#039;")
                  }

                  const formatRateValue = (value) => {
                    if (value === null || value === undefined || value === "") return "(empty)"
                    const num = Number(value)
                    return Number.isNaN(num) ? escapeHtml(value) : escapeHtml(num)
                  }

                  const htmlLines = warnableAffectedRateFields
                    .map((rf) => {
                      const newValue = rateData?.[rf.field]
                      const instrList = Array.isArray(rf.instructions) ? rf.instructions : []
                      const instrText = instrList.length ? instrList.join(", ") : ""

                      return (
                        `<div style="margin-bottom:10px;">` +
                        `<div><strong>${escapeHtml(rf.label)}</strong>: ${formatRateValue(rf.value)} &rarr; ${formatRateValue(newValue)}</div>` +
                        `<div style="margin-top:4px;"><strong>Instruction no:</strong> ${escapeHtml(instrText)}</div>` +
                        `</div>`
                      )
                    })
                    .join("")

                  const alertHtml =
                    `<div style="text-align:left;">` +
                    `<div style="margin-bottom:10px;"><strong>Changing this rate will affect the following instructions:</strong></div>` +
                    `${htmlLines}` +
                    `</div>`

                  const confirmed = await showConfirmDialog("Warning", alertHtml, "Continue", { html: true })

                  if (!confirmed) {
                    return false
                  }
                }
              }
            }
          } catch (usageErr) {
            console.error("Error checking driver rate usage:", usageErr)
          }
        }

        const cleanedDriverRate = {
          startingpoint: rateData.startingpoint,
          destination: rateData.destination,
          driver_six_meter_rate: rateData.driver_six_meter_rate === "" ? null : Number(rateData.driver_six_meter_rate),
          driver_twelve_meter_rate: rateData.driver_twelve_meter_rate === "" ? null : Number(rateData.driver_twelve_meter_rate),
          subie_six_meter_rate: rateData.subie_six_meter_rate === "" ? null : Number(rateData.subie_six_meter_rate),
          subie_twelve_meter_rate: rateData.subie_twelve_meter_rate === "" ? null : Number(rateData.subie_twelve_meter_rate),
          effective_from: rateData.effective_from || new Date().toISOString().split('T')[0],
          effective_to: rateData.effective_to || null,
        }

        const url = state.editingRateId ? `/api/driver-rates/${state.editingRateId}` : "/api/driver-rates"
        const method = state.editingRateId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, cleanedDriverRate)
        console.log("API response:", response.data)

        if (state.editingRateId && shouldRefreshLegs) {
          try {
            await api.post(`/api/driver-rates/${state.editingRateId}/refresh-legs`, {
              instructions: instructionsToRefresh,
            })
          } catch (refreshErr) {
            console.error("Error refreshing legs after driver rate update:", refreshErr)
          }
        }

        await fetchPaginatedData(
          "driverRates",
          state.pagination.driverRates.currentPage,
          state.pagination.driverRates.itemsPerPage,
          state.filters.driverRates,
        )

        actions.resetFormData("DriverRate")
        actions.setEditing("Rate", null)
        actions.hideForm("showDriverRateForm")
        actions.showAlert("Driver rate saved!")
        return true
      } catch (err) {
        console.error("Error saving driver rate:", err)
        actions.showAlert(`Error saving driver rate: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const checkDriverRateOverlap = useCallback(
    async (rateData) => {
      try {
        const { startingpoint, destination, effective_from, effective_to } = rateData

        if (!startingpoint || !destination || !effective_from) {
          return { hasOverlaps: false, overlappingRates: [], message: "" }
        }

        const params = new URLSearchParams({
          startingpoint: startingpoint.trim(),
          destination: destination.trim(),
          effective_from,
        })

        if (effective_to) {
          params.append("effective_to", effective_to)
        }

        if (state.editingRateId) {
          params.append("exclude_id", state.editingRateId.toString())
        }

        const response = await api.get(`/api/driver-rates/check-overlaps?${params}`)
        return response.data
      } catch (err) {
        console.error("Error checking driver rate overlap:", err)
        return { hasOverlaps: false, overlappingRates: [], message: "" }
      }
    },
    [state.editingRateId],
  )

  // ─── Route-grouped driver rate functions (new UX) ──────────────────────────

  const loadRouteForEdit = useCallback(
    async (startingpoint, destination) => {
      actions.setLoading(true)
      try {
        const params = new URLSearchParams({ startingpoint, destination })

        // Fetch periods and leg dates in parallel
        const [periodsResp, legDatesResp] = await Promise.all([
          api.get(`/api/driver-rates/route-periods?${params}`),
          api.get(`/api/driver-rates/route-leg-dates?${params}`).catch(() => ({ data: [] })),
        ])
        const periods = periodsResp.data
        const legDates = Array.isArray(legDatesResp.data) ? legDatesResp.data : []

        // Attach overlap warnings to each existing period
        const periodsWithWarnings = await Promise.all(
          periods.map(async (period) => {
            const formatted = {
              m5ratekey: period.m5ratekey,
              effective_from: period.effective_from ? period.effective_from.toString().split("T")[0] : "",
              effective_to: period.effective_to ? period.effective_to.toString().split("T")[0] : "",
              driver_six_meter_rate: period.driver_six_meter_rate ?? "",
              driver_twelve_meter_rate: period.driver_twelve_meter_rate ?? "",
              subie_six_meter_rate: period.subie_six_meter_rate ?? "",
              subie_twelve_meter_rate: period.subie_twelve_meter_rate ?? "",
              _overlapWarning: null,
            }
            try {
              const overlapParams = new URLSearchParams({
                startingpoint,
                destination,
                effective_from: formatted.effective_from,
                ...(formatted.effective_to && { effective_to: formatted.effective_to }),
                ...(period.m5ratekey && { exclude_id: period.m5ratekey.toString() }),
              })
              const overlapRes = await api.get(`/api/driver-rates/check-overlaps?${overlapParams}`)
              if (overlapRes.data?.hasOverlaps) {
                formatted._overlapWarning = overlapRes.data.message
              }
            } catch (_) { /* overlap check is non-blocking */ }
            return formatted
          }),
        )

        actions.showPeriods(startingpoint, destination, periodsWithWarnings, legDates)
      } catch (err) {
        console.error("Error loading route for edit:", err)
        actions.showAlert("Failed to load rate periods for this route")
      } finally {
        actions.setLoading(false)
      }
    },
    [actions],
  )

  const saveRoutePeriods = useCallback(
    async (startingpoint, destination, periods, originalStartingpoint, originalDestination) => {
      actions.setLoading(true)
      try {
        // Client-side validation
        for (const period of periods) {
          if (!period.effective_from) {
            actions.showAlert("Each period must have an Effective From date.")
            return false
          }
          if (period.effective_to && period.effective_to < period.effective_from) {
            actions.showAlert("Effective To cannot be before Effective From.")
            return false
          }
          const hasRate =
            (period.driver_six_meter_rate !== "" && period.driver_six_meter_rate != null) ||
            (period.driver_twelve_meter_rate !== "" && period.driver_twelve_meter_rate != null) ||
            (period.subie_six_meter_rate !== "" && period.subie_six_meter_rate != null) ||
            (period.subie_twelve_meter_rate !== "" && period.subie_twelve_meter_rate != null)
          if (!hasRate) {
            actions.showAlert("Each period must have at least one rate value.")
            return false
          }
        }

        // If the route name changed, check the new name doesn't already exist in DB
        const isRename =
          originalStartingpoint &&
          originalDestination &&
          (startingpoint.trim().toLowerCase() !== originalStartingpoint.trim().toLowerCase() ||
            destination.trim().toLowerCase() !== originalDestination.trim().toLowerCase())

        if (isRename) {
          try {
            const newRouteParams = new URLSearchParams({ startingpoint, destination })
            const conflictResp = await api.get(`/api/driver-rates/route-periods?${newRouteParams}`)
            if (Array.isArray(conflictResp.data) && conflictResp.data.length > 0) {
              await showAlert(
                "Route Already Exists",
                `A route "${startingpoint} → ${destination}" already exists. Choose a different name or delete the existing route first.`,
                "error",
              )
              return false
            }
          } catch (_) {
            // Network or server error — block the save rather than proceeding
            // blind and potentially creating a duplicate route.
            await showAlert(
              "Conflict Check Failed",
              "Could not verify the new route name. Please check your connection and try again.",
              "error",
            )
            return false
          }
        }

        // Check if any in-progress instructions are using this route AND a rate value changed
        let affectedInstructions = []
        try {
          // When renaming, usage is on the original route name
          const lookupSp = (isRename ? originalStartingpoint : startingpoint)
          const lookupDest = (isRename ? originalDestination : destination)
          const routeParams = new URLSearchParams({ startingpoint: lookupSp, destination: lookupDest })

          // Fetch current DB periods and usage check in parallel
          const [dbPeriodsResp, usageResp] = await Promise.all([
            api.get(`/api/driver-rates/route-periods?${routeParams}`),
            api.get(`/api/driver-rates/route-usage?${routeParams}`),
          ])

          if (usageResp.data?.inUse) {
            // Always collect affected instructions — legs need a refresh any time the
            // period structure changes (removal, date range shift, new period, rate value).
            affectedInstructions = usageResp.data.instructions || []

            const rateFields = [
              "driver_six_meter_rate",
              "driver_twelve_meter_rate",
              "subie_six_meter_rate",
              "subie_twelve_meter_rate",
            ]

            const rateChanged = (a, b) => {
              const na = a === "" || a == null ? null : Number(a)
              const nb = b === "" || b == null ? null : Number(b)
              if (na === null && nb === null) return false
              if (na === null || nb === null) return true
              return Math.abs(na - nb) >= 0.005
            }

            // Build a lookup of DB periods by m5ratekey
            const dbById = {}
            for (const p of dbPeriodsResp.data) {
              if (p.m5ratekey) dbById[p.m5ratekey] = p
            }

            // Only show the rate-change warning when a rate VALUE changed on an existing period
            const hasRateChange = periods.some((card) => {
              if (!card.m5ratekey) return false
              const db = dbById[card.m5ratekey]
              if (!db) return false
              return rateFields.some((f) => rateChanged(card[f], db[f]))
            })

            if (hasRateChange) {
              const instrText = affectedInstructions.join(", ")
              const confirmed = await showConfirmDialog(
                "Rate Change Warning",
                `<div style="text-align:left;">
                  <div style="margin-bottom:10px;"><strong>Changing these rates will update the following in-progress instructions:</strong></div>
                  <div style="margin-bottom:10px;"><strong>Instruction no:</strong> ${instrText}</div>
                  <div>The driver rate on their legs will be recalculated to match the new periods.</div>
                </div>`,
                "Continue",
                { html: true },
              )
              if (!confirmed) return false
            }
          }
        } catch (usageErr) {
          console.error("Error checking route usage before save:", usageErr)
        }

        const saveResp = await api.post("/api/driver-rates/route-periods", {
          startingpoint,
          destination,
          periods,
          ...(isRename && { originalStartingpoint, originalDestination }),
        })

        const savedPeriods = Array.isArray(saveResp.data?.periods) ? saveResp.data.periods : []
        const firstId = savedPeriods[0]?.m5ratekey

        // Refresh leg rates for all affected instructions. Merge both sets
        // (rate-change affected + rename affected) so instructions that appear
        // in both are only refreshed once.
        const renamedInstructions = saveResp.data?.renamedInstructions || []
        const allAffected = [...new Set([...affectedInstructions, ...renamedInstructions])]
        if (allAffected.length > 0 && firstId) {
          try {
            await api.post(`/api/driver-rates/${firstId}/refresh-legs`, {
              instructions: allAffected,
            })
          } catch (refreshErr) {
            console.error("Error refreshing legs after route period save:", refreshErr)
          }
        }

        await fetchPaginatedData(
          "driverRates",
          state.pagination.driverRates.currentPage,
          state.pagination.driverRates.itemsPerPage,
          state.filters.driverRates,
        )

        actions.hidePeriods()
        actions.showAlert("Driver rates saved!")
        return true
      } catch (err) {
        console.error("Error saving route periods:", err)
        actions.showAlert(`Error saving rates: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const deleteRoute = useCallback(
    async (startingpoint, destination) => {
      actions.setLoading(true)
      try {
        // Check usage before attempting delete so we can show affected instructions upfront
        const usageParams = new URLSearchParams({ startingpoint, destination })
        const usageResp = await api.get(`/api/driver-rates/route-usage?${usageParams}`)
        const usageData = usageResp.data

        if (usageData?.inUse) {
          const instructions = usageData.instructions || []
          const instrText = instructions.length ? instructions.join(", ") : "unknown"
          await showAlert(
            "Cannot Delete Route",
            `This route is currently used by in-progress instruction(s): ${instrText}.\n\nClose or complete those instructions before deleting this route.`,
            "error",
          )
          return
        }

        // Not in use — confirm then delete
        const confirmed = await showConfirmDialog(
          "Delete Route?",
          `Delete all rate periods for "${startingpoint} → ${destination}"? This cannot be undone.`,
          "Delete",
        )
        if (!confirmed) return

        await api.delete(`/api/driver-rates/route?${usageParams}`)
        await fetchPaginatedData(
          "driverRates",
          state.pagination.driverRates.currentPage,
          state.pagination.driverRates.itemsPerPage,
          state.filters.driverRates,
        )
        actions.showAlert("Route deleted successfully")
      } catch (err) {
        console.error("Error deleting route:", err)
        actions.showAlert("Failed to delete route")
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  // ───────────────────────────────────────────────────────────────────────────

  const saveSubcontractor = useCallback(
    async (subcontractorData) => {
      actions.setLoading(true)
      try {
        console.log("Raw subcontractor data:", subcontractorData)
        console.log("Current editing state:", {
          isEditMode: state.isEditMode,
          subcontractorId: state.subcontractorId,
        })

        // Validate required fields
        if (
          !subcontractorData.companyname ||
          !subcontractorData.location ||
          !subcontractorData.contact_person ||
          !subcontractorData.cellnum ||
          !subcontractorData.email ||
          !subcontractorData.subei_reg_num
        ) {
          actions.showAlert("Please fill in all required company information fields.")
          return false
        }

        // Validate drivers array - at least one driver is required
        const validDrivers = (subcontractorData.drivers || []).filter((driver) => driver.name && driver.name.trim())
        if (validDrivers.length === 0) {
          actions.showAlert("Please provide at least one driver name.")
          return false
        }

        // Trucks are optional, but if provided, validate them
        const validTrucks = (subcontractorData.trucks || []).filter(
          (truck) => truck.truckregnum && truck.truckregnum.trim(),
        )

        const payload = {
          companyname: subcontractorData.companyname,
          location: subcontractorData.location,
          contact_person: subcontractorData.contact_person,
          cellnum: subcontractorData.cellnum,
          email: subcontractorData.email,
          subei_reg_num: subcontractorData.subei_reg_num,
          drivers: validDrivers,
          trucks: validTrucks,
        }

        console.log("Sending subcontractor payload:", payload)

        const url = state.subcontractorId ? `/api/subcontractors/${state.subcontractorId}` : "/api/subcontractors"
        const method = state.subcontractorId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, payload)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.resetFormData("Subcontractor")
        actions.setEditing("Subcontractor", null)
        actions.hideForm("showSubcontractorForm")
        actions.showAlert(state.subcontractorId ? "Subcontractor updated!" : "Subcontractor added!")
        return true
      } catch (err) {
        console.error("Error saving subcontractor:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    }, [state, actions, fetchPaginatedData])

  const saveClientRates = useCallback(
    async (ratesData) => {
      actions.setLoading(true)
      try {
        const clientId = state.newClientRate.clientId
        console.log("Saving client rates:", { clientId, ratesData })

        // Validate that we have a client ID
        if (!clientId) {
          actions.showAlert("Client ID is missing.")
          return false
        }

        // Validate that we have at least one rate
        if (!ratesData || ratesData.length === 0) {
          actions.showAlert("Please add at least one rate.")
          return false
        }

        // Validate each rate
        const hasValue = (v) => v !== "" && v !== null && v !== undefined

        const validRates = ratesData
          .filter((rate) => {
            return rate.starting_point && rate.destination && (hasValue(rate["6m_rate"]) || hasValue(rate["12m_rate"]))
          })
          .map((rate) => {
            const surcharge6M = rate.surcharge6M ?? rate.surcharges ?? ""
            const surcharge12m = rate.surcharge12m ?? ""

            return {
              ...rate,
              surcharge6M,
              surcharge12m,
              surcharges: surcharge6M,
            }
          })

        if (validRates.length === 0) {
          actions.showAlert(
            "Please provide valid starting point, destination, and at least one rate (6m or 12m) for each entry.",
          )
          return false
        }

        const payload = {
          rates: validRates,
        }

        const url = `/api/client-rates/${clientId}`
        const method = "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, payload)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "clientRates",
          state.pagination.clientRates.currentPage,
          state.pagination.clientRates.itemsPerPage,
          state.filters.clientRates,
        )

        actions.resetFormData("ClientRate")
        actions.setEditing("ClientRate", null)
        actions.hideForm("showClientRateForm")
        actions.showAlert("Client rates saved successfully!")
        return true
      } catch (err) {
        console.error("Error saving client rates:", err)
        actions.showAlert(`Error saving client rates: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveSupplier = useCallback(
    async (supplierData) => {
      actions.setLoading(true)
      console.log("saveSupplier called with data:", supplierData)
      console.log("Is editing:", !!state.editingSupplierId)
      try {
        // Prepare supplier data with proper field mapping
        const preparedSupplierData = {
          supplier: supplierData.supplier || "",
          representative: supplierData.representative || "",
          address: supplierData.address || "",
          suburb: supplierData.suburb || "",
          postalcode: supplierData.postalcode || "",
          email: supplierData.email || "",
          cellnum: supplierData.cellnum || "",
          vatregno: supplierData.vatregno || "",
          city: supplierData.city || "",
          streetaddress: supplierData.streetaddress || "",
          payment_type: supplierData.payment_type || "",
          expenseTypes: supplierData.expenseTypes || [],
        }

        console.log("Prepared supplier data:", preparedSupplierData)

        const url = state.editingSupplierId ? `/api/suppliers/${state.editingSupplierId}` : "/api/suppliers"
        const method = state.editingSupplierId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, preparedSupplierData)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "suppliers",
          state.pagination.suppliers.currentPage,
          state.pagination.suppliers.itemsPerPage,
          state.filters.suppliers,
        )

        actions.resetFormData("Supplier")
        actions.setEditing("Supplier", null)
        actions.hideForm("showSupplierForm")
        actions.showAlert(state.editingSupplierId ? "Supplier updated!" : "Supplier added!")
        return true
      } catch (err) {
        console.error("Error saving supplier:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error saving supplier: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveExpenseType = useCallback(
    async (expenseTypeData) => {
      actions.setLoading(true)
      console.log("saveExpenseType called with data:", expenseTypeData)
      console.log("Is editing:", !!state.editingExpenseTypeId)
      try {
        const preparedExpenseTypeData = {
          expense: expenseTypeData.expense || "",
        }

        console.log("Prepared expense type data:", preparedExpenseTypeData)

        const url = state.editingExpenseTypeId
          ? `/api/expense-types/${state.editingExpenseTypeId}`
          : "/api/expense-types"
        const method = state.editingExpenseTypeId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, preparedExpenseTypeData)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "expenseTypes",
          state.pagination.expenseTypes.currentPage,
          state.pagination.expenseTypes.itemsPerPage,
          state.filters.expenseTypes,
        )

        // Also refresh all expense types for dropdowns
        await fetchAllExpenseTypes()

        actions.resetFormData("ExpenseType")
        actions.setEditing("ExpenseType", null)
        actions.hideForm("showExpenseTypeForm")
        actions.showAlert(state.editingExpenseTypeId ? "Expense type updated!" : "Expense type added!")
        return true
      } catch (err) {
        console.error("Error saving expense type:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error saving expense type: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData, fetchAllExpenseTypes],
  )

  const saveCompany = useCallback(
    async (companyData) => {
      actions.setLoading(true)
      try {
        if (!companyData.companyname || !companyData.company_reg_num) {
          actions.showAlert("Company name and registration number are required.")
          return false
        }

        const preparedCompanyData = {
          companyname: companyData.companyname || "",
          company_reg_num: companyData.company_reg_num || "",
          cell_num2: companyData.cell_num2 || "",
          vat_reg_num: companyData.vat_reg_num || "",
          account_num: companyData.account_num || "",
          name_of_acc: companyData.name_of_acc || "",
          bank: companyData.bank || "",
          branch: companyData.branch || "",
          branch_code: companyData.branch_code || "",
          address: companyData.address || "",
          suburb: companyData.suburb || "",
          swift_code: companyData.swift_code || "",
          cluster_box: companyData.cluster_box || "",
        }

        console.log("Prepared company data:", preparedCompanyData)

        const url = "/api/companies"
        const method = "put"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, preparedCompanyData)
        console.log("API response:", response.data)

        await fetchCompany()

        actions.resetFormData("Company")
        actions.setEditing("Company", null)
        actions.hideForm("showCompanyForm")
        actions.showAlert("Company details updated!")
        return true
      } catch (err) {
        console.error("Error saving company:", err)
        actions.showAlert(`Error saving company: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchCompany],
  )

  const toggleEmployeeStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/employees/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "employees",
          state.pagination.employees.currentPage,
          state.pagination.employees.itemsPerPage,
          state.filters.employees,
        )

        actions.showAlert(`Employee ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling employee ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} employee: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleClientStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/clients/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "clients",
          state.pagination.clients.currentPage,
          state.pagination.clients.itemsPerPage,
          state.filters.clients,
        )

        actions.showAlert(`Client ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling client ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} client: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleSubcontractorStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/subcontractors/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.showAlert(`Subcontractor ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling subcontractor ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} subcontractor: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleSubcontractorDriverStatus = useCallback(
    async (driverId, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/subcontractors/drivers/${driverId}/toggle-status`, { driverstatus: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.showAlert(`Driver ${newStatus ? "enabled" : "disabled"}!`)
        return true
      } catch (err) {
        console.error(`Error toggling driver ${driverId}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} driver: ${err.response?.data?.error || err.message}`,
        )
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleSupplierStatus = useCallback(
    async (id) => {
      actions.setLoading(true)
      try {
        // Validate ID
        const supplierId = Number.parseInt(id)
        if (isNaN(supplierId) || supplierId <= 0) {
          throw new Error("Invalid supplier ID")
        }

        console.log(`Sending PUT request to toggle supplier ${supplierId}`)
        await api.put(`/api/suppliers/${supplierId}/toggle-status`)

        // Refresh current page
        await fetchPaginatedData(
          "suppliers",
          state.pagination.suppliers.currentPage,
          state.pagination.suppliers.itemsPerPage,
          state.filters.suppliers,
        )

        actions.showAlert(`Supplier status toggled successfully!`)
      } catch (err) {
        console.error(`Error toggling supplier ${id}:`, {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          code: err.code,
        })
        actions.showAlert(`Error toggling supplier status: ${err.response?.data?.error || err.message}`)
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleTruckStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        console.log(`Toggling truck ${id} status from ${currentStatus} to ${newStatus}`)

        // Use the correct endpoint: /api/trucks/:id/status
        await api.put(`/api/trucks/${id}/status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "trucks",
          state.pagination.trucks.currentPage,
          state.pagination.trucks.itemsPerPage,
          state.filters.trucks,
        )

        actions.showAlert(`Truck ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling truck ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} truck: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleTrailerStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/trailers/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "trailers",
          state.pagination.trailers.currentPage,
          state.pagination.trailers.itemsPerPage,
          state.filters.trailers,
        )

        actions.showAlert(`Trailer ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling trailer ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} trailer: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const deleteItem = useCallback(
    async (type, id) => {
      actions.setLoading(true)
      try {
        let endpoint
        switch (type) {
          case "client":
            endpoint = `/api/m5Clients/${id}`
            break
          case "truck":
            endpoint = `/api/trucks/${id}`
            break
          case "trailer":
            endpoint = `/api/trailers/${id}`
            break
          case "rate":
            endpoint = `/api/driver-rates/${id}`
            break
          case "supplier":
            endpoint = `/api/suppliers/${id}`
            break
          case "expenseType":
            endpoint = `/api/expense-types/${id}`
            break
          default:
            throw new Error("Invalid type")
        }

        await api.delete(endpoint)

        // Refresh current page
        const dataType = type === "rate" ? "driverRates" : type === "expenseType" ? "expenseTypes" : `${type}s`
        await fetchPaginatedData(
          dataType,
          state.pagination[dataType].currentPage,
          state.pagination[dataType].itemsPerPage,
          state.filters[dataType],
        )

        // If deleting expense type, also refresh all expense types for dropdowns
        if (type === "expenseType") {
          await fetchAllExpenseTypes()
        }

        actions.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`)
      } catch (err) {
        console.error(`Error deleting ${type} ${id}:`, err)
        actions.showAlert(`Error deleting ${type}: ${err.response?.data?.error || err.message}`)
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData, fetchAllExpenseTypes],
  )

  const deleteSubcontractorDriver = useCallback(
    async (driverId) => {
      const confirmed = await showConfirmDialog(
        'Are you sure?',
        'You want to delete this driver?',
        'Yes, delete it!'
      );

      if (!confirmed) {
        return false;
      }

      actions.setLoading(true);
      try {
        await api.delete(`/api/subcontractors/drivers/${driverId}`);

        // Refresh current page
        await fetchPaginatedData(
          'subcontractors',
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors
        );

        await showAlert('Success', 'Driver deleted successfully!', 'success');
        return true;
      } catch (err) {
        console.error('Error deleting driver:', err);
        await showAlert('Error', `Error deleting driver: ${err.response?.data?.error || err.message}`, 'error');
        return false;
      } finally {
        actions.setLoading(false);
      }
    },
    [state, actions, fetchPaginatedData]
  );

  const deleteSubcontractorTruck = useCallback(
    async (truckId) => {
      const confirmed = await showConfirmDialog(
        'Are you sure?',
        'You want to delete this truck?',
        'Yes, delete it!'
      );

      if (!confirmed) {
        return false;
      }

      actions.setLoading(true);
      try {
        await api.delete(`/api/subcontractors/trucks/${truckId}`);

        // Refresh current page
        await fetchPaginatedData(
          'subcontractors',
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors
        );

        await showAlert('Success', 'Truck deleted successfully!', 'success');
        return true;
      } catch (err) {
        console.error('Error deleting truck:', err);
        await showAlert('Error', `Error deleting truck: ${err.response?.data?.error || err.message}`, 'error');
        return false;
      } finally {
        actions.setLoading(false);
      }
    },
    [state, actions, fetchPaginatedData]
  );

  const deleteClientRate = useCallback(
    async (rateId) => {
      const confirmed = await showConfirmDialog(
        'Are you sure?',
        'You want to delete this rate?',
        'Yes, delete it!'
      );

      if (!confirmed) {
        return false;
      }

      actions.setLoading(true);
      try {
        await api.delete(`/api/client-rates/${rateId}`);

        // Refresh current page
        await fetchPaginatedData(
          'clientRates',
          state.pagination.clientRates.currentPage,
          state.pagination.clientRates.itemsPerPage,
          state.filters.clientRates
        );

        await showAlert('Success', 'Client rate deleted successfully!', 'success');
        return true;
      } catch (err) {
        console.error('Error deleting client rate:', err);
        await showAlert('Error', `Error deleting client rate: ${err.response?.data?.error || err.message}`, 'error');
        return false;
      } finally {
        actions.setLoading(false);
      }
    },
    [state, actions, fetchPaginatedData]
  );

  const loadItemForEdit = useCallback(
    async (type, id) => {
      try {
        let endpoint
        let formType

        if (type === "company") {
          endpoint = "/api/companies"
          formType = "Company"
        } else {
          // Validate ID before making the request
          const numericId = Number.parseInt(id)
          if (isNaN(numericId) || numericId <= 0) {
            console.error(`Invalid ID for ${type}:`, id)
            actions.showAlert(`Invalid ${type} ID provided.`)
            return
          }

          switch (type) {
            case "employee":
              endpoint = `/api/employees/${numericId}/details`
              formType = "Employee"
              break
            case "client":
              endpoint = `/api/m5Clients/${numericId}`
              formType = "Client"
              break
            case "truck":
              endpoint = `/api/trucks/${numericId}`
              formType = "Truck"
              break
            case "trailer":
              endpoint = `/api/trailers/${numericId}`
              formType = "Trailer"
              break
            case "rate":
              endpoint = `/api/driver-rates/${numericId}`
              formType = "DriverRate"
              break
            case "subcontractor":
              endpoint = `/api/subcontractors/${numericId}`
              formType = "Subcontractor"
              break
            case "clientRate":
              endpoint = `/api/client-rates/client/${numericId}`
              formType = "ClientRate"
              break
            case "supplier":
              endpoint = `/api/suppliers/${numericId}`
              formType = "Supplier"
              break
            case "expenseType":
              endpoint = `/api/expense-types/${numericId}`
              formType = "ExpenseType"
              break
            default:
              throw new Error("Invalid type")
          }
          id = numericId // Use numericId for consistency
        }

        console.log(`Loading ${type} for edit with ID:`, id, "Endpoint:", endpoint)
        const response = await api.get(endpoint)
        const data = response.data

        // Handle special cases for different types
        if (type === "employee") {
          const existingDocuments = []
          // Check for document URLs and add them to existingDocuments array
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          // Get the latest deduction data
          const latestDeduction =
            data.deductionHistory && data.deductionHistory.length > 0 ? data.deductionHistory[0] : {}

          actions.updateFormData(formType, {
            ...data,
            documents: [], // Reset new documents
            existingDocuments, // Set existing documents for display
            income_tax_rate: latestDeduction.income_tax_rate || "",
            deduction_other_deductions: latestDeduction.deduction_other_deductions || "",
            deduction_uif: latestDeduction.deduction_uif || "",
            deduction_bonus: latestDeduction.deduction_bonus || "",
            deduction_savings: latestDeduction.deduction_savings || "",
            deduction_loan: latestDeduction.deduction_loan || "",
            deduction_damage: latestDeduction.deduction_damage || "",
          })
        } else if (type === "client") {
          actions.updateFormData(formType, {
            ...data,
            driver_six_meter_rate: data.driver_six_meter_rate || "",
            driver_twelve_meter_rate: data.driver_twelve_meter_rate || "",
          })
        } else if (type === "truck" || type === "trailer") {
          const existingDocuments = []
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          // Format dates for HTML date inputs
          const formattedData = { ...data }
          if (type === "truck" && data.truckpurchasedate) {
            formattedData.truckpurchasedate = new Date(data.truckpurchasedate).toISOString().split("T")[0]
          }
          if (type === "truck" && data.truck_license_expiry) {
            formattedData.truck_license_expiry = new Date(data.truck_license_expiry).toISOString().split("T")[0]
          }
          if (type === "trailer" && data.trailerpurchasedate) {
            formattedData.trailerpurchasedate = new Date(data.trailerpurchasedate).toISOString().split("T")[0]
          }
          if (type === "trailer" && data.trailer_license_expiry) {
            formattedData.trailer_license_expiry = new Date(data.trailer_license_expiry).toISOString().split("T")[0]
          }

          actions.updateFormData(formType, {
            ...formattedData,
            documents: [],
            existingDocuments,
          })
        } else if (type === "subcontractor") {
          // Handle the new structure with separate drivers and trucks arrays
          actions.updateFormData(formType, {
            ...data,
            drivers: data.drivers || [{ name: "" }],
            trucks: data.trucks || [],
          })
        } else if (type === "clientRate") {
          // Handle client rates - data should include client info and rates
          const mappedRates = Array.isArray(data.rates)
            ? data.rates.map((rate) => {
                const surcharge6M = rate.surcharge6M ?? rate.surcharges ?? ""
                const surcharge12m = rate.surcharge12m ?? ""

                return {
                  ...rate,
                  surcharge6M,
                  surcharge12m,
                }
              })
            : null

          actions.updateFormData(formType, {
            ...data,
            clientId: id,
            rates:
              mappedRates || [
                {
                  starting_point: "",
                  destination: "",
                  "6m_rate": "",
                  "12m_rate": "",
                  surcharge6M: "",
                  surcharge12m: "",
                  hazardous: "",
                  vgm: "",
                  set_rate: "",
                  fuel_surcharge: "",
                },
              ],
          })
        } else if (type === "supplier") {
          // Handle supplier data - ensure we have the supplier data
          const supplierData = data.supplier || data
          console.log("Supplier data for edit:", supplierData)
          actions.updateFormData(formType, {
            ...supplierData,
            expenseTypes: supplierData.expenseTypes || [],
          })
        } else if (type === "rate") {
          // Format dates for HTML date inputs
          const formattedData = { ...data }
          if (data.effective_from) {
            formattedData.effective_from = new Date(data.effective_from).toISOString().split("T")[0]
          }
          if (data.effective_to) {
            formattedData.effective_to = new Date(data.effective_to).toISOString().split("T")[0]
          }
          actions.updateFormData(formType, formattedData)

          // Check for overlaps when loading existing rate
          if (data.startingpoint && data.destination && data.effective_from) {
            try {
              const params = new URLSearchParams({
                startingpoint: data.startingpoint.trim(),
                destination: data.destination.trim(),
                effective_from: formattedData.effective_from,
              })
              if (formattedData.effective_to) {
                params.append("effective_to", formattedData.effective_to)
              }
              params.append("exclude_id", id.toString())

              const overlapResponse = await api.get(`/api/driver-rates/check-overlaps?${params}`)
              if (overlapResponse.data.hasOverlaps) {
                actions.updateFormData(formType, { _overlapWarning: overlapResponse.data.message })
              }
            } catch (overlapErr) {
              console.error("Error checking overlaps on load:", overlapErr)
            }
          }
        } else if (type === "company") {
          actions.updateFormData(formType, {
            ...data,
            companyname: data.companyname || "",
            company_reg_num: data.company_reg_num || "",
            cell_num2: data.cell_num2 || "",
            vat_reg_num: data.vat_reg_num || "",
            account_num: data.account_num || "",
            name_of_acc: data.name_of_acc || "",
            bank: data.bank || "",
            branch: data.branch || "",
            branch_code: data.branch_code || "",
            address: data.address || "",
            suburb: data.suburb || "",
            swift_code: data.swift_code || "",
            cluster_box: data.cluster_box || "",
          })
        } else {
          actions.updateFormData(formType, data)
        }

        actions.setEditing(type.charAt(0).toUpperCase() + type.slice(1), id)
        actions.showForm(`show${formType}Form`)
      } catch (error) {
        console.error(`Error loading ${type} for edit:`, error)
        actions.showAlert(`Could not load ${type} details: ${error.response?.data?.error || error.message}`)
      }
    },
    [actions],
  )

  const deleteDocument = useCallback(
    async (type, itemId, url) => {
      const confirmed = await showConfirmDialog(
        'Are you sure?',
        'You want to delete this document?',
        'Yes, delete it!'
      );

      if (confirmed) {
        try {
          let endpoint;
          let idField;
          if (type === 'employee') {
            endpoint = '/api/employees/delete-doc';
            idField = 'employeeId';
          } else if (type === 'truck') {
            endpoint = '/api/trucks/delete-doc';
            idField = 'truckId';
          } else if (type === 'trailer') {
            endpoint = '/api/trailers/delete-doc';
            idField = 'trailerId';
          } else {
            throw new Error('Invalid document type');
          }

          const response = await api.post(endpoint, {
            [idField]: itemId,
            url,
          });

          if (response.data.message === 'Document deleted successfully') {
            const formType = type.charAt(0).toUpperCase() + type.slice(1);
            const currentData = state[`new${formType}`];
            actions.updateFormData(formType, {
              existingDocuments: currentData.existingDocuments.filter((doc) => doc !== url),
            });
            await showAlert('Success', 'Document deleted successfully.', 'success');
          }
        } catch (error) {
          console.error(`Failed to delete ${type} document:`, error);
          await showAlert('Error', 'Error occurred while deleting document.', 'error');
        }
      }
    },
    [state, actions]
  );

  return {
    fetchAllData,
    fetchPaginatedData,
    fetchAllExpenseTypes,
    fetchCompany,
    changePage,
    changeItemsPerPage,
    applyFilters,
    saveEmployee,
    saveClient,
    saveTruck,
    saveTrailer,
    saveDriverRate,
    checkDriverRateOverlap,
    loadRouteForEdit,
    saveRoutePeriods,
    deleteRoute,
    saveSubcontractor,
    saveClientRates,
    saveSupplier,
    saveExpenseType,
    saveCompany,
    toggleEmployeeStatus,
    toggleClientStatus,
    toggleSubcontractorStatus,
    toggleSubcontractorDriverStatus,
    toggleSupplierStatus,
    toggleTruckStatus,
    toggleTrailerStatus,
    deleteItem,
    deleteSubcontractorDriver,
    deleteSubcontractorTruck,
    deleteClientRate,
    loadItemForEdit,
    deleteDocument,
  }
}