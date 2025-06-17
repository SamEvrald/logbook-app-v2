const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { notifyEntryGraded } = require("../controllers/notificationController");
const qs = require('qs');


// Teacher Signup
const signupTeacher = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const [existingTeacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [email]
        );

        if (existingTeacher.length > 0) {
            return res.status(400).json({ message: "Email already in use. Please log in." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into teachers table
        // Note: moodle_instance_id might be 0 or null here if not provided during signup.
        // It's crucial for the login process to then try and fetch the Moodle ID.
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

// Teacher Login
const loginTeacher = async (req, res) => {
    const { email, password } = req.body;

    // ✅ FIX: Select the 'password' column from the teachers table
    const [teacherRows] = await db.promise().query("SELECT id, username, email, password FROM teachers WHERE email = ?", [email]);
    if (teacherRows.length === 0) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, teacherRows[0].password); // Now teacherRows[0].password will have a value
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    const teacherInternalId = teacherRows[0].id;
    const teacherUsername = teacherRows[0].username;
    const teacherEmail = teacherRows[0].email;
    // teacherMoodleInstanceId is no longer retrieved from teachers table here, as teachers are not in Moodle

    console.log(`DEBUG: Teacher '${teacherUsername}' logging in. Internal ID: ${teacherInternalId}, Email: ${teacherEmail}`);

    let moodleId = null; // Teachers do not have a Moodle ID if they are only in Logbook app.
    let moodleInstanceIdForUser = null; // Also set to null for teachers

    // ✅ Automatic Upsert into 'users' table
    // Check if a user entry for this teacher already exists in the 'users' table
    const [existingUserRows] = await db.promise().query(
        "SELECT id FROM users WHERE id = ? AND role = 'teacher'", // Check by ID, as it's unique
        [teacherInternalId] // Use the teacher's internal ID from the 'teachers' table
    );

    if (existingUserRows.length === 0) {
        // If not found, insert a new entry for the teacher in the 'users' table
        // Use the teacher's ID from the 'teachers' table as the 'id' in 'users' for consistency
        // password can be null in users table for teachers as authentication is done via teachers table
        try {
            await db.promise().query(
                `INSERT INTO users (id, username, password, role, moodle_id, moodle_instance_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [teacherInternalId, teacherUsername, teacherRows[0].password, 'teacher', moodleId, moodleInstanceIdForUser ]
            );
            console.log(`✅ Created new entry for teacher '${teacherUsername}' (ID: ${teacherInternalId}) in 'users' table.`);
        } catch (insertError) {
            console.error(`❌ Error inserting teacher '${teacherUsername}' into 'users' table:`, insertError.message);
            // This catch is mostly for primary key conflicts if ID is reused, but we use the existing teacher ID.
            // If the error indicates duplicate username but different ID, a manual check is needed.
            // Fallback for primary key conflict if users.id is AUTO_INCREMENT and can clash
            await db.promise().query(
                `INSERT INTO users (username, password, role, moodle_id, moodle_instance_id, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), moodle_id = VALUES(moodle_id), moodle_instance_id = VALUES(moodle_instance_id)`, // Removed updated_at
                [teacherUsername, teacherRows[0].password, 'teacher', moodleId, moodleInstanceIdForUser]
            );
            console.log(`✅ Upserted teacher '${teacherUsername}' into 'users' table (handling potential existing entry).`);
        }
    } else {
        // If found, update the existing entry (e.g., ensure role is 'teacher' and moodle_id is null/correct)
        await db.promise().query(
            `UPDATE users SET username = ?, password = ?, role = ?, moodle_id = ?, moodle_instance_id = ?
             WHERE id = ?`, // Removed updated_at = NOW()
            [teacherUsername, teacherRows[0].password, 'teacher', moodleId, moodleInstanceIdForUser, teacherInternalId]
        );
        console.log(`✅ Updated existing entry for teacher '${teacherUsername}' (ID: ${teacherInternalId}) in 'users' table.`);
    }

    // Sign JWT token with moodle_id as null (or undefined) for teachers
    const token = jwt.sign(
        { teacherId: teacherInternalId, email: teacherEmail, role: "teacher", moodle_id: moodleId, internal_user_id: teacherInternalId }, // Added internal_user_id to token for frontend use
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.status(200).json({
        message: "Login successful",
        user: {
            id: teacherInternalId, // This is the internal ID from 'teachers' table and also now 'users' table
            username: teacherUsername,
            email: teacherEmail,
            role: "teacher",
            moodle_id: moodleId, // This will be null for teachers
            internal_user_id: teacherInternalId // Provide this explicitly
        },
        token,
    });
};

// Fetch Courses Assigned to a Teacher
const getTeacherCourses = async (req, res) => {
    try {
        const { teacherEmail } = req.params;

        const [teacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [teacherEmail]
        );

        if (teacher.length === 0) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const teacherId = teacher[0].id;

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

// Fetch Submitted Entries for Assigned Courses
const getSubmittedEntries = async (req, res) => {
    try {
        const { teacherEmail } = req.params;
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
                    le.teacher_media_link,
                    u.username AS student_name, c.fullname AS course_name
             FROM logbook_entries le
             JOIN users u ON le.student_id = u.id
             JOIN courses c ON le.course_id = c.id
             WHERE le.course_id IN (?) AND le.status IN ('submitted', 'graded', 'synced')
             ORDER BY le.status DESC, le.work_completed_date DESC`,
            [courseIds]
        );

        res.status(200).json({ entries });
    } catch (error) {
        console.error("❌ Fetch Entries Error:", error);
        res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
    }
};


// Grade an Entry & Sync to Moodle
const gradeEntry = async (req, res) => {
    try {
        const { entryId, grade, feedback } = req.body;
        let teacher_media_link = null; // Initialize to null

        if (!entryId || grade === undefined || grade === null || grade === "") {
            return res.status(400).json({ message: "Entry ID and grade are required." });
        }

        // --- Start: Handle Teacher Media Upload ---
        // Make sure 'cloudinary' is imported at the top of this file if not already.
        if (req.file) {
            try {
                // The dataUri(req).content approach might be from a different multer setup.
                // If using multer.single/array/fields, req.file.path is usually enough.
                // Assuming req.file is available and has a path property.
                const result = await cloudinary.uploader.upload(req.file.path, {
                    resource_type: "auto",
                    folder: "logbook/teacher_feedback",
                });
                teacher_media_link = result.secure_url;
                console.log("✅ Teacher media uploaded to Cloudinary:", teacher_media_link);
            } catch (uploadError) {
                console.error("❌ Cloudinary Upload Error for teacher media:", uploadError);
                // Log the error but continue; grade can still be saved without media.
            }
        }
        // --- End: Handle Teacher Media Upload ---


        // 🔍 Fetch entry details (student_id, assignment_id, moodle_instance_id, moodle_id, case_number)
        const [entryRows] = await db.promise().query(
            `SELECT le.student_id, le.assignment_id, le.moodle_instance_id, le.case_number, u.moodle_id
             FROM logbook_entries le
             JOIN users u ON le.student_id = u.id
             WHERE le.id = ?`,
            [entryId]
        );

        if (entryRows.length === 0) {
            console.warn(`⚠️ Logbook entry ${entryId} not found after grading.`);
            return res.status(404).json({ message: "Logbook entry not found." });
        }

        const entry = entryRows[0];
        const moodleUserId = entry.moodle_id;
        const assignmentId = entry.assignment_id;
        const moodleInstanceId = entry.moodle_instance_id;
        const studentId = entry.student_id; // For notification
        const caseNumber = entry.case_number; // For notification

        // ✅ Update entry in local database with grade, feedback, and teacher_media_link
        await db.promise().query(
            `UPDATE logbook_entries SET grade = ?, feedback = ?, teacher_media_link = ?, status = 'graded' WHERE id = ?`,
            [grade, feedback, teacher_media_link, entryId]
        );

        console.log(`✅ Entry updated in local DB (graded) for Entry ID: ${entryId}`);

        // NOTIFICATION: Notify the student about the graded entry
        try {
            await notifyEntryGraded(studentId, caseNumber, grade, feedback); // Pass finalFeedback
            console.log(`✅ Notification sent to student ${studentId} for graded entry ${caseNumber}`);
        } catch (notificationError) {
            console.error("❌ Error sending grade notification:", notificationError);
        }


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

        console.log(`🚀 Sending grade ${grade} to Moodle for Moodle User ID: ${moodleUserId} | Assignment ID: ${assignmentId}`);

        let moodleGradeResponse; // Declare outside try for scope
        try {
            moodleGradeResponse = await axios.post(
                `${moodleUrl}/webservice/rest/server.php`,
                null, // No request body for this specific Moodle function
                {
                    params: { // All parameters go in the URL query string for mod_assign_save_grade (singular)
                        wstoken: moodleToken,
                        wsfunction: "mod_assign_save_grade", // ✅ Use singular 'save_grade' as confirmed
                        moodlewsrestformat: "json", // Request JSON response
                        assignmentid: assignmentId,
                        userid: moodleUserId,
                        grade: parseFloat(grade),
                        attemptnumber: -1,
                        addattempt: 0, // Keep as integer 0 as per working version and Moodle docs
                        workflowstate: "graded",
                        applytoall: 0,
                    },
                }
            );

            console.log("✅ Moodle Grade Response (Full):", JSON.stringify(moodleGradeResponse.data, null, 2));

            if (moodleGradeResponse.data?.exception) {
                const moodleErrorMessage = moodleGradeResponse.data.message || "Unknown Moodle API Error.";
                console.error("❌ Moodle API Error:", moodleErrorMessage);
                return res.status(400).json({ message: `Moodle API Error: ${moodleErrorMessage}`, error: moodleErrorMessage });
            }

            // Update status to 'synced' after successful Moodle sync
            await db.promise().query(
                `UPDATE logbook_entries SET status = 'synced' WHERE id = ?`,
                [entryId]
            );
            console.log(`✅ Entry ${entryId} status updated to 'synced' after successful Moodle sync.`);


            res.status(200).json({ message: "✅ Entry graded and media (if any) added successfully." });

        } catch (axiosError) {
            console.error("❌ Axios Error during Moodle sync:", axiosError.message);
            const detailedError = axiosError.response?.data ?
                                  JSON.stringify(axiosError.response.data, null, 2) :
                                  axiosError.message;
            console.error("❌ Moodle Sync Error (Details):", detailedError);

            return res.status(500).json({
                message: `Grade saved locally, but failed to sync to Moodle. Error: ${axiosError.response?.statusText || axiosError.message}`,
                error: detailedError
            });
        }

    } catch (error) {
        console.error("❌ Grade Entry Error:", error.message);
        res.status(500).json({ message: "Failed to grade entry", error: error.message });
    }
};
// Export All Functions
module.exports = {
    signupTeacher,
    loginTeacher,
    getTeacherCourses,
    getSubmittedEntries,
    gradeEntry,
};
