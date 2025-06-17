import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/StudentDashboard.css";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";
import { FaBell } from "react-icons/fa";


const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = useMemo(() => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }, []);
  const storedCourses = useMemo(() => {
    const courses = localStorage.getItem("courses");
    return courses ? JSON.parse(courses) : null;
  }, []);
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(storedUser);
  const [courses, setCourses] = useState(storedCourses || []);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;

  // Profile Dropdown & Notifications state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);


  // Memoize fetchCourses for useCallback dependencies
  const fetchCourses = useCallback(async () => {
    try {
        const response = await API.get("/student/courses", {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log("📚 Courses Fetched from Backend:", response.data);
        setCourses(response.data);
    } catch (error) {
        console.error("❌ Failed to fetch student courses:", error);
    }
  }, [token]);


  // Memoize fetchEntries for useCallback dependencies
  const fetchEntries = useCallback(async () => {
    try {
      if (!user?.moodle_id) { // Ensure user.moodle_id exists before fetching entries
        console.warn("Moodle ID not available for student entries. Cannot fetch.");
        return;
      }
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
  }, [user, token, navigate]);

  // Memoize fetchNotifications for useCallback dependencies
  const fetchNotifications = useCallback(async () => {
    try {
      // For students, notifications are tied to moodle_id from token
      if (!user || !user.moodle_id) {
        console.warn("User or Moodle ID not available for notifications. Cannot fetch.");
        return;
      }
      const response = await API.get("/notifications/student", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error.response?.data || error.message);
    }
  }, [user, token]);


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

    fetchCourses();
    fetchEntries();
    fetchNotifications();
  }, [user, token, navigate, fetchCourses, fetchEntries, fetchNotifications]);


  const handleCreateEntry = (course) => {
    if (!user || !course) {
      alert("User or course data is missing");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("selectedCourse", JSON.stringify(course));

    navigate("/student/new-entry");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("courses");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const getProfileInitials = () => {
    if (!storedUser || !storedUser.username) return "U";
    const names = storedUser.username.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  // Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = entries.slice(indexOfFirstEntry, indexOfLastEntry);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ✅ FIX: Mark notification as read - Changed API.post to API.put and updated path
  const markAsRead = useCallback(async (notificationId) => {
    try {
        // Corrected API call to use PUT and the generic /notifications/:id/read route
        await API.put(`/notifications/${notificationId}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`Notification ${notificationId} marked as read.`);
        // Update the state to reflect the change
        setNotifications(prevNotifications =>
            prevNotifications.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            )
        );
    } catch (error) {
        console.error("❌ Error marking notification as read:", error.response?.data || error.message);
    }
  }, [token]);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  // Helper function to map database status to display text
  const getDisplayStatus = (status, allowResubmit) => {
    switch (status) {
        case 'submitted':
            return 'Waiting for Grading';
        case 'graded':
            return allowResubmit ? 'Graded - You may resubmit' : 'Graded';
        case 'synced':
            // Assuming 'synced' status implies it's graded and synced to Moodle
            return allowResubmit ? 'Graded (Synced) - You may resubmit' : 'Graded';
        // Add other cases if you introduce more statuses in the future
        default:
            return 'Waiting for Grading'; // Fallback for unexpected statuses
    }
  };

  return (
    <div className="student-dashboard">
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

      <h2>Welcome, {user?.fullname || user?.username}!</h2>

      <div className="instructions">
        <button onClick={() => window.open("https://shorturl.at/JAddI", "_blank")}>
          Logbook Entry Instructions
        </button>
      </div>

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
                <tr key={entry.id}>
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
                  <td>
                    <div>
                      {entry.feedback && !entry.feedback.includes("http") ? entry.feedback : entry.feedback?.split("📎")[0] || "No feedback yet"}
                      {entry.feedback && entry.feedback.includes("http") && (
                        <div style={{ marginTop: "5px" }}>
                          <button
                            style={{ padding: "5px 10px", fontSize: "0.9em", cursor: "pointer" }}
                            onClick={() => {
                              const match = entry.feedback.match(/\((.*?)\)/);
                              if (match && match[1]) window.open(match[1], "_blank");
                            }}
                          >
                            View File
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: "bold", color: entry.status === "graded" || entry.status === "synced" ? "green" : "orange" }}>
                    {getDisplayStatus(entry.status, entry.allow_resubmit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
