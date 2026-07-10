"use client";

import { useState } from "react";
import UserApprovalList from "./UserApprovalList";
import CompanyManagement from "./CompanyManagement";
import SubcontractorBackfill from "./SubcontractorBackfill";
import DriverRateAudit from "./DriverRateAudit";
import AuditLogViewer from "./AuditLogViewer";
import "../css/AdminDashboard.css";
// Import the TestConnection component
// import TestConnection from "./TestConnection"

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  // Add a state to control showing the test connection
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        {/* <h1>System Administration</h1> */}
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            User Approval
          </button>
          <button
            className={`tab-button ${
              activeTab === "companies" ? "active" : ""
            }`}
            onClick={() => setActiveTab("companies")}
          >
            Company Management
          </button>
          <button
            className={`tab-button ${
              activeTab === "backfill" ? "active" : ""
            }`}
            onClick={() => setActiveTab("backfill")}
          >
            Statement Backfill
          </button>
          <button
            className={`tab-button ${
              activeTab === "rate-audit" ? "active" : ""
            }`}
            onClick={() => setActiveTab("rate-audit")}
          >
            Driver Rate Audit
          </button>
          <button
            className={`tab-button ${
              activeTab === "audit-log" ? "active" : ""
            }`}
            onClick={() => setActiveTab("audit-log")}
          >
            Audit Log
          </button>
        </div>

        <div className="admin-content">
          {activeTab === "users" && <UserApprovalList />}
          {activeTab === "companies" && <CompanyManagement />}
          {activeTab === "backfill" && <SubcontractorBackfill />}
          {activeTab === "rate-audit" && <DriverRateAudit />}
          {activeTab === "audit-log" && <AuditLogViewer />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
