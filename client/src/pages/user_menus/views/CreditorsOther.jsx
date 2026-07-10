"use client";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
const otherCardData = [
  {
    title: "Create Purchase Orders",
    image: "/images/createpo.jpg",
    path: "/Creditors/CreatePO",
  },
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
];

const CreditorsOther = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="clients-payments-container">
        <button
          onClick={() => navigate("/CreditorsDashboard")}
          className="back-button"
        >
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

export default CreditorsOther;
