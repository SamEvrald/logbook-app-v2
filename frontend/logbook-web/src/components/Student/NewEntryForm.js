import React, { useState, useEffect, useMemo, useCallback } from "react";
import API from "../../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../Footer";
import TopBar from "../Shared/TopBar";
import { FaBell } from "react-icons/fa";

const NewEntryForm = () => {
  const navigate = useNavigate();

  // ✅ Initializing state from localStorage synchronously using useMemo for initial render
  const initialResubmitData = useMemo(() => {
    try {
      const data = localStorage.getItem('resubmitEntryData');
      const parsedData = data ? JSON.parse(data) : null;
      console.log("DEBUG: NewEntryForm - Initial Resubmit Data (parsed):", parsedData);
      return parsedData;
    } catch (e) {
      console.error("❌ Error parsing resubmitEntryData for initial state:", e);
      localStorage.removeItem('resubmitEntryData');
      return null;
    }
  }, []);

  const storedUser = useMemo(() => {
    try {
      const user = localStorage.getItem("user");
      const parsedUser = user ? JSON.parse(user) : null;
      console.log("DEBUG: NewEntryForm - Stored User from localStorage (parsed):", parsedUser);
      return parsedUser;
    } catch (e) {
      console.error("❌ Error parsing user from localStorage in NewEntryForm:", e);
      localStorage.removeItem("user");
      return null;
    }
  }, []);

  const storedSelectedCourse = useMemo(() => {
    try {
      const course = localStorage.getItem("selectedCourse");
      const parsedCourse = course ? JSON.parse(course) : null;
      console.log("DEBUG: NewEntryForm - Stored Selected Course from localStorage (parsed):", parsedCourse);
      return parsedCourse;
    } catch (e) {
      console.error("❌ Error parsing selectedCourse from localStorage in NewEntryForm:", e);
      localStorage.removeItem("selectedCourse");
      return null;
    }
  }, []);

  const storedToken = useMemo(() => {
    const token = localStorage.getItem("token");
    console.log("DEBUG: NewEntryForm - Stored Token from localStorage:", token);
    return token;
  }, []);

  // Use the memoized initial values for useState
  const [user] = useState(storedUser);
  const [course] = useState(storedSelectedCourse);
  const [token] = useState(storedToken);

  const [selectedAssignment, setSelectedAssignment] = useState(initialResubmitData?.assignment_id || "");
  const [isResubmission, setIsResubmission] = useState(!!initialResubmitData);
  const [assignments, setAssignments] = useState([]);

  // ✅ NEW STATE FOR ACTIVITY AND TASK
  const [activity, setActivity] = useState(initialResubmitData?.type_of_work || ""); // `type_of_work` now maps to Activity
  const [task, setTask] = useState(initialResubmitData?.task_type || "");           // New state for Task

  const [clinicalInfo, setClinicalInfo] = useState("");
  const [pathology, setPathology] = useState("");
  const [consentForm, setConsentForm] = useState("no");
  const [content, setContent] = useState("");
  const [workCompletedDate, setWorkCompletedDate] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [originalCaseNumber, setOriginalCaseNumber] = useState(initialResubmitData?.case_number || null);

  // ✅ Define the Activity-Task mapping data structure
  const activityTaskMap = useMemo(() => ({
    "Lower Limb Prostheses": [
      "Partial foot (PF)",
      "Transfemoral quadrilateral (TF-QL)",
      "Ankle dis-articulation (AD)",
      "Trans tibial (TT)",
      "Knee dis-articulation (KD)",
      "Transfemoral ichial containment (TF-IC)",
      "Hip dis-articulation (HD)",
      "Hemipelvectomy (HP)",
      "Hemocorporectomy (HC)",
      "Orthoprostheses (OP)",
      "Other lower limb prostheses"
    ],
    "Lower Limb Orthoses": [
      "Knee ankle foot orthoses (KAFO)",
      "Ankle foot orthosis (AFO)",
      "Foot orthoses (FO)",
      "Hip knee ankle foot orthoses (HKAFO)",
      "Dynamic ankle foot orthoses (DAFO)",
      "Knee orthoses (KO)",
      "Hip orthoses (HO)",
      "Other lower limb orthoses"
    ],
    "Upper Limb Orthoses": [
      "Wrist hand orthoses (WHO)",
      "Finger orthoses (FO)",
      "Hand orthoses (HO)",
      "Elbow wrist hand orthoses (EWHO)",
      "Wrist orthoses (WO)",
      "Elbow orthoses (EO)",
      "Other upper limb orthoses"
    ],
    "Upper Limb Prostheses": [
      "Transhumeral (TH)",
      "Wrist dis-articulation (WD)",
      "Transradial (TR)",
      "Elbow dis-articulation (ED)",
      "Shoulder dis-articulation (SD)",
      "Partial hand (PH)",
      "Interscapulo thoracic (IST)",
      "Other upper limb prostheses"
    ],
    "Spinal Orthoses": [
      "Chênn eau brace",
      "Boston brace",
      "Cervical orthosis (CO)",
      "Other thoracolumbosacral orthoses (TLSO)",
      "Cervicothoracic orthosis (CTO)",
      "Head cervicothoracic orthosis (HCTO)",
      "Cervicothoracolumbosacral orthosis (CTLSO)",
      "Milwaukee brace",
      "Lumbosacral orthosis (LSO)",
      "Other spinal orthoses"
    ],
    "Other P&O Activities": [
      "Lecturing Prosthetics (Theoretical)",
      "Lecturing Orthotics (Theoretical)",
      "Lecturing Prosthetics Workshop",
      "Lecturing Orthotics Workshop",
      "Cat I| Practical examination", // Changed from 'Cat I|' to 'Cat II|' assuming it's a typo from user, but keeping exact if not.
      "Supervision of Prosthetics Activities",
      "Supervision of Orthotics Activities",
      "Patient Assessment/Prescription",
      "Other activities with patients",
      "P&O Educational Material Preparation", // Changed '&' from user to '&' for consistency
      "Patient check-up/follow-up",
      "Other practical activities"
    ],
    "Other P&O Devices": [
      "Orthoprosthesis",
      "Orthopedic Shoes"
    ]
  }), []);

  // Get current Task options based on selected Activity
  const currentTaskOptions = useMemo(() => {
    return activityTaskMap[activity] || [];
  }, [activity, activityTaskMap]);


  const fetchAssignments = useCallback(async () => {
    if (!course?.id || !user?.moodle_instance_id || !token) {
      console.warn("NewEntryForm: Skipping fetchAssignments due to missing critical data.", { user, course, token });
      return;
    }
    try {
      const response = await API.get(`/entries/assignments/${course.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          moodle_instance_id: user.moodle_instance_id
        }
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        setAssignments(response.data);
      } else {
        setError("No assignments found for this course.");
      }
    } catch (error) {
      setError("Failed to load assignments.");
      console.error("❌ Failed to load assignments:", error.response?.data || error.message);
    }
  }, [course, user, token]);

  useEffect(() => {
    console.group("🟢 NewEntryForm useEffect Triggered");
    console.log("   Current user state (in useEffect):", user);
    console.log("   Current token state (in useEffect):", token);
    console.log("   Current course state (in useEffect):", course);
    console.log("   user.moodle_id:", user?.moodle_id);
    console.log("   user.moodle_instance_id:", user?.moodle_instance_id);
    console.log("   isResubmission state:", isResubmission);
    console.log("   selectedAssignment state:", selectedAssignment);
    console.groupEnd();

    let shouldRedirect = false;
    let redirectPath = "/login";
    let redirectReason = "";

    if (!user) {
      shouldRedirect = true; redirectReason = "User object is null.";
    } else if (!user.moodle_id) {
      shouldRedirect = true; redirectReason = "User Moodle ID is missing.";
    } else if (!user.moodle_instance_id) {
      shouldRedirect = true; redirectReason = "User Moodle Instance ID is missing.";
    } else if (!token) {
      shouldRedirect = true; redirectReason = "Authentication token is missing.";
    } else if (!course || !course.id) {
      shouldRedirect = true; redirectPath = "/student/dashboard"; redirectReason = "Course context missing.";
    }

    if (shouldRedirect) {
      console.error(`🔴 NewEntryForm: Redirecting to ${redirectPath}. Reason: ${redirectReason}`);
      if (redirectPath === "/login") {
        localStorage.clear();
      }
      navigate(redirectPath);
      return;
    }

    // ✅ Clear resubmit data from localStorage once it's been used to initialize state
    if (initialResubmitData) {
      localStorage.removeItem('resubmitEntryData');
      // For resubmission, populate other fields from initialResubmitData if they exist
      // `activity` and `task` are already set via useState initialization
      setPathology(initialResubmitData.pathology || '');
      setClinicalInfo(initialResubmitData.clinical_info || '');
      setContent(initialResubmitData.content || '');
      setConsentForm(initialResubmitData.consent_form || 'no'); // Ensure default if not present
      // Format work_completed_date for input type="date"
      setWorkCompletedDate(initialResubmitData.work_completed_date ? new Date(initialResubmitData.work_completed_date).toISOString().split('T')[0] : '');
      setMediaFiles([]); // Clear existing media files on resubmit
    }

    fetchAssignments();
  }, [user, course, token, navigate, fetchAssignments, initialResubmitData]);

  // ✅ New useEffect to set default assignment if it's a new entry and assignments are loaded
  useEffect(() => {
    if (!isResubmission && !selectedAssignment && assignments.length > 0) {
      console.log("DEBUG: Setting default assignment:", assignments[0].id);
      setSelectedAssignment(assignments[0].id);
    }
  }, [assignments, isResubmission, selectedAssignment]);


  // ✅ Handle Activity change: Reset Task when Activity changes
  const handleActivityChange = (e) => {
    setActivity(e.target.value);
    setTask(""); // Reset task when activity changes
  };

  const handleFileChange = (e, index) => {
    const newFiles = [...mediaFiles];
    newFiles[index] = e.target.files[0];
    setMediaFiles(newFiles.filter(Boolean));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

     // --- START DEBUGGING LOGS FOR ACTIVITY AND TASK ---
    console.log("DEBUG: Submitting form...");
    console.log("DEBUG: Activity (typeOfWork) value:", activity);
    console.log("DEBUG: Task (task) value:", task);
    // --- END DEBUGGING LOGS FOR ACTIVITY AND TASK ---

    if (!selectedAssignment) {
      setError("Please select an entry assignment.");
      setLoading(false);
      return;
    }
    // ✅ Updated validation for Activity and Task
    if (!activity) {
        setError("Please select an Activity.");
        setLoading(false);
        return;
    }
    // Only require 'Task' if there are options for the selected activity
    if (currentTaskOptions.length > 0 && !task) {
        setError("Please select a Task.");
        setLoading(false);
        return;
    }
    if (!pathology || !content || !workCompletedDate) {
      setError("Please fill all required fields: Pathology, Task Description, and Work Completed Date.");
      setLoading(false);
      return;
    }


    const studentMoodleId = user.moodle_id;
    const courseId = course.id;
    const moodleInstanceId = user.moodle_instance_id;

    const formData = new FormData();
    formData.append("moodle_id", studentMoodleId);
    formData.append("courseId", courseId);
    formData.append("assignmentId", selectedAssignment);
    formData.append("type_of_work", activity); // ✅ Send 'activity' as 'type_of_work'
    formData.append("task_type", task);         // ✅ Send 'task' as 'task_type'
    formData.append("pathology", pathology);
    formData.append("clinical_info", clinicalInfo);
    formData.append("content", content);
    formData.append("consentForm", consentForm);
    formData.append("work_completed_date", workCompletedDate);
    formData.append("moodle_instance_id", moodleInstanceId);
    formData.append("isResubmission", isResubmission ? "true" : "false"); // Ensure this is sent as a string


    if (mediaFiles.length > 0) {
      mediaFiles.forEach((file) => {
        if (file) {
          formData.append("media_files", file);
        }
      });
    }

    try {
      const response = await API.post("/entries", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Using a custom message box instead of alert
      const messageBox = document.createElement('div');
      messageBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 20px;
        border: 2px solid green;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        text-align: center;
        font-weight: bold;
        color: green;
      `;
      messageBox.textContent = `Entry ${isResubmission ? "resubmitted" : "created"} successfully! Case Number: ${response.data.case_number}`;
      document.body.appendChild(messageBox);

      setTimeout(() => {
        document.body.removeChild(messageBox);
        navigate("/student");
      }, 3000); // Show for 2 seconds then navigate

    } catch (err) {
      console.error("❌ NewEntryForm Submission error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to create/resubmit entry.");
    } finally {
      setLoading(false);
    }
  };

  const getProfileInitials = () => {
    const currentUser = user;
    if (!currentUser || !currentUser.username) return "A";
    const names = currentUser.username.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : currentUser.username[0].toUpperCase();
  };

  const handleLogout = () => {
    localStorage.clear();
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
                <p>{user?.username}</p>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>
            {isResubmission ? `Resubmit Entry for ${course?.fullname || "Unknown Course"}` : `Create Entry for ${course?.fullname || "Unknown Course"}`}
            {originalCaseNumber && isResubmission && (
                <span style={{ fontSize: '0.8em', color: '#555', marginLeft: '10px' }}>
                    (Original Case: #{originalCaseNumber})
                </span>
            )}
        </h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Entry:</label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              required
              disabled={isResubmission}
            >
              <option value="">-- Select an Entry Assignment --</option> {/* Added placeholder */}
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </option>
              ))}
            </select>
            {isResubmission && <p style={{fontSize: '0.8em', color: '#555'}}>You are resubmitting for this specific entry.</p>}
          </div>

          {/* ✅ Activity Dropdown (formerly Type of Task/Device) */}
          <div>
            <label htmlFor="activity-select">Activity:</label>
            <select
              id="activity-select"
              value={activity}
              onChange={handleActivityChange}
              required
            >
              <option value="">-- Select an Activity --</option>
              {Object.keys(activityTaskMap).map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ Task Dropdown (conditionally rendered) */}
          {activity && ( // Only show Task dropdown if an Activity is selected
            <div>
              <label htmlFor="task-select">Task:</label>
              <select
                id="task-select"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required={currentTaskOptions.length > 0} // Required only if options exist
              >
                <option value="">-- Select a Task --</option>
                {currentTaskOptions.map((tsk) => (
                  <option key={tsk} value={tsk}>
                    {tsk}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                  onChange={(e) => handleFileChange(e, index)}
                  style={{ flex: "1", minWidth: "200px" }}
                />
              ))}
            </div>
            {isResubmission && <p style={{fontSize: '0.8em', color: '#555'}}>New uploads will replace any previous media for this entry.</p>}
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
                  style={{ marginLeft: "15px" }}
                /> No
              </label>
              <label>
                <input
                  type="radio"
                  name="consent"
                  value="not_needed"
                  checked={consentForm === "not_needed"}
                  onChange={() => setConsentForm("not_needed")}
                  style={{ marginLeft: "15px" }}
                /> Not Needed
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : (isResubmission ? "Resubmit Entry" : "Submit Entry")}
          </button>
        </form>
        <Footer />
      </div>
    </>
  );
};

export default NewEntryForm;
