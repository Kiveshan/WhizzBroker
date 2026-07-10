import React from "react";
import Card from "../../../components/Card";
import { useNavigate } from "react-router-dom";
import "../css/controllerDashboard.css";

const dashboardData = [
  {
    title: "New Instruction",
    image: "/images/newinstruction.jpeg",
    path: "/ControllerInstructions",
  },
  {
    title: "Track Instruction",
    image: "/images/trackinstruction.jpg",
    path: "/CompanyInstructionView",
  },
];

const ControllerDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
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
        {dashboardData.slice(3, 5).map((item) => (
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

export default ControllerDashboard;
