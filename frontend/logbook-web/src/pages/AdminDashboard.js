import React, { useState, useEffect } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("entry_date");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEntries();
    fetchTeachers();
    fetchCourses();
  }, []);

  // ✅ Fetch Logbook Entries
  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("❌ No token found. Redirecting to login...");
        navigate("/login/admin");
        return;
      }

      const response = await API.get("/admin/entries", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Entries Response:", response.data);
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token"); // ✅ Retrieve token
      await API.post(
        "/admin/assign-course",
        { teacher_id: selectedTeacher, course_id: selectedCourse },
        { headers: { Authorization: `Bearer ${token}` } } // ✅ Send token
      );

      setMessage("Course assigned successfully!");
      fetchTeachers(); // ✅ Refresh teacher list
    } catch (error) {
      console.error("Failed to assign course:", error);
      setMessage("Failed to assign course.");
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

  // ✅ Handle Filtering by Teacher
  const handleFilterTeacher = (teacherId) => {
    setSelectedTeacher(teacherId);
    if (!teacherId) {
      setFilteredEntries(entries);
      return;
    }
    const filtered = entries.filter((entry) => entry.teacher_id === parseInt(teacherId));
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

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login/admin");
  };

  return (
    <div style={{ maxWidth: "90%", margin: "50px auto", textAlign: "center" }}>
      <h2>Admin Dashboard</h2>

      <button onClick={handleLogout} style={{ float: "right", padding: "5px 10px", backgroundColor: "red", color: "white" }}>
        Logout
      </button>

      {/* ✅ Search, Filters, & Assign Courses */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by Case #, Student..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ padding: "5px", width: "250px", marginRight: "10px" }}
        />

        <select onChange={(e) => handleSort(e.target.value)} value={sortBy} style={{ padding: "5px", marginRight: "10px" }}>
          <option value="entry_date">Sort by Entry Date</option>
          <option value="grade">Sort by Grade</option>
        </select>

       

        <button onClick={handleAssignCourse} style={{ marginTop: "10px", padding: "10px", backgroundColor: "blue", color: "white" }}>
        Assign Course
      </button>

      {/* ✅ Success/Error Message */}
      {message && <p style={{ color: message.includes("Failed") ? "red" : "green" }}>{message}</p>}
    </div>

    {/* ✅ Teacher Selection */}
    <div>
        <label>Select Teacher:</label>
        <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
          <option value="">-- Select a Teacher --</option>
          {Array.isArray(teachers) && teachers.length > 0 ? (
            teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.username} ({teacher.email})
              </option>
            ))
          ) : (
            <option disabled>No teachers available</option> // ✅ Handle empty teacher list
          )}
        </select>
      </div>

      {/* ✅ Course Selection */}
      <div>
        <label>Select Course:</label>
        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
          <option value="">-- Select a Course --</option>
          {Array.isArray(courses) && courses.length > 0 ? (
            courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.fullname}
              </option>
            ))
          ) : (
            <option disabled>No courses available</option> // ✅ Handle empty course list
          )}
        </select>
      </div>

      {/* ✅ Logbook Entries Table */}
      <table border="1" cellPadding="5" style={{ width: "100%", borderCollapse: "collapse" }}>
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
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.case_number}</td>
                <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                <td>{entry.student}</td>
                <td>{entry.course}</td>
                <td>{entry.type_of_work}</td>
                <td>{entry.grade !== null ? entry.grade : "N/A"}</td>
                <td>{entry.feedback || "No feedback"}</td>
                <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                                    {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="8">No entries found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
