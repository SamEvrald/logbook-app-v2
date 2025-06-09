const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require ("axios");

// ✅ Teacher Signup
const signupTeacher = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // 🔍 Check if teacher already exists
        const [existingTeacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [email]
        );

        if (existingTeacher.length > 0) {
            return res.status(400).json({ message: "Email already in use. Please log in." });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert into DB
        await db.promise().query(
            "INSERT INTO teachers (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "Teacher signup successful. Please log in." });
    } catch (error) {
        console.error("❌ Signup Error:", error);
        res.status(500).json({ message: "Server error during signup.", error: error.message });
    }
};

// ✅ Teacher Login
const loginTeacher = async (req, res) => {
    const { email, password } = req.body;
  
    const [rows] = await db.promise().query("SELECT * FROM teachers WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
  
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
  
    // ✅ Generate JWT Token
    const token = jwt.sign(
      { teacherId: rows[0].id, email: rows[0].email, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
  
    // ✅ Send the user object and token
    res.status(200).json({
      message: "Login successful",
      user: { id: rows[0].id, username: rows[0].username, email: rows[0].email, role: "teacher" },
      token,
    });
  };

// ✅ Fetch Courses Assigned to a Teacher
const getTeacherCourses = async (req, res) => {
    try {
        const { teacherEmail } = req.params;

        // 🔍 Fetch teacher ID based on email
        const [teacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [teacherEmail]
        );

        if (teacher.length === 0) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const teacherId = teacher[0].id;

        // 🔍 Fetch assigned courses for the teacher
        const [courses] = await db.promise().query(
            `SELECT c.id, c.fullname 
             FROM teacher_courses tc
             JOIN courses c ON tc.course_id = c.id
             WHERE tc.teacher_id = ?`,
            [teacherId]
        );

        res.json({ courses });
    } catch (error) {
        console.error("❌ Fetch Courses Error:", error);
        res.status(500).json({ message: "Failed to fetch teacher courses", error: error.message });
    }
};

// ✅ Fetch Submitted Entries for Assigned Courses
// const getSubmittedEntries = async (req, res) => {
//     try {
//         const { teacherEmail } = req.params;

//         // 🔍 Get teacher ID
//         const [teacher] = await db.promise().query(
//             "SELECT id FROM teachers WHERE email = ?",
//             [teacherEmail]
//         );

//         if (teacher.length === 0) {
//             return res.status(404).json({ message: "Teacher not found" });
//         }

//         const teacherId = teacher[0].id;

//         // 🔍 Get courses assigned to this teacher
//         const [assignedCourses] = await db.promise().query(
//             "SELECT course_id FROM teacher_courses WHERE teacher_id = ?",
//             [teacherId]
//         );

//         if (assignedCourses.length === 0) {
//             return res.json({ message: "No courses assigned to this teacher.", entries: [] });
//         }

//         const courseIds = assignedCourses.map(course => course.course_id);

//         // 🔍 Get submitted AND graded logbook entries
//         const [entries] = await db.promise().query(
//             `SELECT le.id, le.case_number, le.student_id, le.type_of_work, le.pathology, 
//                     le.content AS task_description, le.consent_form, le.work_completed_date, 
//                     le.media_link, le.grade, le.feedback, le.status, le.allow_resubmit, le.course_id,  -- ✅ Here
//                     u.username AS student_name, c.fullname AS course_name
//              FROM logbook_entries le
//              JOIN users u ON le.student_id = u.id 
//              JOIN courses c ON le.course_id = c.id
//              WHERE le.course_id IN (?) AND le.status IN ('submitted', 'graded')
//              ORDER BY le.status DESC, le.work_completed_date DESC`,
//             [courseIds]
//           );
          

//         res.status(200).json({ entries });
//     } catch (error) {
//         console.error("❌ Fetch Entries Error:", error);
//         res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
//     }
// };

  // teacherController.js

const getSubmittedEntries = async (req, res) => {
    try {
        const { teacherEmail } = req.params; // Or req.user.email if using auth middleware
        console.log(`DEBUG: Attempting to fetch entries for teacherEmail: ${teacherEmail}`);

        const [teacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [teacherEmail]
        );

        if (teacher.length === 0) {
            console.log(`DEBUG: Teacher with email ${teacherEmail} not found.`);
            return res.status(404).json({ message: "Teacher not found" });
        }
        const teacherId = teacher[0].id;

        const [assignedCourses] = await db.promise().query(
            "SELECT course_id FROM teacher_courses WHERE teacher_id = ?",
            [teacherId]
        );

        if (assignedCourses.length === 0) {
            console.log(`DEBUG: No courses assigned to teacher ID: ${teacherId}.`);
            return res.json({ message: "No courses assigned to this teacher.", entries: [] });
        }

        const courseIds = assignedCourses.map(course => course.course_id);
        console.log("DEBUG: Course IDs for this teacher:", courseIds);

        const [entries] = await db.promise().query(
            `SELECT le.id, le.case_number, le.student_id, le.type_of_work, le.pathology,
                    le.content AS task_description, le.consent_form, le.work_completed_date,
                    le.media_link, le.grade, le.feedback, le.status, le.allow_resubmit, le.course_id,
                    le.teacher_media_link,  -- ✅ Include this column
                    u.username AS student_name, c.fullname AS course_name
             FROM logbook_entries le
             JOIN users u ON le.student_id = u.id
             JOIN courses c ON le.course_id = c.id
             WHERE le.course_id IN (?) AND le.status IN ('submitted', 'graded', 'synced') -- ✅ Include 'synced' here if teachers should see them
             ORDER BY le.status DESC, le.work_completed_date DESC`,
            [courseIds]
          );

        console.log("DEBUG: Final entries fetched:", entries);
        console.log(`DEBUG: Number of entries fetched: ${entries.length}`);

        res.status(200).json({ entries });
    } catch (error) {
        console.error("❌ Fetch Entries Error:", error);
        res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
    }
};


/// ✅ Grade an Entry & Sync to Moodle
const gradeEntry = async (req, res) => {
    try {
        const { entryId, grade, feedback } = req.body;
        let teacher_media_link = null; // Initialize to null

        // Input validation for required fields
        if (!entryId || grade === undefined || grade === null || grade === "") {
            // Added explicit checks for null and empty string for grade
            return res.status(400).json({ message: "Entry ID and grade are required." });
        }

        // --- Start: Handle Teacher Media Upload ---
        if (req.file) {
            try {
                // Ensure the dataUri parser is correctly formatting the file
                const fileUri = dataUri(req).content;
                const result = await cloudinary.uploader.upload(fileUri, {
                    folder: "teacher_feedback_media", // Organize uploads in a specific folder
                    resource_type: "auto", // Automatically detect image/video
                });
                teacher_media_link = result.secure_url;
                console.log("✅ Teacher media uploaded to Cloudinary:", teacher_media_link);
            } catch (uploadError) {
                console.error("❌ Cloudinary Upload Error for teacher media:", uploadError);
                // Decide how to handle upload errors:
                // Option 1: Log the error and continue without the media link.
                // Option 2: Return an error to the client immediately.
                // For this example, we log and continue, allowing the grade to be saved.
                // The `teacher_media_link` will remain `null`.
            }
        }
        // --- End: Handle Teacher Media Upload ---

        // 🔍 Fetch entry details (student_id, assignment_id, moodle_instance_id, moodle_id)
        const [entryRows] = await db.promise().query(
            `SELECT le.student_id, le.assignment_id, le.moodle_instance_id, u.moodle_id
             FROM logbook_entries le
             JOIN users u ON le.student_id = u.id
             WHERE le.id = ?`,
            [entryId]
        );

        if (entryRows.length === 0) {
            return res.status(404).json({ message: "Logbook entry not found." });
        }

        const entry = entryRows[0];
        const moodleUserId = entry.moodle_id;
        const assignmentId = entry.assignment_id;
        const moodleInstanceId = entry.moodle_instance_id;

        // ✅ Update entry in local database with grade, feedback, and teacher_media_link
        // Ensure 'status' is set to 'graded' as per your ENUM definition
        await db.promise().query(
            `UPDATE logbook_entries
             SET grade = ?, feedback = ?, teacher_media_link = ?, status = 'graded'
             WHERE id = ?`,
            [grade, feedback, teacher_media_link, entryId]
        );

        console.log(`✅ Entry updated in local DB (graded) for Entry ID: ${entryId}`);

        // ✅ Fetch Moodle instance details (base_url, api_token)
        const [instanceRows] = await db.promise().query(
            "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
            [moodleInstanceId]
        );

        if (instanceRows.length === 0) {
            console.warn(`⚠️ Moodle instance not found for ID: ${moodleInstanceId}. Skipping Moodle sync.`);
            return res.status(200).json({ message: "✅ Grade successfully saved locally. Moodle sync skipped (instance not found)." });
        }

        const moodleInstance = instanceRows[0];
        const moodleUrl = moodleInstance.base_url;
        const moodleToken = moodleInstance.api_token;

        console.log(`🌍 Moodle URL: ${moodleUrl}`);
        // console.log(`🔑 Moodle API Token: ${moodleToken}`); // Avoid logging sensitive tokens in production

        // ✅ Send grade to Moodle using `mod_assign_save_grade`
        console.log(`🚀 Sending grade ${grade} to Moodle for Moodle User ID: ${moodleUserId} | Assignment ID: ${assignmentId}`);

        const moodleGradeResponse = await axios.post(
            `${moodleUrl}/webservice/rest/server.php`,
            null, // No request body needed for params
            {
                params: {
                    wstoken: moodleToken,
                    wsfunction: "mod_assign_save_grade",
                    moodlewsrestformat: "json",
                    assignmentid: assignmentId,
                    userid: moodleUserId,
                    grade: parseFloat(grade), // Ensure grade is a float for Moodle
                    attemptnumber: -1,       // Grade the latest attempt
                    addattempt: 0,           // Do not add a new attempt
                    workflowstate: "graded", // Set submission status to graded
                    applytoall: 0,           // Apply only to this submission
                },
            }
        );

        console.log("✅ Moodle Grade Response:", moodleGradeResponse.data);

        // Check for Moodle API errors
        if (moodleGradeResponse.data?.exception) {
            console.error("❌ Moodle API Error:", moodleGradeResponse.data.message);
            // Optionally, you might want to revert the local grade or mark it as "sync_failed"
            return res.status(400).json({ message: `Moodle API Error: ${moodleGradeResponse.data.message}`, error: moodleGradeResponse.data.message });
        }

        res.status(200).json({ message: "✅ Grade successfully saved locally and synced to Moodle." });

    } catch (error) {
        // Log the full error object for better debugging
        console.error("❌ Grading Error (Full Details):", error);
        res.status(500).json({
            message: "Failed to grade entry or sync to Moodle.",
            error: error.response?.data || error.message // Provide more specific error from axios if available
        });
    }
};
// ✅ Export All Functions
module.exports = {
    signupTeacher,
    loginTeacher,
    getTeacherCourses,
    getSubmittedEntries,
    gradeEntry,
    
};
