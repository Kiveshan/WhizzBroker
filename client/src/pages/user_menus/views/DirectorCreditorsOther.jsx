"use client";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const otherCardData = [
  {
    title: "Purchase Orders",
    image: "/images/purchaseorders.jpg",
    path: "/Creditors/PurchaseOrders",
  },
  {
    title: "Creditors Statements",
    image: "/images/Statements.jpg",
    path: "/Creditors/CredStatements",
  },
    {
    title: "Credit Note",
    image: "/images/crednote.jpg", 
    path: "/CredClientList",       // Path to your Credit Note page
  },
];

const DirectorCreditorsOther = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBack = () => {
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
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    // If we couldn't get the role ID from user data, try direct roleId
    if (!userRoleId) {
      userRoleId =
        localStorage.getItem("roleId") || localStorage.getItem("userRoleId");
      console.log("Direct role ID from localStorage:", userRoleId);
    }

    // Convert to number if it's a string
    userRoleId = Number.parseInt(userRoleId, 10);
    console.log("Final user role ID for navigation:", userRoleId);

    navigate("/DirectorCreditorsDash");
  };

  return (
    <div className="dashboard">
      <div className="clients-payments-container">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>
      <div className="dashboard-row">
        {otherCardData.map((item) => (
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

export default DirectorCreditorsOther;
