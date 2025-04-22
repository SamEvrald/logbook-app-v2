import React, { useState, useEffect } from "react";
import API from "../../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../Footer";
import TopBar from "../Shared/TopBar";
import { FaBell } from "react-icons/fa"; // ✅ Import Notification Icon

const NewEntryForm = () => {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedCourse = JSON.parse(localStorage.getItem("selectedCourse"));
  const storedToken = localStorage.getItem("token");
  const storedMoodleInstance = localStorage.getItem("moodle_instance_id");

  const [user] = useState(storedUser);
  const [course] = useState(storedCourse);
  const [token] = useState(storedToken);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");

  const [typeOfWork, setTypeOfWork] = useState("");
  const [clinicalInfo, setClinicalInfo] = useState("");
  const [pathology, setPathology] = useState("");
  const [consentForm, setConsentForm] = useState("no");
  const [content, setContent] = useState("");
  const [workCompletedDate, setWorkCompletedDate] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]); // ✅ initialize as array

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false); // ✅ Profile Dropdown

  useEffect(() => {
    if (!user || !user.moodle_id) navigate("/login");
    if (!course || !course.id) navigate("/student");
    if (!token) navigate("/login");
    if (!storedMoodleInstance) navigate("/student");

    const fetchAssignments = async () => {
      try {
        const response = await API.get(`/entries/assignments/${course.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.length > 0) {
          setAssignments(response.data);
          setSelectedAssignment(response.data[0].id);
        } else {
          setError("No assignments found.");
        }
      } catch (error) {
        setError("Failed to load assignments.");
      }
    };

    fetchAssignments();
  }, [user, course, token, navigate]);

  const handleFileChange = (e) => {
    setMediaFiles(Array.from(e.target.files)); // ✅ convert FileList to Array
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);


    if (!selectedAssignment) {
      setError("Please select an assignment.");
      return;
    }

    const studentMoodleId = user.moodle_id;
    const courseId = course.id;
    const moodleInstanceId = storedMoodleInstance;

    const formData = new FormData();
    formData.append("moodle_id", studentMoodleId);
    formData.append("courseId", courseId);
    formData.append("assignmentId", selectedAssignment);
    formData.append("type_of_work", typeOfWork);
    formData.append("pathology", pathology);
    formData.append("clinical_info", clinicalInfo);
    formData.append("content", content);
    formData.append("consentForm", consentForm);
    formData.append("work_completed_date", workCompletedDate);
    formData.append("moodle_instance_id", moodleInstanceId);

    // ✅ Attach file
    if (mediaFiles.length > 0) {
      mediaFiles.forEach((file) => {
        formData.append("media_files", file); // name must match backend's `upload.array('media_files')`
      });
    }
    try {
      const response = await API.post("/entries", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data", // ✅ Ensure correct content type
        },
      });

      alert(`Entry created successfully! Case Number: ${response.data.case_number}`);
      navigate("/student");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create entry.");
    } finally {
      setLoading(false);
    }
  };
// Generate Profile Initials
const getProfileInitials = () => {
  if (!storedUser || !storedUser.username) return "A";
  const names = storedUser.username.split(" ");
  return names.length > 1
    ? `${names[0][0]}${names[1][0]}`.toUpperCase()
    : names[0][0].toUpperCase();
};

// ✅ Logout Function
const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("courses");
  localStorage.removeItem("token");
  navigate("/login");
};

  return (
    <>
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
  
      <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Create Entry for {course?.fullname || "Unknown Course"}</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Entry:</label>
            <select value={selectedAssignment} onChange={(e) => setSelectedAssignment(e.target.value)} required>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </option>
              ))}
            </select>
          </div>
  
          <div>
            <label>Type of Task/Device</label>
            <input type="text" value={typeOfWork} onChange={(e) => setTypeOfWork(e.target.value)} required />
          </div>
  
          <div>
            <label>Pathology / Purpose</label>
            <input type="text" value={pathology} onChange={(e) => setPathology(e.target.value)} required />
          </div>
  
          <div>
            <label>Clinical Info/Comments</label>
            <textarea value={clinicalInfo} onChange={(e) => setClinicalInfo(e.target.value)} />
          </div>
  
          <div>
            <label>Task Description</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
          </div>
  
          <div>
            <label>Work Completed Date</label>
            <input type="date" value={workCompletedDate} onChange={(e) => setWorkCompletedDate(e.target.value)} required />
          </div>
  
          <div style={{ marginBottom: "20px" }}>
            <label>Upload Media (Image/Video)</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
              {[0, 1, 2, 3, 4].map((index) => (
                <input
                  key={index}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const newFiles = [...mediaFiles];
                    newFiles[index] = e.target.files[0];
                    setMediaFiles(newFiles);
                  }}
                  style={{ flex: "1", minWidth: "200px" }}
                />
              ))}
            </div>
          </div>
  
          <div>
            <label>Consent Form:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="consent"
                  value="yes"
                  checked={consentForm === "yes"}
                  onChange={() => setConsentForm("yes")}
                /> Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="consent"
                  value="no"
                  checked={consentForm === "no"}
                  onChange={() => setConsentForm("no")}
                /> No
              </label>
              <label>
                <input
                  type="radio"
                  name="consent"
                  value="not_needed"
                  checked={consentForm === "not_needed"}
                  onChange={() => setConsentForm("not_needed")}
                /> Not Needed
              </label>
            </div>
          </div>
  
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Entry"}
          </button>
        </form>
        <Footer />
      </div>
    </>
  );
  
};

export default NewEntryForm;
