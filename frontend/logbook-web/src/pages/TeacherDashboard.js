import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Footer from "../components/Footer"; // ✅ Correctly import Footer component
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
    const token = localStorage.getItem("token");

    const [teacherName, setTeacherName] = useState(storedUser?.username || "Unknown");
    const [courses, setCourses] = useState([]);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("🔍 Stored User:", storedUser);
        console.log("🔍 Stored Token:", token);

        if (!storedUser || storedUser.role !== "teacher") {
            navigate("/login/teacher");
            return;
        }

        if (!token) {
            navigate("/login/teacher");
            return;
        }

        fetchDashboard();
    }, [storedUser, token, navigate]);

    const fetchDashboard = async () => {
      try {
          // ✅ Fetch teacher's courses
          const coursesResponse = await API.get(`/teachers/${storedUser.email}/courses`, {
              headers: { Authorization: `Bearer ${token}` },
          });
  
          setCourses(coursesResponse.data.courses || []);
  
          // ✅ Fetch teacher's submitted entries
          const entriesResponse = await API.get(`/teachers/${storedUser.email}/entries`, {
              headers: { Authorization: `Bearer ${token}` },
          });
  
          console.log("✅ Entries Data:", entriesResponse.data);
          setEntries(entriesResponse.data.entries || []);
      } catch (error) {
          console.error("❌ Failed to fetch teacher dashboard:", error.response?.data || error.message);
          if (error.response?.status === 401) {
              navigate("/login/teacher");
          }
      } finally {
          setLoading(false);
      }
  };
  

    const handleGradeEntry = (entryId) => {
        navigate(`/teacher/grade/${entryId}`);
    };
    // ✅ Logout Function
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };


    return (
      
        <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
            <TopBar /> {/* ✅ Add TopBar at the Top */}
            <h2>Welcome, {teacherName}!</h2>

            <h3>Your Courses:</h3>
            {courses.length === 0 ? <p>No courses assigned.</p> : <ul>{courses.map((c) => <li key={c.id}>{c.fullname}</li>)}</ul>}
            <button onClick={handleLogout} style={{ float: "right", padding: "5px 10px", backgroundColor: "red", color: "white" }}>
        Logout
      </button>

            <h3>Submitted Logbook Entries:</h3>
            {loading ? <p>Loading...</p> : entries.length === 0 ? <p>No entries yet.</p> : 
                <table border="1" style={{ width: "100%", textAlign: "left", marginTop: "20px" }}>
                    <thead>
                        <tr>
                            <th>Case #</th>
                            <th>Completion Date</th>
                            <th>Student</th>
                            <th>Course</th>
                            <th>Type Of Task/Device</th>
                            <th>Description</th>
                            <th>Media</th>
                            <th>Consent</th>
                            <th>Comments</th>
                            <th>Grade</th>
                            <th>Feedback</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id}>
                                <td>{entry.case_number || "Not Assigned"}</td>
                                <td>{entry.work_completed_date ? new Date(entry.work_completed_date).toLocaleDateString("en-GB") : "Not Provided"}</td>
                                <td>{entry.student_name || "Unknown"}</td>
                                <td>{entry.course_name || `Course ID ${entry.course_id}`}</td>
                                <td>{entry.type_of_work}</td>
                                <td>{entry.task_description || "No Description"}</td>
                                <td>
                                    {entry.media_link ? (
                                        <a href={entry.media_link} target="_blank" rel="noopener noreferrer">
                                            View Media
                                        </a>
                                    ) : "Not Provided"}
                                </td>
                                <td>{entry.consent_form === "yes" ? "Yes" : "No"}</td>
                                <td>{entry.clinical_info || "No Info"}</td>
                                <td>{entry.grade !== null ? entry.grade : "-"}</td>
                                <td>{entry.feedback || "No feedback yet"}</td>
                                <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                                    {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                                </td>
                                <td>
                                    <button onClick={() => handleGradeEntry(entry.id)}>Grade</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            }
            {/* ✅ Correct Footer Placement */}
      <Footer />
        </div>
    );
};

export default TeacherDashboard;
