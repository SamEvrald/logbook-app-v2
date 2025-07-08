// TopBar.js (No changes needed, keeping it as provided)
import React from "react";
import { Link } from "react-router-dom";
import hsLogo from "../../images/hs-logo.jpg"; 
import "./TopBar.css"; 

const TopBar = () => {
  return (
    <div className="top-bar">
    
      <div className="logo-container">
        <img src={hsLogo} alt="Human Study Logo" className="hs-logo" />
      </div>

   
    </div>
  );
};

export default TopBar;
