"use client"
import "../../css/Manage.css"
import "../../css/pagination.css"
import "../../css/additional-styles.css"

const CompanyTable = ({ company, loading, error, onEdit }) => {
  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      {loading ? (
        <div className="loading">Loading company details...</div>
      ) : (
        <>
          <div className="manage-DriverRates-table1">
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Registration Number</th>
                  <th>Contact Number</th>
                  <th>VAT Number</th>
                  <th>Bank</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {company && Object.keys(company).length > 0 ? (
                  <tr key={company.userid}>
                    <td>{company.companyname || "N/A"}</td>
                    <td>{company.company_reg_num || "N/A"}</td>
                    <td>{company.cell_num2 || "N/A"}</td>
                    <td>{company.vat_reg_num || "N/A"}</td>
                    <td>{company.bank || "N/A"}</td>
                    <td>{company.branch || "N/A"}</td>
                    <td>
                      <button className="manage-edit-button" onClick={() => onEdit()}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No company details found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default CompanyTable