import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";
import { FaBell } from "react-icons/fa"; // ✅ Import Icons
import "../styles/TeacherDashboard.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const token = localStorage.getItem("token");

  const [teacherName] = useState(storedUser?.username || "Unknown");
  const [courses, setCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourse, setExpandedCourse] = useState(null);
const [students, setStudents] = useState({});


  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 4;

  // ✅ Profile Dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
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

  const fetchStudentsForCourse = async (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null); // 🔄 Collapse if already expanded
      return;
    }
  
    try {
      const response = await API.get(`/teachers/course/${courseId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      setStudents((prev) => ({
        ...prev,
        [courseId]: response.data.students || [],
      }));
  
      setExpandedCourse(courseId); // ✅ Expand Course
    } catch (error) {
      console.error("❌ Failed to fetch students:", error.response?.data || error.message);
    }
  };
  
  

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
      setEntries(entriesResponse.data.entries || []);
      setFilteredEntries(entriesResponse.data.entries || []);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ✅ Profile Initials Generator
  const getProfileInitials = () => {
    if (!storedUser || !storedUser.username) return "U";
    const names = storedUser.username.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  // ✅ Handle Search
  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = entries.filter(
      (entry) =>
        entry.case_number.toLowerCase().includes(query.toLowerCase()) ||
        entry.student_name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  // ✅ Handle Filtering by Course
  const handleFilterCourse = (courseId) => {
    setSelectedCourse(courseId);
    if (!courseId) {
      setFilteredEntries(entries);
      return;
    }
    const filtered = entries.filter((entry) => entry.course_id === parseInt(courseId));
    setFilteredEntries(filtered);
  };

  // ✅ Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="teacher-dashboard">
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

      {/* ✅ Main Layout: Side Panel + Content */}
      <div className="dashboard-layout">
        {/* ✅ Side Panel */}
        <div className="side-panel">
          <h3>📚 My Courses</h3>
          {courses.length > 0 ? (
            <ul className="course-list">
              {courses.map((course) => (
                <li key={course.id} className="course-item">
                  <button
                    onClick={() => fetchStudentsForCourse(course.id)}
                    className="course-btn"
                  >
                    {course.fullname} {expandedCourse === course.id ? "▲" : "▼"}
                  </button>

                  {/* ✅ Show Students When Course is Expanded */}
                  {expandedCourse === course.id && (
                    <ul className="student-list">
                      {students[course.id]?.length > 0 ? (
                        students[course.id].map((student) => (
                          <li key={student.id} className="student-item">
                            {student.username}
                          </li>
                        ))
                      ) : (
                        <p className="no-students">No students enrolled.</p>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No courses assigned.</p>
          )}
        </div>
        </div>



      <h2>Welcome, {teacherName}!</h2>

      <div className="filters">
        {/* ✅ Course Filter */}
        {courses.length > 0 && (
          <select value={selectedCourse} onChange={(e) => handleFilterCourse(e.target.value)}>
            <option value="">-- All Courses --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.fullname}
              </option>
            ))}
          </select>
        )}

        {/* ✅ Search Box */}
        <input
          type="text"
          placeholder="Search by Case # or Student..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <h3>Submitted Logbook Entries:</h3>
      {loading ? (
        <p>Loading...</p>
      ) : currentEntries.length === 0 ? (
        <p>No entries found.</p>
      ) : (
        <table>
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
            {currentEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.case_number || "Not Assigned"}</td>
                <td>{entry.work_completed_date ? new Date(entry.work_completed_date).toLocaleDateString("en-GB") : "Not Provided"}</td>
                <td>{entry.student_name || "Unknown"}</td>
                <td>{entry.course_name || `Course ID ${entry.course_id}`}</td>
                <td>{entry.type_of_work}</td>
                <td>{entry.task_description || "No Description"}</td>
                <td>
  {entry.media_link && entry.media_link !== "/uploads/" ? (
    <a
      href={`http://localhost:5000${entry.media_link}`} 
      target="_blank" 
      rel="noopener noreferrer"
    >
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
                  <button className="grade-btn" onClick={() => handleGradeEntry(entry.id)}>Grade</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ Pagination */}
      <div className="pagination">
        {Array.from({ length: Math.ceil(filteredEntries.length / entriesPerPage) }, (_, i) => (
          <button key={i + 1} onClick={() => paginate(i + 1)}>{i + 1}</button>
        ))}
      </div>

      <Footer />
    </div>
  );
};

export default TeacherDashboard;
