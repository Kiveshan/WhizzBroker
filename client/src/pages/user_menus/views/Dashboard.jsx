import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import "../css/card.css";
import "../css/dashboard.css";
const dashboardData = [
  {
    title: "Instructions",
    image: "/images/monitor.jpeg",
    path: "/CompanyInstructionView",
  },
  { title: "Insights", image: "/images/analytics.jpg", path: "/analytics-reports" },
  { title: "Debtors", image: "/images/clientDocs.jpeg", path: "/debtors" },
  { title: "Payroll", image: "/images/wages.jpeg", path: "/finance-clerk-wage" },
  {
    title: "Creditors",
    image: "/images/expenses.jpeg",
    path: "/DirectorCreditorsDash",
  },
  { title: "Manage", image: "/images/manage.jpg", path: "/manage" },
  { title: "Analytics", image: "/images/analytics.jpg", path: "/DirectorAnalytics" },
];

const Dashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage" || path === "/analytics-reports") {
      localStorage.setItem("dashboardRoute", "/Dashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3, 6).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;