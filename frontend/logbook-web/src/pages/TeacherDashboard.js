import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";
import { FaBell } from "react-icons/fa"; // ✅ Import Icons
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
    const [selectedStatus, setSelectedStatus] = useState(""); // 🔥 Fixed: Defined selectedStatus
    const [sortBy, setSortBy] = useState("entry_date"); // 🔥 Fixed: Defined sortBy


  // ✅ Handle Search & Filtering
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

    // ✅ Sorting
   filtered.sort((a, b) => {
  // Sort by Date (newest first)
  if (sortBy === "entry_date") {
    const dateA = a.work_completed_date ? new Date(a.work_completed_date) : new Date(0);
    const dateB = b.work_completed_date ? new Date(b.work_completed_date) : new Date(0);
    return dateB - dateA; // Newest first
  }

  // Sort by Grade (highest first)
  if (sortBy === "grade") {
    const gradeA = parseFloat(a.grade) || 0;
    const gradeB = parseFloat(b.grade) || 0;
    return gradeB - gradeA; // Highest first
  }

  // Sort by Status (submitted first, then graded)
  if (sortBy === "status") {
    // Custom order - submitted comes before graded
    if (a.status === b.status) return 0;
    if (a.status === "submitted") return -1;
    if (b.status === "submitted") return 1;
    return a.status.localeCompare(b.status);
  }

  return 0;
});

    setFilteredEntries(filtered);
  }, [searchQuery, selectedCourse, selectedStatus, sortBy, entries]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 6;

  // Profile Dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);


  // 1. Define fetchDashboard first
const fetchDashboard = useCallback(async () => {
  try {
    const coursesResponse = await API.get(`/teachers/${storedUser.email}/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCourses(coursesResponse.data.courses || []);

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
}, [storedUser?.email, token, navigate]);

// 2. Then use it in useEffect
useEffect(() => {
  if (!storedUser || storedUser.role !== "teacher" || !token) {
    navigate("/login/teacher");
    return;
  }

  fetchDashboard();
}, [fetchDashboard, storedUser, token, navigate]);

  

//   const handleGradeEntry = async (entryId) => {
//     try {
//         const response = await API.post("/teachers/grade", { entryId });

//         if (response.data.message === "This entry has already been graded.") {
//             alert("⚠️ This entry has already been graded.");
//             return;
//         }

//         alert("✅ Grade submitted successfully!");
//         fetchDashboard(); // Refresh the list of entries
//     } catch (error) {
//         console.error("❌ This entry has already been graded.", error.response?.data || error.message);
//         alert("❌ This entry has already been graded.");
//     }
// };

const handleGradeEntry = (entryId) => {
  navigate(`/teacher/grade/${entryId}`);
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const allowResubmission = async (entryId) => {
    try {
      const confirm = window.confirm("Are you sure you want to allow resubmission for this entry?");
      if (!confirm) return;
  
      await API.put(`/teachers/entries/${entryId}/allow-resubmit`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
  
      alert("✅ Resubmission allowed.");
      await fetchDashboard(); // in `allowResubmission` or grade handlers

    } catch (error) {
      console.error("❌ Failed to allow resubmission:", error.response?.data || error.message);
      alert("❌ Failed to allow resubmission.");
    }
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
  const filtered = entries.filter((entry) => 
    String(entry.course_id) === String(courseId)
  );
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



      <h2>Welcome, {teacherName}!</h2>

     {/* ✅ Enhanced Filters */}
     <div className="filters">
        {/* ✅ Course Filter */}
        {courses.length > 0 && (
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            <option value="">-- Filter by Course --</option>
            {[...new Map(courses.map(course => [course.id, course])).values()].map(course => (
  <option key={course.id} value={course.id}>
    {course.fullname}
  </option>
))}

          </select>
        )}

        {/* ✅ Status Filter */}
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">-- Filter by Status --</option>
          <option value="submitted">Not Graded</option>
          <option value="graded">Graded</option>
        </select>

        {/* ✅ Sorting Options */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="entry_date">Sort by Date</option>
          <option value="grade">Sort by Grade</option>
          <option value="status">Sort by Status</option>
        </select>

        {/* ✅ Search Box */}
        <input
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
                <td>{entry.clinical_info || "No Info"}</td>
                <td>{entry.grade !== null ? entry.grade : "-"}</td>
                <td>{entry.feedback || "No feedback yet"}</td>
                <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                  {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
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
