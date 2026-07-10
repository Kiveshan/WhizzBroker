import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const dashboardData = [
  {
    title: "Fuel",
    image: "/images/Diesel.jpeg",
    path: "/DirectorManagerViewFuelExpense",
  },
  {
    title: "Subcontractors",
    image: "/images/subconstructor.jpg",
    path: "/Creditors/SubcontractorList",
  },
  {
    title: "Other",
    image: "/images/OtherExpence.jpg",
    path: "/DirectorCreditorsOther",
  },
];

const DirectorCreditorsDash = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* Back Button */}
      <div className="client-payments-header">
        <button
          className="back-button"
          onClick={() => {
            // Try to get the user data from localStorage
            const userData = localStorage.getItem("user");
            let userRoleId = null;

            if (userData) {
              try {
                // Parse the user data and get the role ID
                const parsedUserData = JSON.parse(userData);
                userRoleId = parsedUserData.roleid;
                console.log("User role from localStorage:", userRoleId);
              } catch (error) {
                console.error(
                  "Error parsing user data from localStorage:",
                  error
                );
              }
            }

            // If we couldn't get the role ID from user data, try direct roleId
            if (!userRoleId) {
              userRoleId =
                localStorage.getItem("roleId") ||
                localStorage.getItem("userRoleId");
              console.log("Direct role ID from localStorage:", userRoleId);
            }

            // Convert to number if it's a string
            userRoleId = Number.parseInt(userRoleId, 10);
            console.log("Final user role ID for navigation:", userRoleId);

            // Navigate based on role ID
            if (userRoleId === 1) {
              // Business Manager goes to Dashboard
              navigate("/Dashboard");
            } else {
              // Director or other roles go to DirectorDashboard
              navigate("/DirectorDashboard");
            }
          }}
        >
          Back
        </button>
      </div>
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3, 6).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default DirectorCreditorsDash;
