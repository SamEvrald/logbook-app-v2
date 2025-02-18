import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/api";

const GradeEntryForm = () => {
  const { entryId } = useParams(); // Get entry ID from URL params
  const navigate = useNavigate();

  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await API.post(
        "/teachers/grade",
        { entryId, grade, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("✅ Entry graded successfully!");
      setTimeout(() => navigate("/teacher"), 2000); // Redirect after grading
    } catch (error) {
      console.error("❌ Failed to grade entry:", error.response?.data || error.message);
      setMessage("❌ Failed to submit grade.");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Grade Entry</h2>
      {message && <p style={{ color: message.includes("❌") ? "red" : "green" }}>{message}</p>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Grade (0-100)</label>
          <input type="number" min="0" max="100" value={grade} onChange={(e) => setGrade(e.target.value)} required />
        </div>

        <div>
          <label>Feedback</label>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} required />
        </div>

        <button type="submit">Submit Grade</button>
      </form>
    </div>
  );
};

export default GradeEntryForm; // ✅ Ensure Default Export
