import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const AdminSignupPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await API.post("/admin/signup", { username, email, password });
      alert("Signup successful! Please login.");
      navigate("/login/admin");
    } catch (err) {
      setError("Failed to signup. Try again.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Admin Signup</h2>
      <form onSubmit={handleSignup}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Signup</button>
      </form>
    </div>
  );
};

export default AdminSignupPage;
