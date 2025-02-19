import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { FaBell } from "react-icons/fa"; // ✅ Import Notification Icon
import "../styles/AdminDashboard.css"; // ✅ Import CSS
import Footer from "../components/Footer"; // ✅ Import Footer
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null

  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("entry_date");
  const [message, setMessage] = useState("");

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;
  const [showProfileMenu, setShowProfileMenu] = useState(false); // ✅ Profile Dropdown

  useEffect(() => {
    if (!token) {
      console.error("❌ No token found. Redirecting to login...");
      navigate("/login/admin");
      return;
    }

    fetchEntries();
    fetchTeachers();
    fetchCourses();
  }, []);

  

  // ✅ Fetch Logbook Entries
  const fetchEntries = async () => {
    try {
      const response = await API.get("/admin/entries", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEntries(response.data);
      setFilteredEntries(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch entries:", error.response?.data || error.message);
      setMessage("Error: Failed to load logbook entries. Please log in again.");
    }
  };

  // ✅ Fetch Teachers
  const fetchTeachers = async () => {
    try {
      const response = await API.get("/admin/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTeachers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]);
    }
  };

  // ✅ Fetch Courses
  const fetchCourses = async () => {
    try {
      const response = await API.get("/admin/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      setCourses([]);
    }
  };

  // ✅ Assign Course to Teacher
  const handleAssignCourse = async () => {
    if (!selectedTeacher || !selectedCourse) {
      setMessage("Please select both a teacher and a course.");
      return;
    }

    try {
      await API.post(
        "/admin/assign-course",
        { teacher_id: selectedTeacher, course_id: selectedCourse },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("✅ Course assigned successfully!");
      fetchTeachers(); // ✅ Refresh teacher list
    } catch (error) {
      console.error("❌ Failed to assign course:", error);
      setMessage("❌ Failed to assign course.");
    }
  };

  // ✅ Handle Search
  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = entries.filter(
      (entry) =>
        entry.case_number.toLowerCase().includes(query.toLowerCase()) ||
        entry.student.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  // ✅ Handle Sorting
  const handleSort = (criteria) => {
    setSortBy(criteria);
    const sorted = [...filteredEntries].sort((a, b) => {
      if (criteria === "entry_date") {
        return new Date(b.entry_date) - new Date(a.entry_date);
      } else if (criteria === "grade") {
        return b.grade - a.grade;
      }
      return 0;
    });
    setFilteredEntries(sorted);
  };

    // // ✅ Logout Function
    const handleLogout = () => {
      localStorage.removeItem("user");
      localStorage.removeItem("courses");
      localStorage.removeItem("token");
      navigate("/login");
    };

  // ✅ Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

 // Generate Profile Initials
const getProfileInitials = () => {
  if (!storedUser || !storedUser.username) return "A";
  const names = storedUser.username.split(" ");
  return names.length > 1
    ? `${names[0][0]}${names[1][0]}`.toUpperCase()
    : names[0][0].toUpperCase();
};

  return (
    <div className="admin-dashboard">
      {/* ✅ Top Bar with Profile & Notifications */}
      <div className="top-bar">
        <TopBar />
        <div className="top-right">
          <FaBell className="icon bell-icon" title="Notifications" />
          <div className="profile-container" onClick={() => setShowProfileMenu(!showProfileMenu)}>
  <div className="profile-icon">{getProfileInitials()}</div>
  {showProfileMenu && storedUser && (
    <div className="profile-dropdown">
      <p>{storedUser.username}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )}
</div>
        </div>
      </div>

      <h2>Admin Dashboard</h2>

      {/* ✅ Search & Sorting */}
      <div className="search-filter-container">
        <input type="text" placeholder="Search by Case #, Student..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
        <select onChange={(e) => handleSort(e.target.value)} value={sortBy}>
          <option value="entry_date">Sort by Entry Date</option>
          <option value="grade">Sort by Grade</option>
        </select>
      </div>

      {/* ✅ Assign Course to Teacher */}
      <div className="assign-section">
        <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
          <option value="">-- Select Teacher --</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.username}
            </option>
          ))}
        </select>

        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
          <option value="">-- Select Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.fullname}
            </option>
          ))}
        </select>

        <button onClick={handleAssignCourse}>Assign Course</button>
      </div>

      {/* ✅ Logbook Table */}
      <table>
        <thead>
          <tr>
            <th>Case #</th>
            <th>Entry Date</th>
            <th>Student</th>
            <th>Course</th>
            <th>Task Type</th>
            <th>Grade</th>
            <th>Feedback</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentEntries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.case_number}</td>
              <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
              <td>{entry.student}</td>
              <td>{entry.course}</td>
              <td>{entry.type_of_work}</td>
              <td>{entry.grade || "N/A"}</td>
              <td>{entry.feedback || "No feedback"}</td>
              <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                  {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                </td>
            </tr>
          ))}
        </tbody>
      </table>

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

export default AdminDashboard;
