import { useRef, useState } from "react";
import { extractFilenameFromUrl } from "../../utils/helpers";
import { validatePassword, getPasswordStrength } from "../../../../utils/passwordValidator.js";
import { Eye, EyeOff } from "lucide-react";

const EmployeeForm = ({ employee, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  const emailRef = useRef(null);
  const [alert, setAlert] = useState({ show: false, message: "" });
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
    valid: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Validate required fields on submit
  const validateForm = () => {
    let isValid = true;
    const requiredFields = ['name', 'surname', 'roleid', 'cellnum'];
    requiredFields.forEach(field => {
      if (!employee[field]) {
        isValid = false;
      }
    });

    // Validate telephone number format if provided
    if (employee.telephonenum && !/^[0-9]{10}$/.test(employee.telephonenum)) {
      isValid = false;
    }

    // Validate cell number format (required field)
    if (employee.cellnum && !/^[0-9]{10}$/.test(employee.cellnum)) {
      isValid = false;
    }

    // Validate password if provided (new employee or password change)
    if (employee.password && employee.password.trim() !== "") {
      const passwordValidation = validatePassword(employee.password);
      if (passwordValidation !== true) {
        setPasswordError(passwordValidation);
        isValid = false;
      } else {
        setPasswordError("");
      }
    }

    return isValid;
  };

  const checkEmailExists = async (email) => {
    try {
      setIsCheckingEmail(true);
      const response = await fetch(
        `${API_BASE_URL}/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      if (data.exists) {
        emailRef.current?.setCustomValidity("This email is already in use.");
        setAlert({ show: true, message: "This email is already in use." });
        return true;
      } else {
        emailRef.current?.setCustomValidity("");
        setAlert({ show: false, message: "" });
        return false;
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setAlert({ show: true, message: "Error checking email availability." });
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      // Set custom validity messages for phone number format errors
      if (employee.telephonenum && !/^[0-9]{10}$/.test(employee.telephonenum)) {
        const phoneInput = e.target.querySelector('input[pattern="[0-9]{10}"]');
        if (phoneInput) phoneInput.setCustomValidity("Please enter exactly 10 digits for telephone number");
      }
      if (employee.cellnum && !/^[0-9]{10}$/.test(employee.cellnum)) {
        const cellInput = e.target.querySelectorAll('input[pattern="[0-9]{10}"]')[1];
        if (cellInput) cellInput.setCustomValidity("Please enter exactly 10 digits for cell number");
      }
      e.target.reportValidity();
      return;
    }

    // For new employees, ensure email is valid if provided
    if (!isEditing && employee.email) {
      const emailExists = await checkEmailExists(employee.email);
      if (emailExists) {
        e.target.reportValidity();
        return;
      }
    }

    const success = await onSave(employee, emailRef);
    if (!success) {
      return;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB in bytes

    if (file) {
      if (file.type !== "application/pdf") {
        setAlert({ show: true, message: "Only PDF files are allowed." });
        return;
      }
      if (file.size > maxSizeInBytes) {
        setAlert({ show: true, message: "File size exceeds the 5MB limit." });
        return;
      }
      if ((employee.documents?.length || 0) >= 3) {
        setAlert({ show: true, message: "Maximum of 3 documents allowed." });
        return;
      }
      setAlert({ show: false, message: "" }); // Clear alert on success
      onChange("documents", [...(employee.documents || []), file]);
    }
  };

  const removeDocument = (index) => {
    const updatedDocs = [...(employee.documents || [])];
    updatedDocs.splice(index, 1);
    onChange("documents", updatedDocs);
  };

  const closeAlert = () => {
    setAlert({ show: false, message: "" });
  };

  const handlePasswordChange = (password) => {
    onChange("password", password);
    setPasswordStrength(getPasswordStrength(password));
    if (password && password.trim() !== "") {
      const validation = validatePassword(password);
      setPasswordError(validation === true ? "" : validation);
    } else {
      setPasswordError("");
    }
  };

  // Check if the role is Driver (5) or Yard Staff (9)
  const hideEmailAndPassword = employee.roleid === 5 || employee.roleid === 9;

  return (
    <form className="manage-add-employee-form" onSubmit={handleSubmit} noValidate>
      <h3>{isEditing ? "Edit Employee" : "Add New Employee"}</h3>

      <div
        className="manage-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {/* Personal Details */}
        <div className="manage-form-group">
          <label>
            Name <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={employee.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Surname <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={employee.surname || ""}
            onChange={(e) => onChange("surname", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Telephone Number
          </label>
          <input
            type="text"
            value={employee.telephonenum || ""}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "");
              e.target.value = digitsOnly;
              const input = e.target;
              if (input.validity.patternMismatch) {
                input.setCustomValidity("Please enter exactly 10 digits");
              } else {
                input.setCustomValidity("");
              }
              onChange("telephonenum", digitsOnly);
            }}
            placeholder="Exactly 10 digits only"
            minLength="10"
            maxLength="10"
            pattern="[0-9]{10}"
            title="Please enter exactly 10 digits"
          />
        </div>

        <div className="manage-form-group">
          <label>
            Cell Number <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={employee.cellnum || ""}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "");
              e.target.value = digitsOnly;
              const input = e.target;
              if (input.validity.patternMismatch) {
                input.setCustomValidity("Please enter exactly 10 digits");
              } else {
                input.setCustomValidity("");
              }
              onChange("cellnum", digitsOnly);
            }}
            placeholder="Exactly 10 digits only"
            minLength="10"
            maxLength="10"
            pattern="[0-9]{10}"
            title="Please enter exactly 10 digits"
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Employee Number
          </label>
          <input
            type="text"
            value={employee.employeenum || ""}
            onChange={(e) => onChange("employeenum", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>
            Base Salary
          </label>
          <input
            type="text"
            value={employee.base_salary || ""}
            onChange={(e) => onChange("base_salary", e.target.value)}
          />
        </div>

        {!hideEmailAndPassword && (
          <>
            <div className="manage-form-group">
              <label>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                value={employee.email || ""}
                onChange={(e) => {
                  emailRef.current?.setCustomValidity("");
                  setAlert({ show: false, message: "" });
                  onChange("email", e.target.value);
                }}
                onBlur={(e) => {
                  if (!isEditing && e.target.value) {
                    checkEmailExists(e.target.value);
                  }
                }}
                disabled={isCheckingEmail}
              />
            </div>

            <div className="manage-form-group">
              <label>
                Password
                {!isEditing && <span style={{ color: "red" }}>*</span>}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={employee.password || ""}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={passwordError ? "password-error" : ""}
                  style={{ paddingRight: "40px" }}
                  placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666"
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isEditing && (
                <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "4px" }}>
                  Leave blank to keep existing password unchanged
                </div>
              )}
              {passwordError && (
                <div style={{ color: "red", fontSize: "0.85rem", marginTop: "4px" }}>
                  {passwordError}
                </div>
              )}
              {employee.password && employee.password.trim() !== "" && (
                <div style={{ fontSize: "0.75rem", marginTop: "4px", color: "#666" }}>
                  <div style={{ color: passwordStrength.length ? "green" : "red" }}>
                    ✓ At least 8 characters
                  </div>
                  <div style={{ color: passwordStrength.lowercase ? "green" : "red" }}>
                    ✓ One lowercase letter
                  </div>
                  <div style={{ color: passwordStrength.uppercase ? "green" : "red" }}>
                    ✓ One uppercase letter
                  </div>
                  <div style={{ color: passwordStrength.number ? "green" : "red" }}>
                    ✓ One number
                  </div>
                  <div style={{ color: passwordStrength.special ? "green" : "red" }}>
                    ✓ One special character (!@#$%^&*)
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="manage-form-group">
          <label htmlFor="roleid">
            Role <span style={{ color: "red" }}>*</span>
          </label>
          <select
            id="roleid"
            className="dropdown"
            value={employee.roleid || ""}
            onChange={(e) => {
              const selectedRoleId = Number.parseInt(e.target.value);
              onChange("roleid", selectedRoleId);

              // Clear email and password if Driver (5) or Yard Staff (9) is selected
              if (selectedRoleId === 5 || selectedRoleId === 9) {
                onChange("email", "");
                onChange("password", "");
                // Clear email validation error messages and states
                setAlert({ show: false, message: "" });
                emailRef.current?.setCustomValidity("");
                setIsCheckingEmail(false);
              }
            }}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="1">Business Manager</option>
            <option value="2">Controller</option>
            <option value="4">Director</option>
            <option value="5">Driver</option>
            <option value="3">Debtors Clerk</option>
            <option value="8">Creditors Clerk</option>
            <option value="9">Yard Staff</option>
          </select>
        </div>
     {alert.show && (
          <div className="alert-box">
            <span>{alert.message}</span>
            <button
              type="button"
              className="alert-close"
              onClick={closeAlert}
              aria-label="Close alert"
            >
              &times;
            </button>
          </div>
        )}
        {/* Deductions */}
        <div style={{ gridColumn: "1 / span 3" }}>
          <h3 style={{ textAlign: "center", marginTop: "30px" }}>Employee Salary Deductions</h3>
        </div>

        <div className="manage-form-group">
          <label>Income Tax (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={employee.income_tax_rate || ""}
            onChange={(e) => onChange("income_tax_rate", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>UIF (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={employee.deduction_uif || ""}
            onChange={(e) => onChange("deduction_uif", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Loan</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_loan || ""}
            onChange={(e) => onChange("deduction_loan", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Bonus</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_bonus || ""}
            onChange={(e) => onChange("deduction_bonus", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Savings</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_savings || ""}
            onChange={(e) => onChange("deduction_savings", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Damage</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_damage || ""}
            onChange={(e) => onChange("deduction_damage", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Other Deductions</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_other_deductions || ""}
            onChange={(e) => onChange("deduction_other_deductions", e.target.value)}
          />
        </div>

        {/* Document Upload */}
   
        <div className="manage-form-group" style={{ gridColumn: "1 / span 3" }}>
          <label>
            <strong>Upload Documents (PDF Only, Max 3, 5MB each)</strong>
          </label>
          <div
            style={{
              border: "2px dashed #ccc",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              backgroundColor: "#f9f9f9",
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={(employee.documents?.length || 0) >= 3}
            />
            <small>
              {(employee.documents?.length || 0) >= 3
                ? "Maximum of 3 PDF documents uploaded"
                : "Upload PDF documents only (max 5MB each)"}
            </small>
          </div>

          {/* Document Lists */}
          <div style={{ marginTop: "15px" }}>
            {isEditing && employee.existingDocuments?.length > 0 && (
              <>
                <h4>Previously Uploaded Documents</h4>
                {employee.existingDocuments.map((url, index) => (
                  <div
                    key={`existing-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ flexGrow: 1 }}>{extractFilenameFromUrl(url)}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginRight: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument("employee", employee.userid, url)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}

            {employee.documents?.length > 0 && (
              <>
                <h4>Newly Uploaded Documents</h4>
                {employee.documents.map((doc, index) => (
                  <div
                    key={`new-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ flexGrow: 1 }}>{doc.name}</span>
                    <a
                      href={URL.createObjectURL(doc)}
                      download={doc.name}
                      style={{
                        marginRight: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div
        className="employee-button-container"
        style={{
          marginTop: "30px",
          display: "flex",
          gap: "16px",
          justifyContent: "center",
        }}
      >
        <button type="submit" className="employee-save-button" disabled={loading || isCheckingEmail}>
          {loading ? "Saving..." : isCheckingEmail ? "Checking..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="employee-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;