import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";
import { FaBell } from "react-icons/fa";
import "../styles/TeacherDashboard.css";
import { useCallback, useMemo } from "react";
import { saveAs } from 'file-saver';


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
  const [message, setMessage] = useState("");

  // Pagination state
   const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;

  // Profile Dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ✅ New: Notification state and visibility
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);


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


  // ✅ New: Fetch Notifications for the Teacher (using internal_user_id)
  const fetchNotifications = useCallback(async () => {
    try {
      // Use storedUser.internal_user_id which is set during login for teachers
      if (!storedUser?.internal_user_id) { 
        console.warn("Internal User ID not available for teacher notifications. Cannot fetch notifications.");
        return;
      }
      // Call the new backend route using the internal user ID
      const response = await API.get(`/notifications/teacher/internal/${storedUser.internal_user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch teacher notifications:", error.response?.data || error.message);
    }
  }, [storedUser?.internal_user_id, token]); // Dependency array updated to use internal_user_id


  // 2. Then use it in useEffect (existing code + new notification fetch)
  useEffect(() => {
    if (!storedUser || storedUser.role !== "teacher" || !token) {
      navigate("/login/teacher");
      return;
    }
    fetchDashboard();
    fetchNotifications(); // ✅ Fetch notifications on component mount
  }, [fetchDashboard, fetchNotifications, storedUser, token, navigate]);


  // handleGradeEntry (existing code)
  const handleGradeEntry = (entryId) => {
    navigate(`/teacher/grade/${entryId}`);
  };

  // allowResubmission (existing code)
  const allowResubmission = async (entryId) => {
    try {
      const confirmAllowance = window.confirm("Are you sure you want to allow resubmission for this entry?");
      if (!confirmAllowance) return;

      await API.put(`/teachers/entries/${entryId}/allow-resubmit`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Resubmission allowed.");
      await fetchDashboard(); // Refresh entries
      await fetchNotifications(); // ✅ Also refresh notifications
    } catch (error) {
      console.error("❌ Failed to allow resubmission:", error.response?.data || error.message);
      alert("❌ Failed to allow resubmission.");
    }
  };

  // handleLogout (existing code)
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
    // Filtering handled by useEffect now
  };

  // handleFilterCourse (existing code)
  const handleFilterCourse = (courseId) => {
    setSelectedCourse(courseId);
    // Filtering handled by useEffect now
  };

  // ✅ New: Helper function to format media links for CSV
  const formatMediaLinksForCsv = (mediaLinkJson) => {

    if (!mediaLinkJson) return "N/A";

    try {

      const mediaArray = JSON.parse(mediaLinkJson);

      return mediaArray.join('; ');

    } catch {

      return mediaLinkJson;

    }

  };



  const formatFeedbackForCsv = (feedbackText) => {

    if (!feedbackText) return "No feedback yet";

    const mediaRegex = /📎\s*\[View Teacher Media\]\((https:\/\/res\.cloudinary\.com\/.+?)\)/;

    const cleanedFeedback = feedbackText.replace(mediaRegex, "").trim();

    const escapedFeedback = cleanedFeedback.replace(/"/g, '""');

    return `"${escapedFeedback}"`;

  };



  const formatStatusForCsv = (status) => {

    if (status === "graded" || status === "synced") {

      return "Graded";

    } else if (status === "submitted") {

      return "Waiting for Grading";

    }

    return status;

  };



  // ✅ Handle Export to CSV - ADDED Entry Date and Allow Resubmit

  const handleExportCsv = useCallback(() => {
    if (filteredEntries.length === 0) {
      setMessage("No entries to export.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const headers = [
      "Case #",
      "Entry Date",
      "Completion Date",
      "Student",
      "Course",
      "Type Of Task/Device",
      "Description",
      "Media Links",
      "Consent",
      "Comments",
      "Grade",
      "Teacher Media Link",
      "Feedback",
      "Status",
      "Allow Resubmit",
    ];

    const csvRows = [];
    csvRows.push(headers.map(header => `"${header}"`).join(','));

    filteredEntries.forEach(entry => {
      // ✅ Entry Date Logic: If entry.entry_date is falsy, set to "Not Provided" (or ""). Otherwise, try to format.
      let entryDateFormatted = entry.entry_date
        ? (new Date(entry.entry_date).toLocaleDateString() || "Invalid Date")
        : "Not Provided"; // Default to "Not Provided" if entry_date is null/empty/undefined

      // ✅ Completion Date Logic: Keep as is, but ensure it defaults to "Not Provided" if empty.
      let completionDateFormatted = entry.work_completed_date
        ? (new Date(entry.work_completed_date).toLocaleDateString("en-GB") || "Invalid Date")
        : "Not Provided";


      const row = [
        `"${entry.case_number || ''}"`,
        `"${entryDateFormatted}"`, // Use the safely formatted entry date
        `"${completionDateFormatted}"`, // Use the safely formatted completion date
        `"${entry.student_name || 'Unknown'}"`,
        `"${entry.course_name || `Course ID ${entry.course_id}`}"`,
        `"${entry.type_of_work || ''}"`,
        `"${entry.task_description || 'No Description'}"`,
        formatMediaLinksForCsv(entry.media_link),
        `"${entry.consent_form === "yes" ? "Yes" : "No"}"`,
        `"${entry.clinical_info || 'No Info'}"`,
        `"${entry.grade !== null ? entry.grade : "-"}"`,
        `"${entry.teacher_media_link || "N/A"}"`,
        formatFeedbackForCsv(entry.feedback),
        `"${formatStatusForCsv(entry.status)}"`,
        `"${entry.allow_resubmit === 1 ? "Yes" : "No"}"`
      ];
      csvRows.push(row.join(','));
    });

     const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "teacher_logbook_entries.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [filteredEntries]);

  // ✅ Pagination Logic (existing code)
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);


  // ✅ New: Handle marking notification as read
  const markAsRead = async (notificationId) => {
    try {
      // This route is generic for both student/teacher, relies on req.user.moodle_id from token
      // For teachers, req.user.moodle_id will be NULL, but their internal user ID should be used
      // So markNotificationAsRead needs to be robust for NULL moodle_id or handle based on internal_user_id
      // Let's assume the auth middleware provides internal_user_id on req.user for teachers
      await API.put(`/notifications/${notificationId}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications(); // Refresh notifications after marking one as read
    } catch (error) {
      console.error("❌ Failed to mark notification as read:", error.response?.data || error.message);
    }
  };


  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;


  return (
    <div className="teacher-dashboard">
      <div className="top-bar">
        <TopBar />
        <div className="top-right">
          <div className="notifications-container" style={{ position: 'relative' }}>
                      <FaBell
                        className="icon bell-icon"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                      />
                      {unreadNotificationsCount > 0 && (
                        <span className="notification-count">{unreadNotificationsCount}</span>
                      )}
                      {showNotifications && (
                        <div className="notifications-dropdown">
                          {notifications.length === 0 ? (
                            <p>No new notifications.</p>
                          ) : (
                            <ul>
                              {notifications.map((notification) => (
                                <li key={notification.id} className={notification.is_read ? "read" : "unread"}>
                                  <span className="message">{notification.message}</span>
                                  {!notification.is_read && (
                                    <button onClick={() => markAsRead(notification.id)}>Mark as Read</button>
                                  )}
                                  <span className="timestamp">{new Date(notification.timestamp).toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    

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
          <option value="synced">Graded (Synced)</option>
          {/* Removed: <option value="draft">Draft</option> */}
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
          placeholder="Search entries..."
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
                <td>
                                <div>
                                    {entry.feedback || "No feedback yet"} {/* Display text feedback */}
                                    {entry.teacher_media_link && (
                                        <div style={{ marginTop: "5px" }}>
                                            <button
                                                style={{
                                                    padding: "5px 10px",
                                                    fontSize: "0.9em",
                                                    cursor: "pointer",
                                                    backgroundColor: '#2980b9', // Blue for the button
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
                <td style={{ fontWeight: "bold", color:
                  entry.status === "graded" || entry.status === "synced" ? "green" :
                  entry.status === "submitted" ? "orange" :
                  "gray" // Fallback for any unexpected status
                }}>
                  {
                    entry.status === "graded" || entry.status === "synced" ? "Graded" :
                    entry.status === "submitted" ? "Waiting for Grading" :
                    entry.status // Display the actual status if it's not one of the main ones
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                    {/* The Grade button should always be there */}
                    <button className="grade-btn" onClick={() => handleGradeEntry(entry.id)}>Grade</button>

                    {/* Show Allow Resubmit button or "Resubmission Allowed" text if entry is graded/synced */}
                    {(entry.status === "graded" || entry.status === "synced") && (
                      entry.allow_resubmit ? ( // If allow_resubmit is true (1)
                        <span style={{color: 'gray', fontSize: '0.9em', whiteSpace: 'nowrap' }}>Resubmission Allowed</span>
                      ) : ( // If allow_resubmit is false (0)
                        <button
                          className="grade-btn"
                          style={{ backgroundColor: "#2980b9" }}
                          onClick={() => allowResubmission(entry.id)}
                        >
                          Allow Resubmit
                        </button>
                      )
                    )}
                  </div>
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
