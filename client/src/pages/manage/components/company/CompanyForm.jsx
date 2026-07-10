"use client"
import "../../css/Manage.css"

const CompanyForm = ({ company, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }
    const success = await onSave(company)
    if (!success) {
      return
    }
  }

  return (
    <div className="manage-container">
      <form onSubmit={handleSubmit} className="manage-driver-rate-form company-form" noValidate>
        <h2 className="manage-form-title">{isEditing ? "Edit Company Details" : "Company Details"}</h2>
        <div className="manage-form-group">
          <div className="form-row company-form-row">
            <div className="form-field">
              <label>
                <strong>Company Name *</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.companyname || ""}
                onChange={(e) => onChange("companyname", e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Company Reg Number *</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.company_reg_num || ""}
                onChange={(e) => onChange("company_reg_num", e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Contact Number</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.cell_num2 || ""}
                onChange={(e) => onChange("cell_num2", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>VAT Reg Number</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.vat_reg_num || ""}
                onChange={(e) => onChange("vat_reg_num", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row company-form-row">
            <div className="form-field">
              <label>
                <strong>Account Number</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.account_num || ""}
                onChange={(e) => onChange("account_num", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Name on Account</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.name_of_acc || ""}
                onChange={(e) => onChange("name_of_acc", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Bank</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.bank || ""}
                onChange={(e) => onChange("bank", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Branch</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.branch || ""}
                onChange={(e) => onChange("branch", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row company-form-row">
            <div className="form-field">
              <label>
                <strong>Branch Code</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.branch_code || ""}
                onChange={(e) => onChange("branch_code", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Address</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.address || ""}
                onChange={(e) => onChange("address", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Suburb</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.suburb || ""}
                onChange={(e) => onChange("suburb", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>
                <strong>Swift Code</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.swift_code || ""}
                onChange={(e) => onChange("swift_code", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row company-form-row">
            <div className="form-field">
              <label>
                <strong>Cluster Box</strong>
              </label>
              <input
                type="text"
                className="form-input"
                value={company.cluster_box || ""}
                onChange={(e) => onChange("cluster_box", e.target.value)}
              />
            </div>
            <div className="form-field"></div>
            <div className="form-field"></div>
            <div className="form-field"></div>
          </div>
        </div>
   <div className="company-button-container">
        <button type="submit" className="company-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" className="company-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      </form>
    </div>
  )
}

export default CompanyForm