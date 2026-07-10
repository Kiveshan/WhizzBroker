"use client";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import api from "../api";

const Header = ({ title }) => {
  const [user, setUser] = useState({ name: "", surname: "" });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Try to get user info from localStorage first (faster)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          name: parsedUser.name || "",
          surname: parsedUser.surname || "",
        });
        setIsLoggedIn(true);
        return; // Exit early if we have user data in localStorage
      } catch (error) {
        console.error("Error parsing stored user data:", error);
      }
    }

    // If no localStorage data, fetch from API using the token
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser({ name: "Guest", surname: "" });
          setIsLoggedIn(false);
          return;
        }

        const response = await api.get("/user-info");

        setUser({ name: response.data.name, surname: response.data.surname });
        setIsLoggedIn(true);

        // Store user info in localStorage for future use
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: response.data.name,
            surname: response.data.surname,
            roleid: response.data.roleid,
          })
        );
      } catch (error) {
        console.error("Network error:", error);
        setUser({ name: "Guest", surname: "" });
        setIsLoggedIn(false);
      }
    };

    fetchUserInfo();
  }, []); // Empty array ensures it runs only once when the component mounts

  return (
    <header className="header">
      <div className="logo-container">
        <img
          src="/images/whizz-away.jpeg"
          className="logo-img"
          alt="Business Logo"
        />
      </div>
      <h1>{title}</h1>
      <div className="user-info">
        <img
          src={isLoggedIn ? "/images/lady.jpg" : "/images/mann.jpg"}
          className="user-img"
          alt={`${user.name} ${user.surname}`}
        />
        <span className="user-name">
          {user.name && user.surname ? `${user.name} ${user.surname}` : "Guest"}
        </span>
        {/* {isLoggedIn && <LogoutButton />} */}
      </div>
    </header>
  );
};

export default Header;
