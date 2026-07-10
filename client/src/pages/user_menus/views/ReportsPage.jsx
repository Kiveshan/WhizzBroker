"use client"
import { useNavigate } from "react-router-dom"
import Card from "../../../components/Card"
import "../css/card.css"
import "../css/dashboard.css"

const reportsData = [
  {
    title: "Wage Reports",
    image: "/images/reports.jpg", // Update with the correct image path
    path: "/wage-reports", // Define the path for Wage Reports
  },
  {
    title: "Income & Expenditure",
    image: "/images/reports.jpg",
    path: "/profit-loss-reports",
  },
  {
    title: "Client Subbie Commission",
    image: "/images/reports.jpg",
    path: "/client-subbie-commission",
  },
  {
    title: "VAT Recon",
    image: "/images/reports.jpg",
    path: "/vat-recon-reports",
  },
]

const ReportsPage = () => {
  const navigate = useNavigate()

  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleBack = () => {
    // Navigate back to AnalyticsReportsPage
    navigate("/analytics-reports")
  }

  return (
    <div className="dashboard">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="dashboard-row">
        {reportsData.map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
    </div>
  )
}

export default ReportsPage