import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const TeacherLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await API.post("/teachers/login", { email, password });

      console.log("✅ API Response:", response.data);

      if (!response.data.token) {
        console.error("❌ No token received!");
        setError("Server error: No token received.");
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      console.log("✅ Token Stored:", localStorage.getItem("token"));

      if (response.data.user.role === "teacher") {
        navigate("/teacher");
      } else {
        console.error("❌ Unauthorized role:", response.data.user.role);
        setError("Invalid user role.");
      }

    } catch (err) {
      console.error("❌ Login Failed:", err.response?.data || err.message);
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Teacher Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default TeacherLoginPage;
