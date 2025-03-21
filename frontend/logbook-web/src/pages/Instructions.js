import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer"; // ✅ Correctly import Footer component
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar


  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <TopBar /> {/* ✅ Add TopBar at the Top */}
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
      {/* ✅ Correct Footer Placement */}
      <Footer />
    </div>
  );


export default instructions;
