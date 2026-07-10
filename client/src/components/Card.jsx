import React from "react";

const Card = ({ image, title, onClick }) => {
  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="card-image-container">
        <img src={image || "/placeholder.svg"} alt={title} />
      </div>
      <div className="card-title">
        <h3>{title}</h3>
      </div>
    </div>
  );
};

export default Card;

