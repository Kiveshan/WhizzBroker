"use client";
import { useNavigate } from "react-router-dom";
import { useEffect,useState } from "react";
import Card from "../../../components/Card";
import "../css/card.css";
import "../css/dashboard.css";

const analyticsReportsData = [
  {
    title: "Analytics",
    image: "/images/ana.jpg",
    path: "/DirectorAnalytics",
  },
  {
    title: "Reports",
    image: "/images/rep.jpg",
    path: "/reports",
  },
];

const AnalyticsReportsPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  // Fetch user role from localStorage on mount
  useEffect(() => {
    const roleId = localStorage.getItem("userRoleId");
    console.log("Retrieved userRoleId:", roleId, "Type:", typeof roleId); // Debugging
    setUserRole(roleId ? parseInt(roleId) : null);
  }, []);

  const getDashboardRouteByRole = () => {
    // Check stored dashboard route first
    const storedDashboard = localStorage.getItem("dashboardRoute");
    if (storedDashboard) {
      console.log("Using stored dashboardRoute:", storedDashboard); // Debugging
      return storedDashboard;
    }

    // Fallback to role-based routing
    switch (userRole) {
      case 1:
        return "/Dashboard";
      case 4:
        return "/DirectorDashboard";
      default:
        console.log("Defaulting to /Dashboard, userRole:", userRole); // Debugging
        return "/Dashboard";
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBack = () => {
    const dashboardRoute = getDashboardRouteByRole();
    console.log("Navigating to:", dashboardRoute); // Debugging
    navigate(dashboardRoute);
  };

  return (
    <div className="dashboard">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="dashboard-row">
        {analyticsReportsData.map((item) => (
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

export default AnalyticsReportsPage;