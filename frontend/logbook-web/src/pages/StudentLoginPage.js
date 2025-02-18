import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const StudentLoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await API.post("/auth/login", { username, password });
      const { token, user, courses } = response.data;

      if (!user || !user.moodle_id) {
        throw new Error("Invalid login response: Moodle ID is missing.");
      }

      // ✅ Save user data and token in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("courses", JSON.stringify(courses));

      console.log("✅ Login successful:", user);
      navigate("/student");
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      setError("Invalid credentials or server error.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Student Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Moodle Username"
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Moodle Password"
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default StudentLoginPage;
