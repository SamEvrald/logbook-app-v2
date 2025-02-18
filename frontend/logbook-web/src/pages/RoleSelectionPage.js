import React from "react";
import { useNavigate } from "react-router-dom";

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Select Your Role</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/login/student")} style={{ margin: "10px", padding: "10px 20px" }}>
          Login as Student
        </button>
        <button onClick={() => navigate("/login/teacher")} style={{ margin: "10px", padding: "10px 20px" }}>
          Login as Teacher
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/signup/teacher")} style={{ margin: "10px", padding: "10px 20px" }}>
          Signup as Teacher
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/login/admin")} style={{ margin: "10px", padding: "10px 20px", backgroundColor: "#e74c3c", color: "white" }}>
          Login as Admin
        </button>
        <button onClick={() => navigate("/signup/admin")} style={{ margin: "10px", padding: "10px 20px", backgroundColor: "#2ecc71", color: "white" }}>
          Signup as Admin
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
