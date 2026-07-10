"use client";
import { useNavigate } from "react-router-dom";
import api from "../api";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 1. Call the logout endpoint (optional)
      await api.post("/logout").catch((error) => {
        console.log(
          "Logout endpoint not available, continuing with client-side logout"
        );
      });

      // 2. Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // 3. Clear any other auth-related state
      // If you're using React Context for auth state, you would update it here

      // 4. Redirect to login page
      navigate("/");

      // 5. Optional: Reload the page to clear any in-memory state
      // window.location.reload()
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local storage and redirect even if server logout fails
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/landing");
    }
  };

  return (
    <button className="logout" onClick={handleLogout}>
      Logout
    </button>
  );
};

export default LogoutButton;
