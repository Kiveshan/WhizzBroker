"use client"

import { useReducer, useCallback } from "react"

// Initial state
const initialState = {
  // UI State
  activeTab: "employees",
  loading: false,
  error: null,

  // Data
  employees: [],
  clients: [],
  trucks: [],
  trailers: [],
  driverRates: [],
  subcontractors: [],
  clientRates: [],
  suppliers: [],
  expenseTypes: [],
  allExpenseTypes: [], // For dropdowns - contains ALL expense types
  company: {},

  // Pagination State
  pagination: {
    employees: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    clients: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    trucks: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    trailers: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    driverRates: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    subcontractors: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    clientRates: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    suppliers: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    expenseTypes: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
  },

  // Search/Filter State
  filters: {
    employees: {
      search: "",
      status: "all", // all, active, inactive
    },
    clients: {
      search: "",
      status: "all",
    },
    trucks: {
      search: "",
    },
    trailers: {
      search: "",
    },
    driverRates: {
      search: "",
    },
    subcontractors: {
      search: "",
      status: "all",
      driverStatus: "all", // all, active, disabled
    },
    clientRates: {
      search: "",
    },
    suppliers: {
      search: "",
      status: "all",
    },
    expenseTypes: {
      search: "",
    },
  },

  // Driver rate periods view (edit route → card-based period editor)
  showDriverRatePeriods: false,
  editingRoute: { startingpoint: "", destination: "" },
  driverRatePeriods: [],
  routeLegDates: [],

  // Form States
  showEmployeeForm: false,
  showClientForm: false,
  showTruckForm: false,
  showTrailerForm: false,
  showDriverRateForm: false,
  showSubcontractorForm: false,
  showClientRateForm: false,
  showSupplierForm: false,
  showExpenseTypeForm: false,
  showCompanyForm: false,

  // Edit States
  editingEmployeeId: null,
  editingClientId: null,
  editTruckId: null,
  editTrailerId: null,
  editingRateId: null,
  subcontractorId: null,
  isEditing: false,
  isEditingRate: false,
  isEditMode: false,
  editingClientRateId: null,
  editingSupplierId: null,
  editingExpenseTypeId: null,
  editingCompanyId: null,

  // Form Data
  newEmployee: {
    name: "",
    surname: "",
    telephonenum: "",
    cellnum: "",
    employeenum: "",
    roleid: "",
    email: "",
    password: "",
    base_salary: "",
    documents: [],
    existingDocuments: [],
    income_tax_rate: "",
    deduction_other_deductions: "",
    deduction_uif: "",
    deduction_bonus: "",
    deduction_savings: "",
    deduction_loan: "",
    deduction_damage: "",
  },

  newClient: {
    client: "",
    representative: "",
    companyaddress: "",
    suburb: "",
    postalcode: "",
    email: "",
    client_reg_num: "",
    cellnum: "",
    vatregno: "",
    city: "",
    streetaddress: "",
    payment_type: "",
    starting_point: "",
    destination: "",
    driver_six_meter_rate: "",
    driver_twelve_meter_rate: "",
  },

  newTruck: {
    truckregnum: "",
    trailersize: "",
    truckpurchasedate: "",
    year: "",
    model: "",
    purchase_price: "",
    current_evaluation: "",
    vin_num: "",
    truck_license_expiry: "",
    is_subcontractor: false,
    documents: [],
    existingDocuments: [],
  },

  newTrailer: {
    trailerregnum: "",
    trailersize: "",
    trailerpurchasedate: "",
    year: "",
    model: "",
    purchase_price: "",
    current_evaluation: "",
    vin_num: "",
    trailer_license_expiry: "",
    is_subcontractor: false,
    documents: [],
    existingDocuments: [],
  },

  newDriverRate: {
    startingpoint: "",
    destination: "",
    driver_six_meter_rate: "",
    driver_twelve_meter_rate: "",
    subie_six_meter_rate: "",
    subie_twelve_meter_rate: "",
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: "",
  },

  newSubcontractor: {
    companyname: "",
    location: "",
    contact_person: "",
    cellnum: "",
    email: "",
    subei_reg_num: "",
    no_of_trucks: 1,
    drivers: [],
    trucks: [],
    driverCurrentPage: 1,
    driversPerPage: 10,
  },

  newClientRate: {
    clientId: null,
    clientName: "",
    rates: [
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
      },
    ],
  },

  newSupplier: {
    supplier: "",
    representative: "",
    address: "",
    suburb: "",
    postalcode: "",
    email: "",
    cellnum: "",
    vatregno: "",
    city: "",
    streetaddress: "",
    payment_type: "",
    expenseTypes: [],
  },

  newExpenseType: {
    expense: "",
  },

  newCompany: {
    companyname: "",
    company_reg_num: "",
    cell_num2: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch: "",
    branch_code: "",
    address: "",
    suburb: "",
    swift_code: "",
    cluster_box: "",
  },

  // Alert
  showAlert: false,
  alertMessage: "",
}

// Reducer
function manageReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload }

    case "SET_LOADING":
      return { ...state, loading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "SET_DATA":
      return { ...state, [action.payload.type]: action.payload.data }

    case "SET_PAGINATION":
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [action.payload.type]: {
            ...state.pagination[action.payload.type],
            ...action.payload.data,
          },
        },
      }

    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.type]: {
            ...state.filters[action.payload.type],
            [action.payload.field]: action.payload.value,
          },
        },
      }

    case "RESET_PAGINATION":
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [action.payload]: {
            ...initialState.pagination[action.payload],
          },
        },
      }

    case "SHOW_FORM":
      return { ...state, [action.payload]: true }

    case "HIDE_FORM":
      return {
        ...state,
        [action.payload]: false,
        // Reset editing states when hiding forms
        ...(action.payload === "showEmployeeForm" && { editingEmployeeId: null }),
        ...(action.payload === "showClientForm" && { editingClientId: null, isEditing: false }),
        ...(action.payload === "showTruckForm" && { editTruckId: null }),
        ...(action.payload === "showTrailerForm" && { editTrailerId: null }),
        ...(action.payload === "showDriverRateForm" && { editingRateId: null, isEditingRate: false }),
        ...(action.payload === "showSubcontractorForm" && { subcontractorId: null, isEditMode: false }),
        ...(action.payload === "showClientRateForm" && { editingClientRateId: null }),
        ...(action.payload === "showSupplierForm" && { editingSupplierId: null }),
        ...(action.payload === "showExpenseTypeForm" && { editingExpenseTypeId: null }),
        ...(action.payload === "showCompanyForm" && { editingCompanyId: null }),
      }

    case "SET_EDITING":
      return {
        ...state,
        [`editing${action.payload.type}Id`]: action.payload.id,
        ...(action.payload.type === "Client" && { isEditing: !!action.payload.id }),
        ...(action.payload.type === "Rate" && { isEditingRate: !!action.payload.id }),
        ...(action.payload.type === "Subcontractor" && {
          subcontractorId: action.payload.id,
          isEditMode: !!action.payload.id,
        }),
        ...(action.payload.type === "Truck" && { editTruckId: action.payload.id }),
        ...(action.payload.type === "Trailer" && { editTrailerId: action.payload.id }),
        ...(action.payload.type === "ClientRate" && { editingClientRateId: action.payload.id }),
        ...(action.payload.type === "Supplier" && { editingSupplierId: action.payload.id }),
        ...(action.payload.type === "ExpenseType" && { editingExpenseTypeId: action.payload.id }),
        ...(action.payload.type === "Company" && { editingCompanyId: action.payload.id }),
      }

    case "UPDATE_FORM_DATA":
      return {
        ...state,
        [`new${action.payload.type}`]: {
          ...state[`new${action.payload.type}`],
          ...action.payload.data,
        },
      }

    case "RESET_FORM_DATA":
      return {
        ...state,
        [`new${action.payload}`]: initialState[`new${action.payload}`],
      }

    case "SHOW_ALERT":
      return { ...state, showAlert: true, alertMessage: action.payload }

    case "HIDE_ALERT":
      return { ...state, showAlert: false, alertMessage: "" }

    // Driver rate periods (card-based edit view)
    case "SHOW_DRIVER_RATE_PERIODS":
      return {
        ...state,
        showDriverRatePeriods: true,
        editingRoute: action.payload.route,
        driverRatePeriods: action.payload.periods,
        routeLegDates: action.payload.legDates,
      }

    case "HIDE_DRIVER_RATE_PERIODS":
      return {
        ...state,
        showDriverRatePeriods: false,
        editingRoute: { startingpoint: "", destination: "" },
        driverRatePeriods: [],
        routeLegDates: [],
      }

    case "ADD_PERIOD_CARD":
      return {
        ...state,
        driverRatePeriods: [
          ...state.driverRatePeriods,
          {
            m5ratekey: null,
            effective_from: "",
            effective_to: "",
            driver_six_meter_rate: "",
            driver_twelve_meter_rate: "",
            subie_six_meter_rate: "",
            subie_twelve_meter_rate: "",
            _overlapWarning: null,
          },
        ],
      }

    case "REMOVE_PERIOD_CARD":
      return {
        ...state,
        driverRatePeriods: state.driverRatePeriods.filter((_, i) => i !== action.payload),
      }

    case "UPDATE_PERIOD_CARD":
      return {
        ...state,
        driverRatePeriods: state.driverRatePeriods.map((card, i) =>
          i === action.payload.index
            ? { ...card, [action.payload.field]: action.payload.value }
            : card,
        ),
      }

    default:
      return state
  }
}

// Custom hook
export function useManageState() {
  const [state, dispatch] = useReducer(manageReducer, initialState)

  const actions = {
    setActiveTab: useCallback((tab) => {
      dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
    }, []),

    setLoading: useCallback((loading) => {
      dispatch({ type: "SET_LOADING", payload: loading })
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: "SET_ERROR", payload: error })
    }, []),

    setData: useCallback((type, data) => {
      dispatch({ type: "SET_DATA", payload: { type, data } })
    }, []),

    setPagination: useCallback((type, data) => {
      dispatch({ type: "SET_PAGINATION", payload: { type, data } })
    }, []),

    setFilter: useCallback((type, field, value) => {
      dispatch({ type: "SET_FILTER", payload: { type, field, value } })
    }, []),

    resetPagination: useCallback((type) => {
      dispatch({ type: "RESET_PAGINATION", payload: type })
    }, []),

    showForm: useCallback((formType) => {
      dispatch({ type: "SHOW_FORM", payload: formType })
    }, []),

    hideForm: useCallback((formType) => {
      dispatch({ type: "HIDE_FORM", payload: formType })
    }, []),

    setEditing: useCallback((type, id) => {
      dispatch({ type: "SET_EDITING", payload: { type, id } })
    }, []),

    updateFormData: useCallback((type, data) => {
      dispatch({ type: "UPDATE_FORM_DATA", payload: { type, data } })
    }, []),

    resetFormData: useCallback((type) => {
      dispatch({ type: "RESET_FORM_DATA", payload: type })
    }, []),

    showAlert: useCallback((message) => {
      dispatch({ type: "SHOW_ALERT", payload: message })
    }, []),

    hideAlert: useCallback(() => {
      dispatch({ type: "HIDE_ALERT" })
    }, []),

    // Driver rate periods actions
    showPeriods: useCallback((startingpoint, destination, periods, legDates = []) => {
      dispatch({
        type: "SHOW_DRIVER_RATE_PERIODS",
        payload: { route: { startingpoint, destination }, periods, legDates },
      })
    }, []),

    hidePeriods: useCallback(() => {
      dispatch({ type: "HIDE_DRIVER_RATE_PERIODS" })
    }, []),

    addPeriodCard: useCallback(() => {
      dispatch({ type: "ADD_PERIOD_CARD" })
    }, []),

    removePeriodCard: useCallback((index) => {
      dispatch({ type: "REMOVE_PERIOD_CARD", payload: index })
    }, []),

    updatePeriodCard: useCallback((index, field, value) => {
      dispatch({ type: "UPDATE_PERIOD_CARD", payload: { index, field, value } })
    }, []),
  }

  return { state, actions }
}