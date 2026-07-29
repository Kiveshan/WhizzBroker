import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import { dashboardRouteForRole } from "../../../utils/dashboardRoute";

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
          onClick={() => navigate(dashboardRouteForRole())}
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
