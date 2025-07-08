import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { FaBell, FaBars, FaTimes } from "react-icons/fa"; 
import "../styles/AdminDashboard.css"; 
import Footer from "../components/Footer"; 
import TopBar from "../components/Shared/TopBar"; 


import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';



const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("entry_date");
  const [message, setMessage] = useState("");
  const [moodleInstances, setMoodleInstances] = useState([]); 
  const [selectedMoodleInstance, setSelectedMoodleInstance] = useState(""); 

  
  const [allStudents, setAllStudents] = useState([]); 
  const [allTeachers, setAllTeachers] = useState([]); 
  const [allCourses, setAllCourses] = useState([]);   

    //ANALYTICS STATES
  const [totalStudents, setTotalStudents] = useState(0);
  const [entriesPerCourseData, setEntriesPerCourseData] = useState([]);
  const [entriesByMonthData, setEntriesByMonthData] = useState([]);
  const [entryStatusSummaryData, setEntryStatusSummaryData] = useState([]);

  // Colors for Pie Chart
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

   //  NEW STATE: To control panel visibility
  const [isPanelHidden, setIsPanelHidden] = useState(false); // true to hide by default

  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;
  const [showProfileMenu, setShowProfileMenu] = useState(false); 

  
  const [currentView, setCurrentView] = useState("logbookEntries"); // Default view: Logbook Entries

  // Helper function to format media links for CSV (same as before)
  const formatMediaLinksForCsv = (mediaLinkJson) => {
    if (!mediaLinkJson) return "N/A";
    try {
      const mediaArray = JSON.parse(mediaLinkJson);
      return mediaArray.join("; ");
    } catch {
      return mediaLinkJson;
    }
  };

  // Function to display a custom message box (ADDED)
  const showCustomMessageBox = (msg, type = 'success') => {
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      padding: 20px 30px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      z-index: 1000;
      text-align: center;
      font-size: 1.1em;
      font-weight: bold;
      color: ${type === 'success' ? '#27ae60' : '#e74c3c'}; /* Green for success, Red for error */
      border: 2px solid ${type === 'success' ? '#27ae60' : '#e74c3c'};
      max-width: 350px;
      opacity: 0; /* Start hidden for fade-in */
      transition: opacity 0.3s ease-in-out;
    `;
    messageBox.textContent = msg;
    document.body.appendChild(messageBox);

    // Fade in
    setTimeout(() => {
      messageBox.style.opacity = 1;
    }, 10); // Small delay to trigger transition

    // Fade out and remove after a few seconds
    setTimeout(() => {
      messageBox.style.opacity = 0;
      setTimeout(() => {
        if (document.body.contains(messageBox)) {
          document.body.removeChild(messageBox);
        }
      }, 300); // Wait for fade-out transition
    }, 3000); // Display for 3 seconds
  };

  // Helper function to format feedback for CSV (modified to clean up UI elements as discussed previously)
  const formatFeedbackForCsv = (feedbackText) => {
    if (!feedbackText) return "No feedback yet";
    
    let cleanedFeedback = feedbackText;
    const linkPattern = /📎\s*\[View Teacher Media\]\s*\([^)]+\)/;
    if (linkPattern.test(feedbackText)) {
      cleanedFeedback = feedbackText.replace(linkPattern, "").trim();
    }
    
    const escapedFeedback = cleanedFeedback.replace(/"/g, '""');
    return `"${escapedFeedback}"`; 
  };

  // Helper function to format status for CSV (same as before)
  const formatStatusForCsv = (status) => {
    if (status === "graded" || status === "synced") {
      return "Graded";
    } else if (status === "submitted") {
      return "Waiting for Grading";
    } else if (status === "draft") {
      return "Draft";
    }
    return status;
  };

  // Handle Export to CSV for Admin Dashboard
  const handleExportCsv = () => {
    if (filteredEntries.length === 0) {
      setMessage("No entries to export.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Define CSV headers with more detailed information
    const headers = [
      "Entry ID",
      "Case #",
      "Entry Date",
      "Completion Date",
      "Student Name",
      "Student ID",
      "Course Name",
      "Course ID",
      "Assigned Teacher", 
      "Teacher ID",
      "Activity",
      "Task",
      "Description",
      "Media Links",
      "Consent Form",
      "Clinical Info (Comments)",
      "Grade",
      "Feedback",
      "Status",
      "Allow Resubmit",
    ];

    // Prepare CSV rows
    const csvRows = [];
    csvRows.push(headers.map((header) => `"${header}"`).join(",")); // Add header row, quoted

    filteredEntries.forEach((entry) => {
    
      const studentInfo = allStudents.find((s) => s.id === entry.student_id);
      const teacherInfo = allTeachers.find((t) => t.id === entry.teacher_id);
      const courseInfo = allCourses.find((c) => c.id === entry.course_id); 

      const row = [
        `"${entry.id || ""}"`,
        `"${entry.case_number || ""}"`,
        `"${new Date(entry.entry_date).toLocaleDateString() || ""}"`,
        `"${
          entry.work_completed_date
            ? new Date(entry.work_completed_date).toLocaleDateString("en-GB")
            : "Not Provided"
        }"`,
        `"${studentInfo?.username || entry.student || "Unknown"}"`, 
        `"${entry.student_id || ""}"`,
        `"${courseInfo?.fullname || entry.course || "Unknown"}"`, 
        `"${entry.course_id || ""}"`,
        `"${teacherInfo?.username || entry.teacher_name || "Unknown"}"`, 
        `"${entry.teacher_id || ""}"`,
        `"${entry.type_of_work || ""}"`,
        `"${entry.task_type || ''}"`,
        `"${entry.task_description || "No Description"}"`,
        formatMediaLinksForCsv(entry.media_link),
        `"${entry.consent_form === "yes" ? "Yes" : "No"}"`,
        `"${entry.clinical_info || "No Info"}"`,
        `"${entry.grade !== null ? entry.grade : "N/A"}"`,
        formatFeedbackForCsv(entry.feedback), 
        `"${formatStatusForCsv(entry.status)}"`,
        `"${entry.allow_resubmit ? "Yes" : "No"}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "admin_logbook_entries_detailed.csv"); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Handle Search
  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = entries.filter(
      (entry) =>
        entry.case_number.toLowerCase().includes(query.toLowerCase()) ||
        entry.student.toLowerCase().includes(query.toLowerCase()) ||
        entry.type_of_work.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.task_type && entry.task_type.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredEntries(filtered);
  };

  //  Handle Sorting
  const handleSort = (criteria) => {
    setSortBy(criteria);

    const sorted = [...filteredEntries].sort((a, b) => {
      // Sort by entry date (newest first)
      if (criteria === "entry_date") {
        const dateA = a.entry_date ? new Date(a.entry_date) : new Date(0);
        const dateB = b.entry_date ? new Date(b.entry_date) : new Date(0);
        return dateB - dateA;
      }

      // Sort by grade (highest first)
      if (criteria === "grade") {
        const gradeA = parseFloat(a.grade) || 0;
        const gradeB = parseFloat(b.grade) || 0;
        return gradeB - gradeA;
      }

      // Sort by student name (A-Z)
      if (criteria === "student") {
        // Handle missing student names by putting them last
        if (!a.student && !b.student) return 0;
        if (!a.student) return 1;
        if (!b.student) return -1;

        return a.student.localeCompare(b.student);
      }

      return 0;
    });

    setFilteredEntries(sorted);
  };

  //  Logout Function
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("courses");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Toggle function for the left panel
  const togglePanel = () => {
    setIsPanelHidden(!isPanelHidden);
  };
  // Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = Array.isArray(filteredEntries)
    ? filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry)
    : [];
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate Profile Initials
  const getProfileInitials = () => {
    if (!storedUser || !storedUser.username) return "A";
    const names = storedUser.username.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  const fetchMoodleInstances = async () => {
    try {
      console.log(" Fetching Moodle instances...");
      const response = await API.get("/moodle/instances", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(" Moodle Instances Fetched:", response.data);
      setMoodleInstances(response.data);
    } catch (error) {
      console.error(
        "❌ Failed to fetch Moodle instances:",
        error.response?.data || error.message
      );
    }
  };

  // Fetch Logbook Entries (MODIFIED to run only when needed)
  const fetchEntries = async () => {
    try {
      const response = await API.get("/admin/entries", {
        headers: { Authorization: `Bearer ${token}` },
      });

      
      const fetchedEntries = response.data.entries || [];

      setEntries(fetchedEntries);
      setFilteredEntries(fetchedEntries);
    } catch (error) {
      console.error(
        "❌ Failed to fetch entries:",
        error.response?.data || error.message
      );
      setMessage("Error: Failed to load logbook entries. Please log in again.");
    }
  };

  //  Fetch Teachers
  const fetchTeachers = async () => {
    try {
      const response = await API.get("/admin/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTeachers(Array.isArray(response.data) ? response.data : []);
      setAllTeachers(Array.isArray(response.data) ? response.data : []); 
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]);
      setAllTeachers([]);
    }
  };

  // Fetch Courses
  const fetchCourses = async (moodleInstanceId) => {
    if (!moodleInstanceId) {
      console.warn("⚠️ No Moodle instance selected. Skipping course fetch.");
      setCourses([]);
      setAllCourses([]); 
      return;
    }

    try {
      console.log(` Fetching courses for Moodle Instance ID: ${moodleInstanceId}`);

      const response = await API.get(
        `/admin/courses?moodle_instance_id=${moodleInstanceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data || typeof response.data !== "object") {
        console.error("❌ Invalid courses response:", response.data);
        setCourses([]);
        setAllCourses([]);
        return;
      }

      // Extract courses from response (check if API is returning a nested structure)
      const extractedCourses = Object.values(response.data).flat();

      if (!Array.isArray(extractedCourses) || extractedCourses.length === 0) {
        console.warn("⚠️ No courses available for this Moodle instance.");
        setCourses([]);
        setAllCourses([]);
        return;
      }

      setCourses(extractedCourses);
      setAllCourses(extractedCourses); // Populate allCourses for export
      console.log(` Courses fetched successfully:`, extractedCourses);
    } catch (error) {
      console.error("❌ Failed to fetch courses:", error.response?.data || error.message);
      setCourses([]);
      setAllCourses([]);
    }
  };

  //  Assign Course to Teacher
  const handleAssignCourse = async () => {
    if (!selectedTeacher || !selectedCourse || !selectedMoodleInstance) {
      showCustomMessageBox("❌ Please select a teacher, course, and Moodle instance.", 'error');
      return;
    }

    try {
      await API.post(
        "/admin/assign-course",
        { teacher_id: selectedTeacher, course_id: selectedCourse, moodle_instance_id: selectedMoodleInstance },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showCustomMessageBox(" Course assigned successfully!");

      //  Reset fields after success
      setSelectedTeacher("");
      setSelectedCourse("");
      setSelectedMoodleInstance("");

      //  Refresh the teacher list
      fetchTeachers();

      //  Automatically clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("❌ Failed to assign course:", error);
      setMessage("❌ Failed to assign course. Please try again.");

      //  Automatically clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Fetch Analytics Data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setMessage("Loading analytics...");
      const [
        totalStudentsRes,
        entriesPerCourseRes,
        entriesByMonthRes,
        entryStatusSummaryRes
      ] = await Promise.all([
        API.get("/admin/analytics/total-students", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/admin/analytics/entries-per-course", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/admin/analytics/entries-by-month", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/admin/analytics/entry-status-summary", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setTotalStudents(totalStudentsRes.data.totalStudents);
      setEntriesPerCourseData(entriesPerCourseRes.data.entriesPerCourse);
      setEntriesByMonthData(entriesByMonthRes.data.entriesByMonth);
      setEntryStatusSummaryData(entryStatusSummaryRes.data.entryStatusSummary);
      setMessage("Analytics loaded.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("❌ Failed to fetch analytics data:", error.response?.data || error.message);
      setMessage("❌ Failed to load analytics data.");
      setTimeout(() => setMessage(""), 3000);
    }
  }, [token]);

  // Main useEffect for initial data fetches based on currentView
  useEffect(() => {
    if (!token) {
      console.error("❌ No token found. Redirecting to login...");
      navigate("/login/admin");
      return;
    }

    // Fetch entries only when the logbookEntries view is active
    if (currentView === "logbookEntries") {
      fetchEntries();
    } else if (currentView === "analytics") { 
      fetchAnalyticsData();
    }
    // Fetch teachers and moodle instances once on component mount,
    // as they are needed for the "Assign Courses" section regardless of initial view.
    fetchTeachers();
    fetchMoodleInstances();
  }, [token, navigate, currentView]); 

  // Fetch courses whenever selected Moodle instance changes
  useEffect(() => {
    if (selectedMoodleInstance) {
      fetchCourses(selectedMoodleInstance);
    } else {
      setCourses([]); // Clear courses if no Moodle instance is selected
    }
  }, [selectedMoodleInstance, token]);


  return (
    <div className="admin-dashboard">
      {/* Top Bar with Profile & Notifications */}
      <div className="top-bar">
        <TopBar />
        <div className="top-right">
          

          <FaBell className="icon bell-icon" title="Notifications" />
          <div className="profile-container">
            <div
              className="profile-icon"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              {getProfileInitials()}
            </div>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <p>{storedUser?.username}</p>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2>Admin Dashboard</h2>
      {message && <p style={{ color: message.startsWith("✅") ? "green" : "red", fontWeight: "bold" }}>{message}</p>}

      {/* Main Container for Panels - Apply class based on panel state */}
      <div className={`dashboard-panels-container ${isPanelHidden ? "panel-hidden" : ""}`}>
        
        <div className="panel-toggle-wrapper">
          <div className="panel-toggle-icon" onClick={togglePanel}>
            {isPanelHidden ? <FaBars title="Show Menu" /> : <FaTimes title="Hide Menu" />}
          </div>
        </div>
        
        {!isPanelHidden && (
          <div className="left-panel">
            <h3>Admin Actions</h3>
            <button
              className={currentView === "logbookEntries" ? "active" : ""}
              onClick={() => setCurrentView("logbookEntries")}
            >
              Logbook Entries
            </button>
            <button
              className={currentView === "assignCourses" ? "active" : ""}
              onClick={() => setCurrentView("assignCourses")}
            >
              Assign Courses
            </button>
            <button
              className={currentView === "createTeacher" ? "active" : ""}
              onClick={() => navigate("/signup/teacher")} 
            >
              Create Teacher
            </button>
            <button
              className={currentView === "createAdmin" ? "active" : ""}
              onClick={() => navigate("/signup/admin")} 
            >
              Create Admin
            </button>

           
            <button
              className={currentView === "analytics" ? "active" : ""}
              onClick={() => setCurrentView("analytics")}
            >
              Analytics
            </button>
          </div>
        )}

       
        <div className="main-content-panel">
          
          {currentView === "logbookEntries" && (
            <>
              <h3>    Logbook Entries</h3>
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Search by Case #, Student..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <select onChange={(e) => handleSort(e.target.value)} value={sortBy}>
                  <option value="entry_date">Sort by Entry Date</option>
                  <option value="grade">Sort by Grade</option>
                  <option value="student">Sort by Student (A-Z)</option>
                </select>
                <button onClick={handleExportCsv} className="export-csv-button">
                  Export to CSV
                </button>
              </div>

              {/* Logbook Table */}
              <table>
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Entry Date</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Activity</th>
                    <th>Task</th>
                    <th>Media</th>
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
                      <td>{entry.task_type || "N/A"}</td> 
                      <td>
                        {(() => {
                          if (!entry.media_link) return "Not Provided";
                          let mediaArray = [];
                          try { mediaArray = JSON.parse(entry.media_link); } catch { mediaArray = [entry.media_link]; }
                          return (
                            <div className="dropdown-container" ref={(el) => { if (el) { const rect = el.getBoundingClientRect(); const windowHeight = window.innerHeight; if (rect.bottom + 150 > windowHeight) { el.classList.add("upward"); } else { el.classList.remove("upward"); } } }}>
                              <button className="dropdown-button">View Files</button>
                              <div className="dropdown-content">
                                {mediaArray.map((url, idx) => (<a key={idx} href={url} target="_blank" rel="noopener noreferrer">File {idx + 1}</a>))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>{entry.grade || "N/A"}</td>
                     <td>
                                <div>
                                    {entry.feedback || "No feedback"} {/* Display text feedback */}
                                    {entry.teacher_media_link && (
                                        <div style={{ marginTop: "5px" }}>
                                            <button
                                                style={{
                                                    padding: "6px 12px",
                                                    fontSize: "0.9em",
                                                    cursor: "pointer",
                                                    backgroundColor: '#27ae60', // Blue for the button
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                                onMouseOver={(e) => e.target.style.backgroundColor = '#2c3e50'}
                                                onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
                                                onClick={() => window.open(entry.teacher_media_link, "_blank")}
                                            >
                                                View File
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </td>
                      <td style={{ fontWeight: "bold", color: entry.status === "graded" || entry.status === "synced" ? "green" : "orange" }}>
                        {entry.status === "graded" || entry.status === "synced" ? "Graded" : "Waiting for Grading"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                {Array.from({ length: Math.ceil(filteredEntries.length / entriesPerPage) }, (_, i) => (<button key={i + 1} onClick={() => paginate(i + 1)}>{i + 1}</button>))}
              </div>
            </>
          )}

          {currentView === "assignCourses" && (
            <>
              <h3>Assign Course to Teacher</h3>
              <div className="assign-section">
                <div>
                  <label>Select Program:</label>
                  <select value={selectedMoodleInstance} onChange={(e) => { setSelectedMoodleInstance(e.target.value); }}>
                    <option value="">-- Select Program --</option>
                    {moodleInstances.map((instance) => (<option key={instance.id} value={instance.id}>{instance.name} ({instance.base_url})</option>))}
                  </select>
                </div>
                <div>
                  <label>Select Course:</label>
                  {courses.length > 0 ? (<select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">-- Select Course --</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.fullname || course.shortname}</option>))}</select>) : (<p style={{ color: "red" }} className="course-error">❌ No courses available for this Moodle instance.</p>)}
                </div>
                <div>
                  <label>Select Teacher:</label>
                  <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((teacher) => (<option key={teacher.id} value={teacher.id}>{teacher.username}</option>))}
                  </select>
                </div>
                <button onClick={handleAssignCourse}>Assign Course</button>
              </div>
            </>
          )}

     
          {currentView === "analytics" && (
            <div className="analytics-section">
              <h3>Dashboard Analytics</h3>
              {message && <p style={{ color: message.startsWith("✅") ? "green" : "red", fontWeight: "bold" }}>{message}</p>}

              <div className="analytics-summary">
                <div className="summary-card">
                  <h4>Total Students</h4>
                  <p>{totalStudents}</p>
                </div>
              </div>

              <div className="charts-container">
                <div className="chart-card">
                  <h4>Entries per Course</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={entriesPerCourseData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="courseName" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalEntries" fill="#8884d8" name="Total Entries" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h4>Entries by Month ({new Date().getFullYear()})</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={entriesByMonthData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthYear" tickFormatter={(tick) => {
                        const [year, month] = tick.split('-');
                        return new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
                      }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="totalEntries" stroke="#82ca9d" name="Total Entries" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h4>Entry Status Summary</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={entryStatusSummaryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {entryStatusSummaryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
