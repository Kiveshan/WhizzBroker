"use client";

import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const dashboardData = [
  {
    title: "Instructions",
    image: "/images/pexels-photo-7947758.jpeg",
    path: "/ViewClientInstruction",
  },
  { title: "Debtors", image: "/images/Payment.jpg", path: "/DebtorsDashboard" },
];

const FDashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage") {
      // Store the current dashboard route before navigating
      localStorage.setItem("dashboardRoute", "/FDashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 2).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(2, 6).map((item) => (
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

export default FDashboard;
