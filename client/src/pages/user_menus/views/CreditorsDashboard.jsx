"use client";

import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const creditorsDashboardData = [
  { title: "Fuel", image: "/images/expenses.jpeg", path: "/FuelPage" },
  {
    title: "Subcontractors",
    image: "/images/subconstructor.jpg",
    path: "/Creditors/SubcontractorList",
  },
  { title: "Payroll", image: "/images/wages.jpeg", path: "/finance-clerk-wage" },
  {
    title: "Other Expenses",
    image: "/images/OtherExpence.jpg",
    path: "/Creditors/CreditorsOther",
  },
    {
    title: "Credit Note",
    image: "/images/crednote.jpg", // add an appropriate image
    path: "/CredClientList",  // path to your Credit Note page
  },
];

const CreditorsDashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage") {
      localStorage.setItem("dashboardRoute", "/CreditorsDashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {creditorsDashboardData.slice(0, 3).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {creditorsDashboardData.slice(3, 5).map((item) => (
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

export default CreditorsDashboard;
