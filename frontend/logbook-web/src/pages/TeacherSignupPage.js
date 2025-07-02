import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer"; // ✅ Correctly import Footer component
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar

const TeacherSignupPage = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ Function to display a custom message box (ADDED)
  const showCustomMessageBox = (msg, type = 'success') => {
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      padding: 20px 30px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      z-index: 1000;
      text-align: center;
      font-size: 1.1em;
      font-weight: bold;
      color: ${type === 'success' ? '#27ae60' : '#e74c3c'}; /* Green for success, Red for error */
      border: 2px solid ${type === 'success' ? '#27ae60' : '#e74c3c'};
      max-width: 350px;
      opacity: 0; /* Start hidden for fade-in */
      transition: opacity 0.3s ease-in-out;
    `;
    messageBox.textContent = msg;
    document.body.appendChild(messageBox);

    // Fade in
    setTimeout(() => {
      messageBox.style.opacity = 1;
    }, 10); // Small delay to trigger transition

    // Fade out and remove after a few seconds
    setTimeout(() => {
      messageBox.style.opacity = 0;
      setTimeout(() => {
        if (document.body.contains(messageBox)) {
          document.body.removeChild(messageBox);
        }
      }, 300); // Wait for fade-out transition
    }, 3000); // Display for 3 seconds
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await API.post("/teachers/signup", formData);
      // ✅ Replaced alert with custom message box for success
      showCustomMessageBox("Teacher Created successfully.", 'success');
      // Original navigation remains as is, no delay added per strict instruction
      navigate("/admin"); 
    } catch (err) {
      // ✅ Replaced alert with custom message box for error, while keeping setError
      setError("Signup failed. Try again.");
      showCustomMessageBox("❌ Signup failed. Try again.", 'error'); // Display custom error popup
    }
  };

  return (
    
      <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Create Teacher Account</h2>
      <TopBar /> {/* ✅ Add TopBar at the Top */}
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
      {/* ✅ Correct Footer Placement */}
      <Footer />
    </div>
  );
};

export default TeacherSignupPage;
