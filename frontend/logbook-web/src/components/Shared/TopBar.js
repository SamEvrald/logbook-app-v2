import React from "react";
import { Link } from "react-router-dom";
import hsLogo from "../../images/hs-logo.jpg"; // ✅ Import the logo
import "./TopBar.css"; // ✅ Import CSS

const TopBar = () => {
  return (
    <div className="top-bar">
      {/* ✅ Left - Logo */}
      <div className="logo-container">
        <img src={hsLogo} alt="Human Study Logo" className="hs-logo" />
      </div>

   

      {/* ✅ Right - Login Inputs
      <div className="login-container">
        <input type="text" placeholder="Username" className="login-input" />
        <input type="password" placeholder="Password" className="login-input" />
        <button className="login-button">→</button>
      </div> */}
    </div>
  );
  
};

export default TopBar;
