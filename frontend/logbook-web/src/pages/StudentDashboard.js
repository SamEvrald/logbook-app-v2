import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/StudentDashboard.css";
import Footer from "../components/Footer"; // ✅ Correctly import Footer component
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar
import { FaBell } from "react-icons/fa"; // ✅ Import Icons



const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedCourses = JSON.parse(localStorage.getItem("courses"));
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(storedUser);
  const [courses, setCourses] = useState(storedCourses || []);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const entriesPerPage = 6;

     // ✅ Profile Dropdown
      const [showProfileMenu, setShowProfileMenu] = useState(false);

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
    //fetch student courses
    const fetchCourses = async () => {
      try {
          const token = localStorage.getItem("token");
          const response = await API.get("/student/courses", {
              headers: { Authorization: `Bearer ${token}` },
          });
  
          console.log("📚 Courses Fetched from Backend:", response.data);
          setCourses(response.data); // ✅ Ensure courses are set properly
      } catch (error) {
          console.error("❌ Failed to fetch student courses:", error);
      }
  };
  fetchCourses();
  

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

 // ✅ Profile Initials Generator
 const getProfileInitials = () => {
  if (!storedUser || !storedUser.username) return "U";
  const names = storedUser.username.split(" ");
  return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
};

   // ✅ Pagination Logic
   const indexOfLastEntry = currentPage * entriesPerPage;
   const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
   const currentEntries = entries.slice(indexOfFirstEntry, indexOfLastEntry);
 
   const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="student-dashboard">
      {/* ✅ Top Bar with Profile & Notifications */}
      <div className="top-bar">
        <TopBar />
        <div className="top-right">
          <FaBell className="icon bell-icon" title="Notifications" />
          <div className="profile-container" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="profile-icon">{getProfileInitials()}</div>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <p>{storedUser.username}</p>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2>Welcome, {user?.fullname || user?.username}!</h2>

      <div className="instructions">
  <button onClick={() => window.open("https://shorturl.at/JAddI", "_blank")}>
    Logbook Entry Instructions
  </button>
</div>
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
        <div className="table-container">
          <table className="logbook-table">
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
              {currentEntries.map((entry) => (
                <tr key={entry.case_number}>
                  <td>{entry.case_number || "Not Assigned"}</td>
                  <td>{entry.work_completed_date || "Not Provided"}</td>
                  <td>{entry.type_of_work || "N/A"}</td>
                  <td>{entry.pathology || "N/A"}</td>
                  <td>{entry.task_description || "N/A"}</td>
                  <td>
  {(() => {
    if (!entry.media_link) return "Not Provided";

    let mediaArray = [];
    try {
      mediaArray = JSON.parse(entry.media_link);
    } catch {
      mediaArray = [entry.media_link]; // fallback if it's not JSON
    }

    return (
      <div
        className="dropdown-container"
        ref={(el) => {
          if (el) {
            const rect = el.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.bottom + 150 > windowHeight) {
              el.classList.add("upward");
            } else {
              el.classList.remove("upward");
            }
          }
        }}
      >
        <button className="dropdown-button">View Files</button>
        <div className="dropdown-content">
          {mediaArray.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
              File {idx + 1}
            </a>
          ))}
        </div>
      </div>
    );
  })()}
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

          {/* ✅ Pagination Controls */}
          <div className="pagination">
            {Array.from({ length: Math.ceil(entries.length / entriesPerPage) }, (_, i) => (
              <button key={i + 1} onClick={() => paginate(i + 1)} className={currentPage === i + 1 ? "active" : ""}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default StudentDashboard;
