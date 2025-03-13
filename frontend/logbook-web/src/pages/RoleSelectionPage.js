import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoleSelectionPage.css"; // ✅ Import CSS
import Footer from "../components/Footer"; // ✅ Correctly import Footer component
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar


const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="role-container">
       <TopBar /> {/* ✅ Add TopBar at the Top */}
      <h2>Select Your Role</h2>
      
      <div className="role-buttons">
        <button onClick={() => navigate("/login/student")} className="btn student">
          Login as Student
        </button>
        <button onClick={() => navigate("/login/teacher")} className="btn teacher">
          Login as Teacher
        </button>
      </div>

      {/* <div className="role-buttons">
        <button onClick={() => navigate("/signup/teacher")} className="btn signup">
          Signup as Teacher
        </button>
      </div> */}

      <div className="role-buttons">
        <button onClick={() => navigate("/login/admin")} className="btn admin">
          Login as Admin
        </button>
        {/* <button onClick={() => navigate("/signup/admin")} className="btn green">
          Signup as Admin
        </button> */}
      </div>

      {/* ✅ Correct Footer Placement */}
      <Footer />
    </div>
  );
};

export default RoleSelectionPage;
