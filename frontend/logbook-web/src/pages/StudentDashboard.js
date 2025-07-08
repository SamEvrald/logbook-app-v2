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
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error("❌ Error parsing user from localStorage in StudentDashboard:", e);
      localStorage.removeItem("user"); 
      return null;
    }
  }, []);
  const storedCourses = useMemo(() => {
    try {
      const courses = localStorage.getItem("courses");
      const parsedCourses = courses ? JSON.parse(courses) : null;
      return Array.isArray(parsedCourses) ? parsedCourses : []; 
    } catch (e) {
      console.error("❌ Error parsing courses from localStorage in StudentDashboard:", e);
      localStorage.removeItem("courses"); 
      return [];
    }
  }, []);
  
  const token = useMemo(() => localStorage.getItem("token"), []);

  const [user, setUser] = useState(storedUser);
  const [courses, setCourses] = useState(storedCourses); 
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;

  // Profile Dropdown & Notifications state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchCourses = useCallback(async () => {
    
    if (!token || !user?.moodle_id || !user?.moodle_instance_id) { 
      console.warn("Skipping fetchCourses: Token or User Moodle IDs not fully available.");
      return;
    }
    try {
        const response = await API.get("/student/courses", {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log("📚 Courses Fetched from Backend:", response.data);
        if (Array.isArray(response.data)) {
          setCourses(response.data);
          localStorage.setItem("courses", JSON.stringify(response.data));
        } else {
          console.error("❌ Backend /student/courses did not return an array:", response.data);
          setCourses([]);
        }
    } catch (error) {
        console.error("❌ Failed to fetch student courses:", error);
        setCourses([]);
        if (error.response?.status === 401) { 
            console.error("🔴 fetchCourses: Received 401. Clearing local storage and redirecting.");
            localStorage.clear();
            navigate("/login");
        }
    }
  }, [token, user, navigate]);


  // Memoize fetchEntries for useCallback dependencies
  const fetchEntries = useCallback(async () => {
    if (!user?.moodle_id || !token) { 
      console.warn("Skipping fetchEntries: Moodle ID or Token not available for student entries.");
      return;
    }
    try {
     
      const response = await API.get(`/entries/student/${user.moodle_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch entries:", error.response?.data || error.message);
      if (error.response?.status === 401) { 
        console.error("🔴 fetchEntries: Received 401. Clearing local storage and redirecting.");
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [user, token, navigate]);

  
  const fetchNotifications = useCallback(async () => {
    if (!user?.moodle_id || !token) { 
      console.warn("Skipping fetchNotifications: User or Moodle ID/Token not available for notifications.");
      return;
    }
    try {
      const response = await API.get("/notifications/student", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error.response?.data || error.message);
      if (error.response?.status === 401) { 
        console.error("🔴 fetchNotifications: Received 401. Clearing local storage and redirecting.");
        localStorage.clear();
        navigate("/login");
      }
    }
  }, [user, token, navigate]);


  useEffect(() => {
    
    console.group(" StudentDashboard useEffect Triggered (Main)");
    console.log("   Current user state:", user);
    console.log("   Current token state:", token);
    console.log("   user.moodle_id:", user?.moodle_id);
    console.log("   user.moodle_instance_id:", user?.moodle_instance_id); 
    console.groupEnd();

    
    let shouldRedirect = false;
    let redirectReason = "";

    if (!user) {
      shouldRedirect = true;
      redirectReason = "User object is null.";
    } else if (!user.moodle_id) {
      shouldRedirect = true;
      redirectReason = "User Moodle ID is missing.";
    } else if (!user.moodle_instance_id) { 
      shouldRedirect = true;
      redirectReason = "User Moodle Instance ID is missing.";
    } else if (!token) {
      shouldRedirect = true;
      redirectReason = "Authentication token is missing.";
    }

    if (shouldRedirect) {
      console.error(`🔴 StudentDashboard: Critical authentication data missing. Redirecting to login. Reason: ${redirectReason}`);
      localStorage.clear(); 
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
    localStorage.removeItem("resubmitEntryData"); 
    navigate("/student/new-entry");
  };

  const handleLogout = () => {
    localStorage.clear(); 
    navigate("/login");
  };

  const getProfileInitials = () => {
    const currentUser = user || storedUser; 
    if (!currentUser || !currentUser.username) return "U";
    const names = currentUser.username.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : currentUser.username[0].toUpperCase();
  };

  // Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = entries.slice(indexOfFirstEntry, indexOfLastEntry);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  
  const markAsRead = useCallback(async (notificationId) => {
    try {
        await API.put(`/notifications/${notificationId}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`Notification ${notificationId} marked as read.`);
        setNotifications(prevNotifications =>
            prevNotifications.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            )
        );
    } catch (error) {
        console.error("❌ Error marking notification as read:", error.response?.data || error.message);
        if (error.response?.status === 401) {
          console.error("🔴 markAsRead: Received 401. Clearing local storage and redirecting.");
          localStorage.clear();
          navigate("/login");
        }
    }
  }, [token, navigate]);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  
  const handleResubmit = useCallback((entry) => {
    
    localStorage.setItem("resubmitEntryData", JSON.stringify({
        assignment_id: entry.assignment_id,
        case_number: entry.case_number, 
        course_id: entry.course_id, 
        type_of_work: entry.type_of_work,
        task_type: entry.task_type,   
        course_name: entry.course_name  
        
    }));

    
    const selectedCourseData = { id: entry.course_id, fullname: entry.course_name || 'Unknown Course' };
    localStorage.setItem("selectedCourse", JSON.stringify(selectedCourseData));

    
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
   

    navigate("/student/new-entry");
  }, [navigate, user, token]); 

  // Helper function to map database status to display text
  const getDisplayStatus = useCallback((status, allowResubmit) => { 
    switch (status) {
        case 'submitted':
            return 'Waiting for Grading';
        case 'graded':
            return 'Graded';
        case 'synced':
            return 'Graded';
        default:
            return 'Waiting for Grading';
    }
  }, []);

  // function to render the action button based on entry state
  const renderActionButton = useCallback((entry) => {
    if (entry.allow_resubmit === 1 && (entry.status === 'graded' || entry.status === 'synced')) {
        return (
            <button
                onClick={() => handleResubmit(entry)}
                style={{
                  backgroundColor: '#2c3e50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'background-color 0.2s, transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2c3e50'}
            >
                Resubmit
            </button>
        );
    }
    return null;
  }, [handleResubmit]);


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
                   <h4>Notifications</h4>
                   {notifications.length === 0 ? (
                     <p>No new notifications.</p>
                   ) : (
                     <ul>
                       {notifications.map((notification) => (
                         <li key={notification.id} className={notification.is_read ? "read" : "unread"}>
                           <span className="message" dangerouslySetInnerHTML={{ __html: notification.message }}></span>
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
                <p>{user?.username || storedUser?.username}</p>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2>Welcome, {user?.fullname || user?.username || 'Student'}!</h2>

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
              <strong>{course.fullname}</strong>
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
                <th>Activity</th>
                <th>Task</th>
                <th>Pathology</th>
                <th>Task Description</th>
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
                  <td>{entry.work_completed_date || "Not Provided"}</td>
                  <td>{entry.type_of_work || "N/A"}</td>
                  <td>{entry.task_type || "N/A"}</td> 
                  <td>{entry.pathology || "N/A"}</td>
                  <td>{entry.task_description || "N/A"}</td>
                  <td>
                    {(() => {
                      if (!entry.media_link) return "Not Provided";
                      let mediaArray = [];
                      try {
                        mediaArray = JSON.parse(entry.media_link);
                      } catch {
                        mediaArray = [entry.media_link];
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
                      {/* Display text feedback if available */}
                      {entry.feedback || "No feedback yet"} 
                      
                      {/* Check for teacher_media_link directly */}
                      {entry.teacher_media_link && (
                        <div style={{ marginTop: "5px" }}>
                          <button
                            style={{ padding: "5px 10px", fontSize: "0.9em", cursor: "pointer",
                                      backgroundColor: '#2980b9', // A nice blue for the button
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '5px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                      transition: 'background-color 0.2s ease'
                                  }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#2c3e50'} // Darker blue on hover
                            onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'} // Back to original on mouse out
                            onClick={() => window.open(entry.teacher_media_link, "_blank")}
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
                  <td>
                    {renderActionButton(entry)}
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
