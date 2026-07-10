"use client";

import { useState, useEffect } from "react";
import styles from "../css/register.module.css"; // Updated to CSS Module
import { Eye, EyeOff } from "lucide-react";
import { validatePassword, getPasswordStrength } from "../../../utils/passwordValidator.js";

const Register = ({ switchToLogin, closePopup }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    companyname: "",
    company_reg_num: "",
    cluster_box: "",
    address: "",
    suburb: "",
    cellnum: "",
    cellnum2: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch: "",
    branch_code: "",
    swift_code: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
    valid: false,
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    let timer;
    if (showErrorPopup) {
      timer = setTimeout(() => {
        setShowErrorPopup(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showErrorPopup]);

  useEffect(() => {
    let timer;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        setShowSuccessPopup(false);
        closePopup();
        switchToLogin();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup, closePopup, switchToLogin]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const numericFields = [
      "cellnum",
      "cellnum2",
      "vat_reg_num",
      "account_num",
      "branch_code",
      "company_reg_num",
    ];

    if (numericFields.includes(name) && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    if (name === "swift_code" && value !== "") {
      const upperValue = value.toUpperCase();
      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
      }));
      return;
    }

    if (name === "password") {
      setPasswordStrength(getPasswordStrength(value));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
      setShowErrorPopup(false);
    }
  };

  const checkEmailExists = async (email) => {
    try {
      setIsCheckingEmail(true);
      const response = await fetch(
        `${API_BASE_URL}/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (data.exists) {
        setErrorMessage(
          "This email is already registered. Please use a different email or login."
        );
        setShowErrorPopup(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const validateSwiftCode = (code) => {
    if (!code) return true;
    if (code.length !== 8 && code.length !== 11) {
      return "SWIFT code must be either 8 or 11 characters long";
    }
    if (!/^[A-Z]{4}/.test(code)) {
      return "First 4 characters of SWIFT code must be letters";
    }
    if (!/^[A-Z]{4}[A-Z]{2}/.test(code)) {
      return "Characters 5-6 of SWIFT code must be letters (country code)";
    }
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}/.test(code)) {
      return "Characters 7-8 of SWIFT code must be letters or numbers";
    }
    if (
      code.length === 11 &&
      !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}$/.test(code)
    ) {
      return "Last 3 characters of SWIFT code must be letters or numbers";
    }
    return true;
  };

  
  const handleRegister = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.surname ||
      !formData.email ||
      !formData.password
    ) {
      setErrorMessage("Please fill in all required fields.");
      setShowErrorPopup(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("Please enter a valid email address.");
      setShowErrorPopup(true);
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation !== true) {
      setErrorMessage(passwordValidation);
      setShowErrorPopup(true);
      return;
    }

    const numericFields = [
      { name: "cellnum", label: "Cell Number", required: true },
      { name: "cellnum2", label: "Alternate Cell", required: false },
      {
        name: "vat_reg_num",
        label: "VAT Registration Number",
        required: false,
      },
      { name: "account_num", label: "Account Number", required: true },
      { name: "branch_code", label: "Branch Code", required: true },
      {
        name: "company_reg_num",
        label: "Company Registration Number",
        required: true,
      },
    ];

    for (const field of numericFields) {
      if (field.required && !formData[field.name]) {
        setErrorMessage(`${field.label} is required.`);
        setShowErrorPopup(true);
        return;
      }
      if (formData[field.name] && !/^\d+$/.test(formData[field.name])) {
        setErrorMessage(`${field.label} must contain only numbers.`);
        setShowErrorPopup(true);
        return;
      }
    }

    if (formData.cellnum && formData.cellnum.length !== 10) {
      setErrorMessage("Cell Number must be exactly 10 digits.");
      setShowErrorPopup(true);
      return;
    }

    if (formData.cellnum2 && formData.cellnum2.length !== 10) {
      setErrorMessage("Alternate Cell Number must be exactly 10 digits.");
      setShowErrorPopup(true);
      return;
    }

    const swiftValidation = validateSwiftCode(formData.swift_code);
    if (swiftValidation !== true) {
      setErrorMessage(swiftValidation);
      setShowErrorPopup(true);
      return;
    }

    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          "Registration successful! Your account is pending approval."
        );
        setShowSuccessPopup(true);
      } else {
        if (data.message === "Email already registered") {
          setErrorMessage(
            "This email is already registered. Please use a different email or login."
          );
          setShowErrorPopup(true);
        } else if (
          data.message === "Company registration number already exists"
        ) {
          setErrorMessage(
            "This company registration number is already registered."
          );
          setShowErrorPopup(true);
        } else {
          setErrorMessage(data.message || "Registration failed");
          setShowErrorPopup(true);
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again later.");
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      {showErrorPopup && errorMessage && (
        <div className={styles.errorPopup}>
          <div className={styles.errorPopupContent}>
            <span
              className={styles.closePopup}
              onClick={() => setShowErrorPopup(false)}
            >
              ×
            </span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {showSuccessPopup && successMessage && (
        <div className={styles.successPopup}>
          <div className={styles.successPopupContent}>
            <span
              className={styles.closePopup}
              onClick={() => setShowSuccessPopup(false)}
            >
              ×
            </span>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <div className={styles.registerForm}>
        <h1
          className={styles.registerTitle}
          style={{ marginBottom: "10px", marginTop: "6px" }}
        >
          Register
        </h1>

        <form onSubmit={handleRegister}>
          <div className={styles.formRow + " " + styles.fourFields}>
            <div className={styles.formGroup}>
              <label>First Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="First Name"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Surname"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={(e) =>
                  e.target.value && checkEmailExists(e.target.value)
                }
                placeholder="Email"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className={`${styles.formInput} ${
                    formData.password
                      ? passwordStrength.valid
                        ? styles.validPassword
                        : styles.invalidPassword
                      : ""
                  }`}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className={styles.passwordEyeIcon} size={18} />
                  ) : (
                    <Eye className={styles.passwordEyeIcon} size={18} />
                  )}
                </button>
                {formData.password && (
                  <span
                    className={`${styles.passwordIndicator} ${
                      passwordStrength.valid ? styles.valid : styles.invalid
                    }`}
                  >
                    {passwordStrength.valid ? "✓" : "✕"}
                  </span>
                )}
              </div>
              <small style={{ color: "#666", fontSize: "11px" }}>
                8+ chars with lowercase, uppercase, number & special char
              </small>
            </div>
          </div>

          <div className={styles.formRow + " " + styles.fourFields}>
            <div className={styles.formGroup}>
              <label>Company Name</label>
              <input
                type="text"
                name="companyname"
                value={formData.companyname}
                onChange={handleChange}
                placeholder="Company Name"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Company Reg. No.</label>
              <input
                type="text"
                name="company_reg_num"
                value={formData.company_reg_num}
                onChange={handleChange}
                placeholder="Reg. No."
                className={styles.formInput}
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                Numbers only
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>VAT Reg No.</label>
              <input
                type="text"
                name="vat_reg_num"
                value={formData.vat_reg_num}
                onChange={handleChange}
                placeholder="VAT Number"
                className={styles.formInput}
                maxLength={20}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                Numbers only
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>Cell Number</label>
              <input
                type="text"
                name="cellnum"
                value={formData.cellnum}
                onChange={handleChange}
                placeholder="Cell Number"
                className={styles.formInput}
                required
                maxLength={10}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                10 digits, numbers only
              </small>
            </div>
          </div>

          <div className={styles.formRow + " " + styles.fourFields}>
            <div className={styles.formGroup}>
              <label>Alternate Cell</label>
              <input
                type="text"
                name="cellnum2"
                value={formData.cellnum2}
                onChange={handleChange}
                placeholder="Alternate Cell"
                className={styles.formInput}
                maxLength={10}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                10 digits, numbers only
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Suburb</label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleChange}
                placeholder="Suburb"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Cluster Box</label>
              <input
                type="text"
                name="cluster_box"
                value={formData.cluster_box}
                onChange={handleChange}
                placeholder="Cluster Box"
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formRow + " " + styles.threeFields}>
            <div className={styles.formGroup}>
              <label>Account Number</label>
              <input
                type="text"
                name="account_num"
                value={formData.account_num}
                onChange={handleChange}
                placeholder="Account Number"
                className={styles.formInput}
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                Numbers only
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>Account Name</label>
              <input
                type="text"
                name="name_of_acc"
                value={formData.name_of_acc}
                onChange={handleChange}
                placeholder="Name of Account"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Bank</label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                placeholder="Bank"
                className={styles.formInput}
                required
              />
            </div>
          </div>

          <div className={styles.formRow + " " + styles.threeFields}>
            <div className={styles.formGroup}>
              <label>Branch</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Branch"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Branch Code</label>
              <input
                type="text"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleChange}
                placeholder="Branch Code"
                className={styles.formInput}
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                Numbers only
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>SWIFT Code</label>
              <input
                type="text"
                name="swift_code"
                value={formData.swift_code}
                onChange={handleChange}
                placeholder="SWIFT Code (8 or 11 chars)"
                className={styles.formInput}
                maxLength={11}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>
                Format: BANK+COUNTRY+LOCATION+[BRANCH]
              </small>
            </div>
          </div>

          <div
            className={styles.formActions}
            style={{ marginBottom: "-30px", marginTop: "-20px" }}
          >
            <button
              type="submit"
              className={styles.submitButton1}
              disabled={isLoading || isCheckingEmail}
            >
              {isLoading
                ? "Submitting..."
                : isCheckingEmail
                ? "Checking..."
                : "Submit"}
            </button>
          </div>
          <br />
          <div className={styles.loginLink} style={{ marginTop: "20px" }}>
            <button onClick={switchToLogin} className={styles.linkButton}>
              Already have a profile? Login here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
