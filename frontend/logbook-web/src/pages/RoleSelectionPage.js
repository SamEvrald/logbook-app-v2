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


<h2 class="heading-highlight h2">Welcome to The Logbook!</h2>
<h4 class="heading-highlight h4">Please Select Your Role To Login</h4>


      
      <div className="role-buttons">
        <button onClick={() => navigate("/login/student")} className="btn student">
          Student Login
        </button>
        <button onClick={() => navigate("/login/teacher")} className="btn teacher">
          Teacher Login
        </button>
      </div>

      {/* <div className="role-buttons">
        <button onClick={() => navigate("/signup/teacher")} className="btn signup">
          Signup as Teacher
        </button>
      </div> */}

      <div className="role-buttons">
        <button onClick={() => navigate("/login/admin")} className="btn admin">
          Admin Login
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
