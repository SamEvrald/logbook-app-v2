import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";
import { FaBell } from "react-icons/fa";
import "../styles/TeacherDashboard.css";
import { useCallback, useMemo } from "react";


const TeacherDashboard = () => {
  const navigate = useNavigate();
  const storedUser = useMemo(() => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }, []);
  
  const token = localStorage.getItem("token");

  const [teacherName] = useState(storedUser?.username || "Unknown");
  const [courses, setCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("entry_date");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;

  // Profile Dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);


  // ✅ Handle Search & Filtering (existing code)
  useEffect(() => {
    let filtered = entries;

    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.type_of_work.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCourse) {
      filtered = filtered.filter((entry) =>
        String(entry.course_id) === String(selectedCourse)
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter((entry) => entry.status === selectedStatus);
    }

    // ✅ Sorting (existing code)
    filtered.sort((a, b) => {
      if (sortBy === "entry_date") {
        const dateA = a.work_completed_date ? new Date(a.work_completed_date) : new Date(0);
        const dateB = b.work_completed_date ? new Date(b.work_completed_date) : new Date(0);
        return dateB - dateA;
      }

      if (sortBy === "grade") {
        const gradeA = parseFloat(a.grade) || 0;
        const gradeB = parseFloat(b.grade) || 0;
        return gradeB - gradeA;
      }

      if (sortBy === "status") {
        if (a.status === b.status) return 0;
        if (a.status === "submitted") return -1;
        if (b.status === "submitted") return 1;
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

    setFilteredEntries(filtered);
  }, [searchQuery, selectedCourse, selectedStatus, sortBy, entries]);


  // 1. Define fetchDashboard first (existing code)
  const fetchDashboard = useCallback(async () => {
    try {
      const coursesResponse = await API.get(`/teachers/${storedUser.email}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(coursesResponse.data.courses || []);

      const entriesResponse = await API.get(`/teachers/${storedUser.email}/entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ Entries Response:", entriesResponse.data.entries);
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
  }, [storedUser?.email, token, navigate]);

  // 2. Then use it in useEffect (existing code)
  useEffect(() => {
    if (!storedUser || storedUser.role !== "teacher" || !token) {
      navigate("/login/teacher");
      return;
    }
    fetchDashboard();
  }, [fetchDashboard, storedUser, token, navigate]);


  // handleGradeEntry (existing code)
  const handleGradeEntry = (entryId) => {
    navigate(`/teacher/grade/${entryId}`);
  };

  // allowResubmission (existing code)
  const allowResubmission = async (entryId) => {
    try {
      const confirm = window.confirm("Are you sure you want to allow resubmission for this entry?");
      if (!confirm) return;

      await API.put(`/teachers/entries/${entryId}/allow-resubmit`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Resubmission allowed.");
      await fetchDashboard();
    } catch (error) {
      console.error("❌ Failed to allow resubmission:", error.response?.data || error.message);
      alert("❌ Failed to allow resubmission.");
    }
  };

  // handleLogout (existing code)
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // getProfileInitials (existing code)
  const getProfileInitials = () => {
    if (!storedUser || !storedUser.username) return "U";
    const names = storedUser.username.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  // handleSearch (existing code)
  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = entries.filter(
      (entry) =>
        entry.case_number.toLowerCase().includes(query.toLowerCase()) ||
        entry.student_name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  // handleFilterCourse (existing code)
  const handleFilterCourse = (courseId) => {
    setSelectedCourse(courseId);
    if (!courseId) {
      setFilteredEntries(entries);
      return;
    }
    const filtered = entries.filter((entry) =>
      String(entry.course_id) === String(courseId)
    );
    setFilteredEntries(filtered);
  };

  // ✅ New: Helper function to format media links for CSV
  const formatMediaLinksForCsv = (mediaLinkJson) => {
    if (!mediaLinkJson) return "N/A";
    try {
      const mediaArray = JSON.parse(mediaLinkJson);
      return mediaArray.join('; '); // Join multiple links with a semicolon for CSV
    } catch {
      return mediaLinkJson; // If it's not JSON, use as-is
    }
  };

  // ✅ New: Helper function to format feedback for CSV
  const formatFeedbackForCsv = (feedbackText) => {
    if (!feedbackText) return "No feedback yet";
    // Remove the "[View Teacher Media](URL)" part from feedback
    const cleanedFeedback = feedbackText.replace(/\[View Teacher Media\]\((https:\/\/res\.cloudinary\.com\/.+?)\)/g, '').trim();
    // Escape double quotes by replacing them with two double quotes, and wrap in quotes if contains commas or newlines
    const escapedFeedback = cleanedFeedback.replace(/"/g, '""');
    return `"${escapedFeedback}"`; // Ensure the whole string is quoted
  };

  // ✅ New: Helper function to format status for CSV display (consistent with dashboard)
  const formatStatusForCsv = (status) => {
    if (status === "graded" || status === "synced") {
      return "Graded";
    } else if (status === "submitted") {
      return "Waiting for Grading";
    } else if (status === "draft") { // Include 'draft' if applicable from student side
        return "Draft";
    }
    return status; // Fallback for any other status
  };

  // ✅ New: Handle Export to CSV
  const handleExportCsv = () => {
    if (filteredEntries.length === 0) {
      alert("No entries to export."); // Or use a state-based message like in AdminDashboard
      return;
    }

    // Define CSV headers relevant for teachers
    const headers = [
      "Case #", "Completion Date", "Student", "Course", "Type Of Task/Device",
      "Description", "Media Links", "Consent", "Comments", "Grade", "Feedback", "Status"
    ];

    // Prepare CSV rows
    const csvRows = [];
    csvRows.push(headers.map(header => `"${header}"`).join(',')); // Add header row, quoted

    filteredEntries.forEach(entry => {
      const row = [
        `"${entry.case_number || ''}"`,
        `"${entry.work_completed_date ? new Date(entry.work_completed_date).toLocaleDateString("en-GB") : "Not Provided"}"`,
        `"${entry.student_name || 'Unknown'}"`,
        `"${entry.course_name || `Course ID ${entry.course_id}`}"`,
        `"${entry.type_of_work || ''}"`,
        `"${entry.task_description || 'No Description'}"`,
        formatMediaLinksForCsv(entry.media_link), // Use helper for media
        `"${entry.consent_form === "yes" ? "Yes" : "No"}"`,
        `"${entry.clinical_info || 'No Info'}"`,
        `"${entry.grade !== null ? entry.grade : "-"}"`,
        formatFeedbackForCsv(entry.feedback), // Use helper for feedback
        `"${formatStatusForCsv(entry.status)}"` // Use helper for status
      ];
      csvRows.push(row.join(','));
    });

    // Create a Blob from the CSV string
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create a download link and trigger click
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'teacher_logbook_entries.csv'); // Different filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href); // Clean up
  };


  // ✅ Pagination Logic (existing code)
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="teacher-dashboard">
      {/* ... (existing Top Bar and Welcome message) ... */}
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
      <h2>Welcome, {teacherName}!</h2>

      {/* ✅ Enhanced Filters */}
      <div className="filters">
        {/* Course Filter */}
        {courses.length > 0 && (
          <select value={selectedCourse} onChange={(e) => handleFilterCourse(e.target.value)}>
            <option value="">-- Filter by Course --</option>
            {[...new Map(courses.map(course => [course.id, course])).values()].map(course => (
              <option key={course.id} value={course.id}>
                {course.fullname}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter */}
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">-- Filter by Status --</option>
          <option value="submitted">Not Graded</option>
          <option value="graded">Graded</option>
          <option value="synced">Graded (Synced)</option> {/* Consider adding 'synced' for completeness */}
          <option value="draft">Draft</option> {/* Consider adding 'draft' if teachers see these */}
        </select>

        {/* Sorting Options */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="entry_date">Sort by Date</option>
          <option value="grade">Sort by Grade</option>
          <option value="status">Sort by Status</option>
        </select>

        {/* Search Box */}
        <input
          type="text"
          placeholder="Search entries..." // Changed placeholder
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {/* ✅ Export to CSV Button */}
        <button onClick={handleExportCsv} className="export-csv-button">Export to CSV</button>
      </div>

      <h3>Submitted Logbook Entries:</h3>
      {loading ? (
        <p>Loading...</p>
      ) : currentEntries.length === 0 ? (
        <p>No entries found.</p>
      ) : (
        <table>
          {/* ... (existing table header) ... */}
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
            {/* ... (existing table rows) ... */}
            {currentEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.case_number || "Not Assigned"}</td>
                <td>{entry.work_completed_date ? new Date(entry.work_completed_date).toLocaleDateString("en-GB") : "Not Provided"}</td>
                <td>{entry.student_name || "Unknown"}</td>
                <td>{entry.course_name || `Course ID ${entry.course_id}`}</td>
                <td>{entry.type_of_work}</td>
                <td>{entry.task_description || "No Description"}</td>
                <td>
                  {(() => {
                    if (!entry.media_link) return "Not Provided";
                    let mediaArray = [];
                    try { mediaArray = JSON.parse(entry.media_link); } catch { mediaArray = [entry.media_link]; }
                    return (
                      <div className="dropdown-container"
                           ref={(el) => {
                             if (el) {
                               const rect = el.getBoundingClientRect();
                               const windowHeight = window.innerHeight;
                               if (rect.bottom + 150 > windowHeight) { el.classList.add("upward"); } else { el.classList.remove("upward"); }
                             }
                           }}>
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
                <td>{entry.clinical_info || "No Info"}</td>
                <td>{entry.grade !== null ? entry.grade : "-"}</td>
                <td className="feedback-cell">
                  {(() => {
                    if (!entry.feedback) return "No feedback yet";
                    const mediaRegex = /\[View Teacher Media\]\((https:\/\/res\.cloudinary\.com\/.+?)\)/;
                    const match = entry.feedback.match(mediaRegex);
                    if (match) {
                      const feedbackText = entry.feedback.replace(mediaRegex, "").trim();
                      const mediaUrl = match[1];
                      return (
                        <div>
                          <p>{feedbackText}</p>
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                            <button className="view-file-btn">View File</button>
                          </a>
                        </div>
                      );
                    }
                    return entry.feedback;
                  })()}
                </td>
                {/* Changed status display to be consistent with Admin Dashboard's robust display */}
                <td style={{ fontWeight: "bold", color:
                  entry.status === "graded" || entry.status === "synced" ? "green" :
                  entry.status === "submitted" ? "orange" :
                  "gray"
                }}>
                  {
                    entry.status === "graded" || entry.status === "synced" ? "Graded" :
                    entry.status === "submitted" ? "Waiting for Grading" :
                    "Draft"
                  }
                </td>
                <td>
                  <button className="grade-btn" onClick={() => handleGradeEntry(entry.id)}>Grade</button>
                  {entry.status === "graded" && !entry.allow_resubmit && (
                    <button
                      className="grade-btn"
                      style={{ backgroundColor: "#2980b9", marginTop: "5px" }}
                      onClick={() => allowResubmission(entry.id)}
                    >
                      Allow Resubmit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination (existing code) */}
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
