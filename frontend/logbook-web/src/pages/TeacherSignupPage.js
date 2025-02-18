import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const TeacherSignupPage = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await API.post("/teachers/signup", formData);
      alert("Signup successful. You can now log in.");
      navigate("/login/teacher");
    } catch (err) {
      setError("Signup failed. Try again.");
    }
  };

  return (
    <div>
      <h2>Teacher Signup</h2>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default TeacherSignupPage;
