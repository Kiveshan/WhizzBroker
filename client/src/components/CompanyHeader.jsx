import "../pages/Creditors/purchaseOrder/css/PO.css";

import { useEffect, useState } from "react";
import api from "../api";

const CompanyHeader = ({ subtitle }) => {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await api.get("/api/companies");
        setCompany(response.data);
      } catch (error) {
        console.error("Error fetching company details:", error);
        setCompany(null);
      }
    };

    fetchCompany();
  }, []);

  const companyName = company?.companyname || "";
  const clusterBox = company?.cluster_box || "";
  const suburb = company?.suburb || "";
  const address = company?.address || "";
  const cell = company?.cell_num || company?.cell_num2 || "";
  const tel = company?.cell_num2 || "";
  const email = company?.email || "";
  const vatRegNum = company?.vat_reg_num || "";
  const regNum = company?.company_reg_num || "";

  return (
    <>
    <div className="po-form-wrapper">
      <div className="po-header">
        <div className="po-header-left">
          <div className="po-title-container">
            <h1 className="po-title">{companyName}</h1>
            {subtitle && <h2 className="po-subtitle">{subtitle}</h2>}
          </div>
        </div>
      </div>

      <div className="company-details">
        <div className="company-address">
          {clusterBox}
          <br />
          {suburb}
          <br />
          {address}
          <br />
          {""}
        </div>
        <div className="company-contact">
          Tel: {tel}
          <br />
          Cell: {cell}
          <br />
          {/* E-mail: {email} */}
        </div>
      </div>

      <div className="company-registration">
        VAT Reg No: {vatRegNum}
        <br />
        Reg: {regNum}
      </div>
      </div>
    </>
  );
};

export default CompanyHeader;