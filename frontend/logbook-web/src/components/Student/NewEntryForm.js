import React, { useState, useEffect } from "react";
import API from "../../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../Footer";

const NewEntryForm = () => {
  const navigate = useNavigate();

  // ✅ Retrieve stored user, course, and token
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedCourse = JSON.parse(localStorage.getItem("selectedCourse"));
  const storedToken = localStorage.getItem("token");

  const [user] = useState(storedUser);
  const [course] = useState(storedCourse);
  const [token] = useState(storedToken);
  const [assignments, setAssignments] = useState([]); // ✅ Store multiple assignments
  const [selectedAssignment, setSelectedAssignment] = useState(""); // ✅ User-selected assignment

  const [typeOfWork, setTypeOfWork] = useState("");
  const [roleInTask, setRoleInTask] = useState("leader");
  const [clinicalInfo, setClinicalInfo] = useState("");
  const [pathology, setPathology] = useState("");
  const [consentForm, setConsentForm] = useState("no");
  const [content, setContent] = useState("");
  const [workCompletedDate, setWorkCompletedDate] = useState("");
  const [mediaLink, setMediaLink] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Redirect if user is not logged in
  useEffect(() => {
    if (!user || !user.moodle_id) {
      console.error("❌ User not found. Redirecting to login...");
      navigate("/login");
      return;
    }

    if (!course || !course.id) {
      console.error("❌ Course not found. Redirecting to dashboard...");
      navigate("/student");
      return;
    }

    if (!token) {
      console.error("❌ Missing token. Redirecting to login...");
      navigate("/login");
      return;
    }

    // ✅ Fetch assignments for selected course
    const fetchAssignments = async () => {
      try {
        const response = await API.get(`/entries/assignments/${course.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.length > 0) {
          setAssignments(response.data);
          setSelectedAssignment(response.data[0].id); // ✅ Set default assignment
        } else {
          setError("No assignments found for this course.");
        }
      } catch (error) {
        console.error("❌ Failed to fetch assignments:", error);
        setError("Failed to load assignments. Please try again.");
      }
    };

    fetchAssignments();
  }, [user, course, token, navigate]);

  // ✅ Handle Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!selectedAssignment) {
      setError("❌ Error: Please select an assignment.");
      return;
    }

    const studentMoodleId = user.moodle_id;
    const courseId = course.id;

    console.log("🚀 Preparing entry submission:", {
      moodle_id: studentMoodleId,
      courseId,
      assignmentId: selectedAssignment,
      role_in_task: roleInTask,
      type_of_work: typeOfWork,
      clinical_info: clinicalInfo,
      pathology,
      consentForm,
      content,
      workCompletedDate,
      mediaLink,
    });

    try {
      const response = await API.post(
        "/entries",
        {
          moodle_id: studentMoodleId,
          courseId,
          assignmentId: selectedAssignment, // ✅ Pass selected assignment
          role_in_task: roleInTask,
          type_of_work: typeOfWork,
          pathology,
          clinical_info: clinicalInfo,
          content,
          consentForm,
          work_completed_date: workCompletedDate,
          media_link: mediaLink,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Entry submitted successfully:", response.data);
      alert(`✅ Entry created successfully! Case Number: ${response.data.case_number}`);
      navigate("/student");
    } catch (err) {
      console.error("❌ Error submitting entry:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to create entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Create Entry for {course?.fullname || "Unknown Course"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {/* ✅ Assignment Selection */}
        <div>
          <label>Assignment:</label>
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            required
          >
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </option>
              ))
            ) : (
              <option disabled>No assignments found</option>
            )}
          </select>
        </div>

        <div>
          <label>Type of Task/Device</label>
          <input type="text" value={typeOfWork} onChange={(e) => setTypeOfWork(e.target.value)} required />
        </div>

        <div>
          <label>Role in Task:</label>
          <select value={roleInTask} onChange={(e) => setRoleInTask(e.target.value)}>
            <option value="leader">Leader</option>
            <option value="observer">Observer</option>
            <option value="collaborator">Collaborator</option>
          </select>
        </div>

        <div>
          <label>Pathology / Purpose of the Task</label>
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

        <div>
          <label>Media Link (e.g., Google Drive, YouTube)</label>
          <input type="text" value={mediaLink} onChange={(e) => setMediaLink(e.target.value)} />
        </div>

        <div>
          <label>Consent Form:</label>
          <div>
            <label>
              <input type="radio" name="consent" value="yes" checked={consentForm === "yes"} onChange={() => setConsentForm("yes")} />
              Yes
            </label>
            <label>
              <input type="radio" name="consent" value="no" checked={consentForm === "no"} onChange={() => setConsentForm("no")} />
              No
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Entry"}
        </button>
      </form>

      {/* ✅ Correct Footer Placement */}
      <Footer />
    </div>
  );
};

export default NewEntryForm;
