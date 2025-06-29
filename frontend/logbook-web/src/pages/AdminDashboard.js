import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { FaBell, FaBars, FaTimes } from "react-icons/fa"; // ✅ Import FaBars and FaTimes
import "../styles/AdminDashboard.css"; // ✅ Import CSS
import Footer from "../components/Footer"; // ✅ Import Footer
import TopBar from "../components/Shared/TopBar"; // ✅ Import TopBar

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
  const [moodleInstances, setMoodleInstances] = useState([]); // ✅ Store Moodle instances
  const [selectedMoodleInstance, setSelectedMoodleInstance] = useState(""); // ✅ Track selected Moodle instance

  // These seem redundant if `teachers` and `courses` are used directly
  // Consider removing if not explicitly used, or clarify their purpose.
  const [allStudents, setAllStudents] = useState([]); // This is not being fetched in your current code. You would need a fetchAllStudents function.
  const [allTeachers, setAllTeachers] = useState([]); // This is similar to `teachers` state, potential redundancy.
  const [allCourses, setAllCourses] = useState([]);   // This is similar to `courses` state, potential redundancy.

   // ✅ NEW STATE: To control panel visibility
  const [isPanelHidden, setIsPanelHidden] = useState(false); // true to hide by default

  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;
  const [showProfileMenu, setShowProfileMenu] = useState(false); // ✅ Profile Dropdown

  // ✅ NEW STATE: To control which view is displayed
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

  // Helper function to format feedback for CSV (modified to clean up UI elements as discussed previously)
  const formatFeedbackForCsv = (feedbackText) => {
    if (!feedbackText) return "No feedback yet";
    // Remove the "📎 [View Teacher Media](URL)" part
    let cleanedFeedback = feedbackText;
    const linkPattern = /📎\s*\[View Teacher Media\]\s*\([^)]+\)/;
    if (linkPattern.test(feedbackText)) {
      cleanedFeedback = feedbackText.replace(linkPattern, "").trim();
    }
    // Escape double quotes by replacing them with two double quotes, and wrap in quotes if contains commas or newlines
    const escapedFeedback = cleanedFeedback.replace(/"/g, '""');
    return `"${escapedFeedback}"`; // Ensure the whole string is quoted
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

  // ✅ Handle Export to CSV for Admin Dashboard
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
      "Assigned Teacher", // This refers to the teacher associated with *this specific entry*
      "Teacher ID",
      "Task Type",
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
      // Find full student and teacher details if necessary, using IDs
      // Note: allStudents and allTeachers are not currently fetched in your useEffects.
      // If you want accurate names from these lists, you'll need to fetch them.
      const studentInfo = allStudents.find((s) => s.id === entry.student_id);
      const teacherInfo = allTeachers.find((t) => t.id === entry.teacher_id);
      const courseInfo = allCourses.find((c) => c.id === entry.course_id); // Assuming allCourses is populated

      const row = [
        `"${entry.id || ""}"`,
        `"${entry.case_number || ""}"`,
        `"${new Date(entry.entry_date).toLocaleDateString() || ""}"`,
        `"${
          entry.work_completed_date
            ? new Date(entry.work_completed_date).toLocaleDateString("en-GB")
            : "Not Provided"
        }"`,
        `"${studentInfo?.username || entry.student || "Unknown"}"`, // Use studentInfo if available, fallback to entry.student
        `"${entry.student_id || ""}"`,
        `"${courseInfo?.fullname || entry.course || "Unknown"}"`, // Use courseInfo if available, fallback to entry.course
        `"${entry.course_id || ""}"`,
        `"${teacherInfo?.username || entry.teacher_name || "Unknown"}"`, // Use teacherInfo if available, fallback to entry.teacher_name
        `"${entry.teacher_id || ""}"`,
        `"${entry.type_of_work || ""}"`,
        `"${entry.task_description || "No Description"}"`,
        formatMediaLinksForCsv(entry.media_link),
        `"${entry.consent_form === "yes" ? "Yes" : "No"}"`,
        `"${entry.clinical_info || "No Info"}"`,
        `"${entry.grade !== null ? entry.grade : "N/A"}"`,
        formatFeedbackForCsv(entry.feedback), // Includes full feedback text with potential URLs
        `"${formatStatusForCsv(entry.status)}"`,
        `"${entry.allow_resubmit ? "Yes" : "No"}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "admin_logbook_entries_detailed.csv"); // Distinct filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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

  // // ✅ Logout Function
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("courses");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ✅ NEW: Toggle function for the left panel
  const togglePanel = () => {
    setIsPanelHidden(!isPanelHidden);
  };
  // ✅ Pagination Logic
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
      console.log("🔍 Fetching Moodle instances...");
      const response = await API.get("/moodle/instances", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Moodle Instances Fetched:", response.data);
      setMoodleInstances(response.data);
    } catch (error) {
      console.error(
        "❌ Failed to fetch Moodle instances:",
        error.response?.data || error.message
      );
    }
  };

  // ✅ Fetch Logbook Entries (MODIFIED to run only when needed)
  const fetchEntries = async () => {
    try {
      const response = await API.get("/admin/entries", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ CORRECTED LINE: Access the 'entries' array from response.data
      const fetchedEntries = response.data.entries || [];

      setEntries(fetchedEntries);
      setFilteredEntries(fetchedEntries); // This will now correctly be an array
    } catch (error) {
      console.error(
        "❌ Failed to fetch entries:",
        error.response?.data || error.message
      );
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
      setAllTeachers(Array.isArray(response.data) ? response.data : []); // Populate allTeachers for export
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]);
      setAllTeachers([]);
    }
  };

  // ✅ Fetch Courses
  const fetchCourses = async (moodleInstanceId) => {
    if (!moodleInstanceId) {
      console.warn("⚠️ No Moodle instance selected. Skipping course fetch.");
      setCourses([]);
      setAllCourses([]); // Clear allCourses as well
      return;
    }

    try {
      console.log(`🔍 Fetching courses for Moodle Instance ID: ${moodleInstanceId}`);

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

      // ✅ Extract courses from response (check if API is returning a nested structure)
      const extractedCourses = Object.values(response.data).flat();

      if (!Array.isArray(extractedCourses) || extractedCourses.length === 0) {
        console.warn("⚠️ No courses available for this Moodle instance.");
        setCourses([]);
        setAllCourses([]);
        return;
      }

      setCourses(extractedCourses);
      setAllCourses(extractedCourses); // Populate allCourses for export
      console.log(`✅ Courses fetched successfully:`, extractedCourses);
    } catch (error) {
      console.error("❌ Failed to fetch courses:", error.response?.data || error.message);
      setCourses([]);
      setAllCourses([]);
    }
  };

  // ✅ Assign Course to Teacher
  const handleAssignCourse = async () => {
    if (!selectedTeacher || !selectedCourse || !selectedMoodleInstance) {
      setMessage("❌ Please select a teacher, course, and Moodle instance.");
      return;
    }

    try {
      await API.post(
        "/admin/assign-course",
        { teacher_id: selectedTeacher, course_id: selectedCourse, moodle_instance_id: selectedMoodleInstance },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("✅ Course assigned successfully!");

      // ✅ Reset fields after success
      setSelectedTeacher("");
      setSelectedCourse("");
      setSelectedMoodleInstance("");

      // ✅ Refresh the teacher list
      fetchTeachers();

      // ✅ Automatically clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("❌ Failed to assign course:", error);
      setMessage("❌ Failed to assign course. Please try again.");

      // ✅ Automatically clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    }
  };

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
    }
    // Fetch teachers and moodle instances once on component mount,
    // as they are needed for the "Assign Courses" section regardless of initial view.
    fetchTeachers();
    fetchMoodleInstances();
  }, [token, navigate, currentView]); // Added currentView to dependencies to re-fetch entries when switching to it

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
         {/* ✅ NEW LOCATION FOR PANEL TOGGLE ICON */}
        {/* This wrapper will be positioned to appear next to 'Admin Actions' */}
        <div className="panel-toggle-wrapper">
          <div className="panel-toggle-icon" onClick={togglePanel}>
            {isPanelHidden ? <FaBars title="Show Menu" /> : <FaTimes title="Hide Menu" />}
          </div>
        </div>
        {/* Left Navigation Panel - Conditionally render */}
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
              onClick={() => navigate("/signup/teacher")} /* Direct navigation from here */
            >
              Create Teacher
            </button>
            <button
              className={currentView === "createAdmin" ? "active" : ""}
              onClick={() => navigate("/signup/admin")} /* Direct navigation from here */
            >
              Create Admin
            </button>
          </div>
        )}

        {/* Main Content Area - Expands when panel is hidden */}
        <div className="main-content-panel">
          {/* Your existing conditional rendering for currentView */}
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
                    <th>Task Type</th>
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
                                    {entry.feedback || "No feedback yet"} {/* Display text feedback */}
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

          {/* Moved direct navigation to buttons, so removed these divs */}
          {/* The createTeacher/createAdmin buttons in the left panel now directly navigate */}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
