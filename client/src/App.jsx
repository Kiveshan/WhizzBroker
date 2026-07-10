"use client";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import TokenExpiryNotification from "./components/TokenExpiryNotification";
import Header from "./components/Header";
import Footer from "./components/Footer"; // Import the Footer component
import LogoutButton from "./components/LogoutButton";
import LandingPage from "./pages/user_menus/views/LandingPage";
import { RequireAuth, RoleGuard } from "./components/ProtectedRoute";

// Import pages
import {
  ControllerDashboard,
  FDashboard,
  DirectorDashboard,
  Dashboard,
  Debtors,
  DirectorDebtors,
  DirectorCreditorsDash,
  DebtorsDashboard,
  DirectorCreditorsOther,
  CreditorsOther,
  CreditorsDashboard,
  AnalyticsReportsPage,
  ReportsPage,
} from "./pages/user_menus";
import { Login, Register } from "./pages/auth";
import {
  ControllerInstructions,
  ControllerInstructionDetails,
  FCcontrollerinstructions,
  ViewClientInstruction,
  Viewcontrollerinstructions,
  FCcontrollerInstructionDetails,
  ViewcontrollerInstructionDetails,
  CompanyInstructions,
  CompanyInstructionView,
  InstructionsList,
} from "./pages/instructions";
import {
  ViewExpense,
  ExpenseDetails,
  ExpenseSubmission,
  DirectorManagerViewFuelExpense,
  DirectorExpenses,
} from "./pages/fuel";
import { DirectorAnalytics } from "./pages/analytics";
import Manage from "./pages/manage/views/Manage";
import {
  ViewClientInvoice,
  InvoicesList,
  ClientInvoice,
} from "./pages/invoices";
import {
  ViewClientStatement,
  StatementsList,
  ClientStatement,
} from "./pages/statements";
import {
  DirectorFinancialDocumentsView,
  DirectorClientDocuments,
  ClientDocuments,
  FinancialDocumentsView,
} from "./pages/financial_documents";
import {
  FinanceClerkWage,
  FinanceClerkWageDetails,
  FClerkLegDetails,
  FinanceClerkWageSlip,
} from "./pages/wages";
import {
  DirectorClientListPay,
  DirectorClientPaymentList,
  ClientPayments,
  ClientListPay,
  UploadProof,
} from "./pages/payments";
import {
  UpdateInstruction,
  DirectorManagerViewAssignment,
  UploadInstructionDocuments,
  DirectorDocs,
} from "./pages/assignments";
import { AdminDashboard } from "./pages/admin";

// Finance Clerk Pages
import {
  CreatePO,
  POForm,
  FilterPO,
  ViewPOForm,
  CredStatements,
  ViewStatement,
  SubcontractorList,
  SubcontractorStatements,
  SubcontractorStatementDetails,
  CredClientList,
  CreditNoteList,
  CreditNoteForm,
  CreditNoteView,
} from "./pages/Creditors";

import { ClientList, AddOnList, AddOnForm } from "./pages/add-ons";
import DebtorsAgeAnalysis from "./pages/debtors/views/DebtorsAgeAnalysis";
import {
  WageReports,
  ProfitLossReportsPage,
  ProfitLossDetailPage,
  ClientSubbieCommissionReport,
  VatReconReportPage,
} from "./pages/Reports";

// CSS Imports
import "./css/components.css";
import "./css/layout.css";
import "./css/MonitorInstructions.css";

function DynamicHeader() {
  const location = useLocation();
  const titleMap = {
    "/Dashboard": "Business Manager",
    "/client-payments": "Client Payments",
    "/client-list-payments": "Client Payments",
    "/director-client-list-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Payroll",
    "/ControllerInstructions": "Instruction",
    "/ControllerInstructionDetails": "Container Details",
    "/FCcontrollerInstructionDetails": "Container Details",
    "/expenses": "Truck Expenses",
    "/debtors": "Debtors",
    "/debtors-age-analysis": "Age Analysis",
    "/FDashboard": "Debtors Clerk",
    "/instructions": "Instruction",
    "/update-instructions": "Assignment",
    "/Upload-Instruction-Documents": "Instruction Documents",
    "/invoices": "Invoices",
    "/client-invoice": "Invoices",
    "/view-client-statements": "Statements",
    "/statements-list": "Statements",
    "/client-statement": "Statements",
    "/wages": "Payroll",
    "/finance-clerk-wage": "Payroll",
    "/finance-clerk-wage-details": "Payroll",
    "/finance-clerk-wage-slip": "Payroll",
    "/ViewExpense": "Fuel Expenses",
    "/ExpenseDetails": "Fuel Expenses",
    "/ExpenseSubmission": "Expense",
    "/manage":                            "Manage",
    "/ViewClientInstruction": "Clients",
    "/ViewClientInvoice": "Invoice",
    "/DebtorsDashboard": "Debtors",
    "/CreditorsDashboard": "Creditors",
    "/FuelPage": "Fuel",
    "/DirectorDashboard": "Director",
    "/FClerkLegDetails": "Payroll",
    "/ManagerViewAssignment": "View Assignment",
    "/FinancialDocumentsView": "Client Documents",
    "/Creditors/PurchaseOrders": "Purchase Orders",
    "/CompanyInstructionView": "Instruction ",
    "/CompanyInstructions": "Instruction ",
    "/Creditors/CreditorsOther": "Creditors",
    "/DirectorManagerViewAssignment": "View Assignment",
    "/DirectorDocs": "Documents",
    "/DirectorAnalytics": "Analytics",
    "/DirectorDebtors": "Debtors",
    "/DirectorClientPaymentList": "Debtors",
    "/DirectorFinancialDocumentsView": "Client Documents",
    "/DirectorClientDocuments": "Client Documents",
    "/DirectorCreditorsDash": "Creditors",
    "/DirectorManagerViewFuelExpense": "Truck Expenses",
    "/DirectorCreditorsOther": "Expenses",
    "/DirectorExpenses": "Truck Expenses",
    "/ControllerDashboard": "Controller",
    "/FCcontrollerinstructions": "Instruction",
    "/Viewcontrollerinstructions": "Instruction",
    "/ViewcontrollerInstructionDetails": "Container Details",
    "/AdminDashboard": "Admin",
    "/Creditors/CreatePO": "Expenses",
    "/Creditors/POForm": "Purchase Order",
    "/Creditors/PurchaseOrder/View": "Purchase Order",
    "/Creditors/CredStatements": "Purchase Orders",
    "/Creditors/ViewStatement": "Statement of Expenses",
    "/Creditors/SubcontractorList": "Subcontractors",
    "/Creditors/SubcontractorStatements": "Subcontractors",
    "/Creditors/SubcontractorStatementDetails": "Subcontractor Statement",
    "/analytics-reports": "Insights",
    "/reports": "Reports",
    "/wage-reports": "Wage Reports",
    "/view-client-list": "Add On's",
    "/view-add-on-list": "Add On's",
    "/add-on-form": "Add On's",
    "/CredClientList": "Clients",
    "/credit-note-list": "Credit Notes",
    "/credit-note-form": "Credit Note Form",
    "/view-credit-note/:clientName/:creditNoteId": "Credit Note",
    "/profit-loss-reports": "Income & Expenditure Reports",
    "/income-expenditure-reports/:month/:year": "Income & Expenditure Report",
    "/client-subbie-commission": "Client Subbie Commission Report",
    "/vat-recon-reports": "VAT Reconciliation Report",
  };

  const getTitle = () => {
    if (location.pathname.startsWith("/upload"))
      return "Upload Proof of Payment";
    if (location.pathname.startsWith("/invoice/")) return "Tax Invoice";
    if (location.pathname.startsWith("/ExpenseDetails/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-details/"))
      return "Payroll";
    if (location.pathname.startsWith("/DirectorExpenses/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-slip/"))
      return "Payroll";
    if (location.pathname.startsWith("/view-credit-note/"))
      return "Credit Note";
    if (location.pathname.startsWith("/income-expenditure-reports/"))
      return "Income & Expenditure Report";
    if (location.pathname === "/vat-recon-reports")
      return "VAT Reconciliation Report";
    return titleMap[location.pathname] || "Unknown Page";
  };

  if (
    ["/login", "/register", "/", "/new-landing"].includes(location.pathname)
  ) {
    return null;
  }

  return <Header title={getTitle()} />;
}

function ContentWrapper() {
  const location = useLocation();
  const hideFooterOn = ["/login", "/register", "/"]; // hide global footer on landing
  const hideLogoutOn = ["/login", "/register", "/landing", "/new-landing", "/"]; // hide logout on landing
  const shouldShowFooter = !hideFooterOn.includes(location.pathname);
  const shouldShowLogout = !hideLogoutOn.includes(location.pathname);

  // Only show inline Back button for specific detail routes
  const isInvoiceDetail =
    location.pathname.startsWith("/invoice/") ||
    location.pathname === "/client-invoice";
  const isStatementDetail = location.pathname === "/client-statement";
  const isClientSubbieReport = location.pathname === "/client-subbie-commission";

  const showBackInTopBar =
    isInvoiceDetail || isStatementDetail || isClientSubbieReport;

  const getBackTarget = () => {
    if (isInvoiceDetail) return "/invoices";
    if (isStatementDetail) return "/statements-list";
    if (isClientSubbieReport) return "/reports";
    return null;
  };

  const backTarget = getBackTarget();

  return (
    <div className="content-area">
      {shouldShowLogout && (
        showBackInTopBar ? (
          <div className="top-actions-bar">
            {backTarget && (
              <button
                className="back-button-inline"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else if (backTarget) {
                    window.location.href = backTarget;
                  }
                }}
              >
                Back
              </button>
            )}
            <div className="logout-container">
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div className="logout-container">
            <LogoutButton />
          </div>
        )
      )}
      <Routes>
        {/* ---------- Public (pre-auth) routes ---------- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ---------- Authenticated routes (require a valid session) ---------- */}
        {/* RequireAuth = logged in; RoleGuard = enforces the ROUTE_ROLES matrix. */}
        <Route element={<RequireAuth />}>
        <Route element={<RoleGuard />}>
        <Route
          path="/view-credit-note/:clientName/:creditNoteId"
          element={<CreditNoteView />}
        />
        <Route path="/credit-note-form" element={<CreditNoteForm />} />
        <Route path="/credit-note-list" element={<CreditNoteList />} />
        <Route path="/CredClientList" element={<CredClientList />} />
        <Route path="/client-payments" element={<ClientPayments />} />
        <Route path="/client-list-payments" element={<ClientListPay />} />
        <Route
          path="/director-client-list-payments"
          element={<DirectorClientListPay />}
        />
        <Route path="/client-documents" element={<ClientDocuments />} />
        <Route path="/upload/:clientName" element={<UploadProof />} />
        <Route
          path="/upload-proof/:clientName/:paymentId?"
          element={<UploadProof />}
        />
        <Route path="/debtors" element={<Debtors />} />
        <Route path="/debtors-age-analysis" element={<DebtorsAgeAnalysis />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/ControllerDashboard" element={<ControllerDashboard />} />
        <Route path="/DirectorDashboard" element={<DirectorDashboard />} />
        <Route
          path="/ControllerInstructions"
          element={<ControllerInstructions />}
        />
        <Route
          path="/ControllerInstructionDetails"
          element={<ControllerInstructionDetails />}
        />
        <Route
          path="/FinancialDocumentsView"
          element={<FinancialDocumentsView />}
        />
        <Route
          path="/CompanyInstructionView"
          element={<CompanyInstructionView />}
        />
        <Route
          path="/DirectorCreditorsOther"
          element={<DirectorCreditorsOther />}
        />
        <Route path="/CompanyInstructions" element={<CompanyInstructions />} />
        <Route
          path="/DirectorManagerViewAssignment"
          element={<DirectorManagerViewAssignment />}
        />
        <Route path="/DirectorDocs" element={<DirectorDocs />} />
        <Route path="/DirectorAnalytics" element={<DirectorAnalytics />} />
        <Route path="/DirectorDebtors" element={<DirectorDebtors />} />
        <Route
          path="/DirectorClientPaymentList"
          element={<DirectorClientPaymentList />}
        />
        <Route
          path="/DirectorFinancialDocumentsView"
          element={<DirectorFinancialDocumentsView />}
        />
        <Route
          path="/DirectorClientDocuments"
          element={<DirectorClientDocuments />}
        />
        <Route
          path="/DirectorCreditorsDash"
          element={<DirectorCreditorsDash />}
        />
        <Route
          path="/DirectorManagerViewFuelExpense"
          element={<DirectorManagerViewFuelExpense />}
        />
        <Route
          path="/DirectorExpenses/:truckId"
          element={<DirectorExpenses />}
        />
        <Route
          path="/Viewcontrollerinstructions"
          element={<Viewcontrollerinstructions />}
        />
        <Route
          path="/ViewcontrollerInstructionDetails"
          element={<ViewcontrollerInstructionDetails />}
        />
        {/* Admin-only (gated by ROUTE_ROLES via RoleGuard) */}
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
        {/* Finance Clerk Routes */}
        <Route path="/instructions" element={<InstructionsList />} />
        <Route path="/update-instructions" element={<UpdateInstruction />} />
        <Route
          path="/Upload-Instruction-Documents"
          element={<UploadInstructionDocuments />}
        />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route
          path="/view-client-statements"
          element={<ViewClientStatement />}
        />
        <Route path="/statements-list" element={<StatementsList />} />
        <Route path="/client-invoice" element={<ClientInvoice />} />
        <Route path="/FDashboard" element={<FDashboard />} />
        <Route path="/finance-clerk-wage" element={<FinanceClerkWage />} />
        <Route
          path="/finance-clerk-wage-details/:userid"
          element={<FinanceClerkWageDetails />}
        />
        <Route
          path="/finance-clerk-wage-slip/:id"
          element={<FinanceClerkWageSlip />}
        />
        <Route path="/client-statement" element={<ClientStatement />} />
        <Route path="/ViewExpense" element={<ViewExpense />} />
        <Route path="/ExpenseDetails/:truckId" element={<ExpenseDetails />} />
        <Route path="/ExpenseSubmission" element={<ExpenseSubmission />} />
        <Route
          path="/ViewClientInstruction"
          element={<ViewClientInstruction />}
        />
        <Route path="/ViewClientInvoice" element={<ViewClientInvoice />} />
        <Route path="/Creditors/CreditorsOther" element={<CreditorsOther />} />
        <Route path="/Creditors/CreatePO" element={<CreatePO />} />
        <Route path="/Creditors/POForm" element={<POForm />} />
        <Route path="/Creditors/PurchaseOrders" element={<FilterPO />} />
        <Route path="/Creditors/CredStatements" element={<CredStatements />} />
        <Route path="/Creditors/PurchaseOrder/View" element={<ViewPOForm />} />
        <Route path="/Creditors/ViewStatement" element={<ViewStatement />} />
        <Route
          path="/Creditors/SubcontractorList"
          element={<SubcontractorList />}
        />
        <Route
          path="/Creditors/SubcontractorStatementDetails"
          element={<SubcontractorStatementDetails />}
        />
        <Route
          path="/Creditors/SubcontractorStatements"
          element={<SubcontractorStatements />}
        />
        {/* Add the routes for invoice viewing and downloading */}
        <Route path="/invoice" element={<Navigate to="/invoices" replace />} />
        <Route path="/invoice/:id" element={<ClientInvoice />} />
        <Route path="/invoice/:id/download" element={<ClientInvoice />} />
        <Route path="/DebtorsDashboard" element={<DebtorsDashboard />} />
        <Route path="/CreditorsDashboard" element={<CreditorsDashboard />} />
        <Route path="/FuelPage" element={<ViewExpense />} />
        <Route path="/FClerkLegDetails" element={<FClerkLegDetails />} />
        <Route
          path="/FCcontrollerinstructions"
          element={<FCcontrollerinstructions />}
        />
        <Route
          path="/FCcontrollerInstructionDetails"
          element={<FCcontrollerInstructionDetails />}
        />
        <Route path="/analytics-reports" element={<AnalyticsReportsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/wage-reports" element={<WageReports />} />
        <Route
          path="/client-subbie-commission"
          element={<ClientSubbieCommissionReport />}
        />
        <Route path="/view-client-list" element={<ClientList />} />
        <Route path="/view-add-on-list" element={<AddOnList />} />
        <Route path="/add-on-form" element={<AddOnForm />} />
        <Route
          path="/profit-loss-reports"
          element={<ProfitLossReportsPage />}
        />
        <Route
          path="/income-expenditure-reports/:month/:year"
          element={<ProfitLossDetailPage />}
        />
        <Route
          path="/vat-recon-reports"
          element={<VatReconReportPage />}
        />
        </Route>
        </Route>
      </Routes>
      {shouldShowFooter && <Footer />} {/* Conditionally render footer */}
    </div>
  );
}

function App() {
  // Map of route paths to page titles
  const pageTitles = {
    "/": "Controller Dashboard",
    "/ControllerInstructions": "Controller Instructions",
    "/ControllerInstructionDetails": "Container Details",
    "/FDashboard": "Finance Clerk Dashboard",
    "/ViewClientInstruction": "View Client Instructions",
    "/FCcontrollerinstructions": "Finance Clerk Instructions",
    "/FCcontrollerInstructionDetails": "Finance Clerk Container Details",
    "/InstructionsList": "Instructions List",
    "/Viewcontrollerinstructions": "Viewcontrollerinstructions",
    "/ViewcontrollerInstructionDetails": "ViewcontrollerInstructionDetails",
    "/reports": "Reports",
    "/wage-reports": "Wage Reports",
    "/profit-loss-reports": "Income & Expenditure Reports",
    "/income-expenditure-reports/:month/:year": "Income & Expenditure Report",
    "/vat-recon-reports": "VAT Reconciliation Report",
  };

  // Set page title based on current route
  React.useEffect(() => {
    const path = window.location.pathname;
    document.title = pageTitles[path] || "Logistics App";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="container">
          <TokenExpiryNotification />
          <DynamicHeader />
          <ContentWrapper />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
