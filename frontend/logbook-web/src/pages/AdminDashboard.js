import React, { useState, useEffect } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  // ✅ Fetch Teachers from Backend
  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem("token"); // ✅ Retrieve token
      const response = await API.get("/admin/teachers", {
        headers: { Authorization: `Bearer ${token}` }, // ✅ Send token for authentication
      });

      // ✅ Ensure teachers are always an array
      setTeachers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]); // ✅ Prevent `map` error
      setMessage("Error: Failed to load teachers. Please log in again.");
    }
  };

  // ✅ Fetch Courses from Moodle (Backend)
const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await API.get("/admin/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // ✅ Ensure courses are always an array
      if (!Array.isArray(response.data)) {
        console.error("Invalid courses response:", response.data);
        setMessage("Error: Unexpected response from Moodle.");
        setCourses([]); // Prevent errors
        return;
      }
  
      setCourses(response.data);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      setCourses([]); // Prevent `map` errors
      setMessage("Failed to load courses. Please try again.");
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

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login/admin"); // Redirect to login page
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", textAlign: "center" }}>
      <h2>Admin Dashboard</h2>

      <button onClick={handleLogout} style={{ float: "right", padding: "5px 10px", backgroundColor: "red", color: "white" }}>
        Logout
      </button>

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

      {/* ✅ Assign Course Button */}
      <button onClick={handleAssignCourse} style={{ marginTop: "10px", padding: "10px", backgroundColor: "blue", color: "white" }}>
        Assign Course
      </button>

      {/* ✅ Success/Error Message */}
      {message && <p style={{ color: message.includes("Failed") ? "red" : "green" }}>{message}</p>}
    </div>
  );
};

export default AdminDashboard;
