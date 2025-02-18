import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedCourses = JSON.parse(localStorage.getItem("courses"));
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(storedUser);
  const [courses, setCourses] = useState(storedCourses || []);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.moodle_id) {
      console.error("User not found. Redirecting to login...");
      navigate("/login");
      return;
    }

    if (!token) {
      console.error("No token found. Redirecting to login...");
      navigate("/login");
      return;
    }

    // ✅ Fetch student logbook entries using moodle_id
    const fetchEntries = async () => {
      try {
        const response = await API.get(`/entries/student/${user.moodle_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntries(response.data);
      } catch (error) {
        console.error("❌ Failed to fetch entries:", error.response?.data || error.message);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user, token, navigate]);

  const handleCreateEntry = (course) => {
    if (!user || !course) {
      alert("User or course data is missing");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("selectedCourse", JSON.stringify(course));

    navigate("/student/new-entry");
  };

  // ✅ Logout Function
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("courses");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", position: "relative" }}>
      
      {/* ✅ Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "10px 15px",
          backgroundColor: "#e74c3c", // 🔥 Red color for logout
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Logout
      </button>

      <h2>Welcome, {user?.fullname || user?.username}!</h2>

      {/* ✅ Display Enrolled Courses */}
      <h3>Your Courses:</h3>
      {courses.length === 0 ? (
        <p>You are not enrolled in any courses.</p>
      ) : (
        <ul>
          {courses.map((course) => (
            <li key={course.id} style={{ marginBottom: "10px" }}>
              <strong>{course.fullname}</strong> (ID: {course.id})
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => handleCreateEntry(course)}
              >
                Create Entry
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ✅ Display Logbook Entries */}
      <h3>Your Logbook Entries:</h3>
      {loading ? (
        <p>Loading entries...</p>
      ) : entries.length === 0 ? (
        <p>No entries found. Click "Create Entry" to submit a new logbook entry.</p>
      ) : (
        <table border="1" style={{ width: "100%", textAlign: "left", marginTop: "20px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Case #</th>
              <th>Completion Date</th>
              <th>Type Of Task/Device</th>
              <th>Pathology</th>
              <th>Task Description</th>
              <th>Media</th>
              <th>Consent</th>
              <th>Comments</th>
              <th>Grade</th>
              <th>Feedback</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.case_number}>
                <td>{entry.case_number || "Not Assigned"}</td>
                <td>{entry.work_completed_date || "Not Provided"}</td>
                <td>{entry.type_of_work || "N/A"}</td>
                <td>{entry.pathology || "N/A"}</td>
                <td>{entry.task_description || "N/A"}</td>
                <td>
                  {entry.media_link ? (
                    <a href={entry.media_link} target="_blank" rel="noopener noreferrer">
                      View Media
                    </a>
                  ) : "Not Provided"}
                </td>
                <td>{entry.consent_form === "yes" ? "Yes" : "No"}</td>
                <td>{entry.clinical_info || "Not Provided"}</td>
                <td>{entry.grade !== null ? entry.grade : "-"}</td>
                <td>{entry.feedback || "No feedback yet"}</td>
                <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                  {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentDashboard;
