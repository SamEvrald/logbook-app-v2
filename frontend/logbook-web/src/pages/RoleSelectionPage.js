import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoleSelectionPage.css"; 
import Footer from "../components/Footer"; 
import TopBar from "../components/Shared/TopBar"; 


const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="role-container">
       <TopBar /> 
       <div className="main-content-wrapper">

       


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

     

      <div className="role-buttons">
        <button onClick={() => navigate("/login/admin")} className="btn admin">
          Admin Login
        </button>
      
      </div>

     
      <Footer />
    </div>
    </div>
  );
};

export default RoleSelectionPage;
