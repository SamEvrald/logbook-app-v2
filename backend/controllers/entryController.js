const axios = require("axios");
const db = require("../models/db");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");
const {
  notifyNewLogbookEntry,
  createAssignmentNotification,
  notifyEntryGraded,
  notifyTeacherOnStudentSubmission
} = require("../controllers/notificationController");


// Function to generate a case number based on the course
const generateCaseNumber = async (courseId, courseName) => {
  const [caseResult] = await db.promise().query(
    "SELECT COUNT(*) AS count FROM logbook_entries WHERE course_id = ?",
    [courseId]
  );

  const entryNumber = caseResult[0].count + 1;
  return `${courseName.toUpperCase().replace(/\s+/g, "-")}-${entryNumber}`;
};

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "logbook-entries",
    resource_type: "auto",
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
  },
});

const upload = multer({ storage });
exports.upload = upload;



exports.createEntry = async (req, res) => {
  try {
    console.log("📌 Received Entry Submission:", req.body);

    const {
      moodle_id,
      courseId,
      assignmentId,
      type_of_work, 
      task_type,    
      pathology,
      clinical_info,
      content,
      consentForm,
      work_completed_date,
      moodle_instance_id,
      // isResubmission, // Handled separately in the `if` block, not directly in `req.body` destructured here
    } = req.body;

    const mediaFiles = req.files ? req.files.map(file => file.path) : [];
    console.log("Uploaded files info:", req.files);

    if (!moodle_id || !courseId || !assignmentId || !work_completed_date || !moodle_instance_id) {
      console.error("❌ Missing required fields:", { moodle_id, courseId, assignmentId, work_completed_date, moodle_instance_id });
      return res.status(400).json({ message: "❌ Required fields are missing." });
    }

    console.log("All required fields received.");

    // Ensure student exists AND fetch studentName
    const [userRows] = await db.promise().query("SELECT id, username FROM users WHERE moodle_id = ?", [moodle_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "❌ No user found with this Moodle ID." });
    }
    const studentId = userRows[0].id;
    const studentName = userRows[0].username; 

    // Prevent duplicate submissions unless resubmission is allowed
    // This logic needs to consider the `isResubmission` flag from the frontend for proper overwrite handling
    const [existingEntries] = await db.promise().query(
      `SELECT * FROM logbook_entries
       WHERE student_id = ? AND assignment_id = ? AND moodle_instance_id = ?
       ORDER BY entry_date DESC LIMIT 1`,
      [studentId, assignmentId, moodle_instance_id]
    );

    let allow_resubmit_flag = 0; // Default to 0 (false)
    // Check if the current submission is marked as a resubmission from the frontend
    // And if there's a previous entry that allows resubmission
    if (req.body.isResubmission === 'true' && existingEntries.length > 0 && existingEntries[0].allow_resubmit) {
        // If it's a resubmission for an allowed entry, delete the old one.
        // This is necessary if resubmitting means overwriting the previous attempt.
        await db.promise().query(
            `DELETE FROM logbook_entries WHERE id = ?`,
            [existingEntries[0].id]
        );
        console.log(`Deleted previous entry ${existingEntries[0].id} for resubmission.`);
    } else if (existingEntries.length > 0 && existingEntries[0].status === "submitted") {
        // If there's an existing submitted entry and it's NOT a resubmission, prevent submission.
        return res.status(400).json({ message: "❌ You already submitted this entry and it's awaiting grading. Cannot submit a new entry unless it's a resubmission." });
    } else if (existingEntries.length > 0 && existingEntries[0].status === "graded" && !existingEntries[0].allow_resubmit) {
        // If graded and resubmit not allowed, prevent submission.
        return res.status(400).json({ message: "❌ This entry is graded and locked. Resubmission is not allowed unless permitted by the teacher." });
    }


    // Ensure course exists
    let [courseRows] = await db.promise().query("SELECT * FROM courses WHERE id = ? AND moodle_instance_id = ?", [courseId, moodle_instance_id]);

    if (courseRows.length === 0) {
      console.log(` Course ID ${courseId} not found locally. Fetching from Moodle...`);

      try {
        const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);
        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "❌ Moodle instance not found." });
        }

        const moodleInstance = instanceRows[0];

        // Fetch course details from Moodle
        const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleInstance.api_token,
            wsfunction: "core_course_get_courses",
            moodlewsrestformat: "json",
          },
        });

        const foundCourse = moodleResponse.data.find(course => course.id == courseId);
        if (!foundCourse) {
          return res.status(400).json({ message: `❌ Course ID ${courseId} does not exist in Moodle.` });
        }

        console.log(` Course Found in Moodle: ${foundCourse.fullname}`);

        // Insert course into local database
        await db.promise().query(
          `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
          [foundCourse.id, foundCourse.fullname, foundCourse.shortname, moodle_instance_id]
        );

        console.log(`Course ${foundCourse.fullname} inserted into local database.`);
        courseRows = [{ fullname: foundCourse.fullname }];
      } catch (error) {
        console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to fetch course from Moodle.", error: error.message });
      }
    }

    const courseName = courseRows[0].fullname;

    // Ensure assignment exists in local database
    let [assignmentRows] = await db.promise().query(
      "SELECT moodle_assignment_id FROM assignments WHERE course_id = ? AND moodle_assignment_id = ?",
      [courseId, assignmentId]
    );

    if (assignmentRows.length === 0) {
      console.log(`Assignment ID ${assignmentId} not found locally. Fetching from Moodle...`);

      try {
        // Get Moodle instance
        const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);
        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "❌ Moodle instance not found." });
        }

        const moodleInstance = instanceRows[0];

        // Fetch assignments from Moodle
        const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleToken,
            wsfunction: "mod_assign_get_assignments",
            moodlewsrestformat: "json",
            [`courseids[0]`]: courseId,
          },
        });

        if (!moodleResponse.data.courses.length) {
          return res.status(400).json({ message: `No assignments found for course ID ${courseId}.` });
        }

        const assignments = moodleResponse.data.courses[0].assignments;
        const foundAssignment = assignments.find(a => a.id == assignmentId);

        if (!foundAssignment) {
          return res.status(400).json({ message: "❌ Selected assignment does not exist in Moodle." });
        }

        console.log(` Moodle Assignment Found: ${foundAssignment.name} (ID: ${foundAssignment.id})`);

        // Insert assignment into local database
        await db.promise().query(
          `INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id, moodle_instance_id)
           VALUES (?, ?, ?, ?)`,
          [courseId, foundAssignment.name, foundAssignment.id, moodle_instance_id]
        );

        console.log(` Assignment ${foundAssignment.name} inserted into local database.`);
      } catch (error) {
        return res.status(500).json({ message: "❌ Failed to fetch assignments from Moodle.", error: error.message });
      }
    }

    // Generate Case Number
    const caseNumber = await generateCaseNumber(courseId, courseName);

    // Prepare values for insertion
    const insertValues = [
        caseNumber,
        studentId,
        courseId,
        assignmentId,
        type_of_work, // This is 'Activity'
        task_type || null, // This is 'Task'
        pathology || null,
        clinical_info || null,
        content,
        consentForm,
        work_completed_date,
        JSON.stringify(mediaFiles),
        parseInt(moodle_instance_id),
        'submitted', // Status
        0 // allow_resubmit (default to 0 for new submissions)
    ];

    //  DEBUGGING: Log the values and SQL query right before the INSERT operation
    console.log("DEBUG (createEntry): Prepared INSERT Values:", insertValues);
    console.log("DEBUG (createEntry): INSERT SQL Columns Order:", "(case_number, student_id, course_id, assignment_id, type_of_work, task_type, pathology, clinical_info, content, consent_form, work_completed_date, media_link, moodle_instance_id, status, allow_resubmit)");
    console.log("DEBUG (createEntry): INSERT SQL Placeholders:", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");


    // Insert Logbook Entry with all columns and corresponding placeholders
    const [insertResult] = await db.promise().query(
      `INSERT INTO logbook_entries
       (case_number, student_id, course_id, assignment_id, type_of_work, task_type, pathology, clinical_info, content, consent_form, work_completed_date, media_link, moodle_instance_id, status, allow_resubmit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // ✅ 15 placeholders for 15 columns
      insertValues // Pass the array with 15 values
    );

    const newEntryId = insertResult.insertId;

    // NOTIFICATION: Notify student about their own submission
    await notifyNewLogbookEntry(studentId, caseNumber);

    // NOTIFICATION: Notify teachers about student submission
    await notifyTeacherOnStudentSubmission(courseId, studentName, caseNumber); // studentName is now correctly defined


    res.status(201).json({ message: " Logbook entry submitted successfully.", case_number: caseNumber, mediaFiles });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to create entry", error: error.message });
  }
};

exports.upload = upload;

exports.allowResubmit = async (req, res) => {
  try {
    const [result] = await db
      .promise()
      .query("UPDATE logbook_entries SET allow_resubmit = 1 WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }

    res.json({ message: "Resubmission allowed." });
  } catch (err) {
    console.error("❌ Error in allowResubmit:", err.message);
    res.status(500).json({ error: "Failed to allow resubmission." });
  }
};

exports.getStudentEntries = async (req, res) => {
  const { moodle_id } = req.params;

  try {
    const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User with this Moodle ID not found." });
    }

    const studentId = userRows[0].id;

    // >>>>> ✅ THIS IS THE CRITICAL PART TO VERIFY/UPDATE IN YOUR BACKEND entryController.js <<<<<
    const [entries] = await db.promise().query(
      `SELECT le.id, le.case_number,
      le.entry_date,
                    DATE_FORMAT(le.work_completed_date, '%d/%m/%y') AS work_completed_date,
                    le.type_of_work,
                    le.task_type, 
                    le.pathology,
                    le.content AS task_description,
                    le.media_link,
                    le.consent_form,
                    le.clinical_info,
                    le.grade,
                    le.feedback,
                    le.status,
                    le.allow_resubmit,   
                    le.assignment_id,    
                    le.course_id,        
                    c.fullname AS course_name, 
                    le.teacher_media_link
             FROM logbook_entries le
             JOIN courses c ON le.course_id = c.id 
             WHERE le.student_id = ?
             ORDER BY le.work_completed_date DESC`,
      [studentId]
    );
 

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Database error (getStudentEntries):", error);
    res.status(500).json({ message: "Failed to fetch student logbook entries.", error: error.message });
  }
};


exports.getSubmittedEntries = async (req, res) => {
  const { courseId } = req.params;

  try {
    const [entries] = await db.promise().query(
      `SELECT * FROM logbook_entries WHERE course_id = ? AND status = 'submitted'`,
      [courseId]
    );

    res.status(200).json(entries);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
  }
};


exports.gradeEntry = async (req, res) => {
  try {
    const { entryId, grade, feedback } = req.body;
    let teacher_media_link = null; // Initialize to null

    if (!entryId || grade === undefined || grade === null || grade === "") {
      return res.status(400).json({ message: "Entry ID and grade are required." });
    }

    // --- Start: Handle Teacher Media Upload ---
    
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "auto",
          folder: "logbook/teacher_feedback",
        });
        teacher_media_link = result.secure_url;
        console.log(" Teacher media uploaded to Cloudinary:", teacher_media_link);
      } catch (uploadError) {
        console.error("❌ Cloudinary Upload Error for teacher media:", uploadError);
        // Log the error but continue; grade can still be saved without media.
      }
    }
    // --- End: Handle Teacher Media Upload ---


    //  Fetch entry details (student_id, assignment_id, moodle_instance_id, moodle_id, case_number)
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

    //Update entry in local database with grade, feedback, and teacher_media_link
    await db.promise().query(
      `UPDATE logbook_entries SET grade = ?, feedback = ?, teacher_media_link = ?, status = 'graded' WHERE id = ?`,
      [grade, feedback, teacher_media_link, entryId]
    );
  

    console.log(`Entry updated in local DB (graded) for Entry ID: ${entryId}`);

    // NOTIFICATION: Notify the student about the graded entry
    try {
      await notifyEntryGraded(studentId, caseNumber, grade, feedback); // Pass finalFeedback
      console.log(`Notification sent to student ${studentId} for graded entry ${caseNumber}`);
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

    console.log(` Moodle URL: ${moodleUrl}`);
    

    console.log(`Sending grade ${grade} to Moodle for Moodle User ID: ${moodleUserId} | Assignment ID: ${assignmentId}`);

    let moodleGradeResponse; // Declare outside try for scope
    try {
        moodleGradeResponse = await axios.post(
            `${moodleUrl}/webservice/rest/server.php`,
            null, // No request body for this specific Moodle function
            {
                params: { // All parameters go in the URL query string for mod_assign_save_grade (singular)
                    wstoken: moodleToken,
                    wsfunction: "mod_assign_save_grade", 
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

        console.log("Moodle Grade Response (Full):", JSON.stringify(moodleGradeResponse.data, null, 2));

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
        console.log(`Entry ${entryId} status updated to 'synced' after successful Moodle sync.`);


        res.status(200).json({ message: "Entry graded and media (if any) added successfully." });

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
exports.updateEntryStatus = async (req, res) => {
  const { entryId, status } = req.body;

  if (!entryId || !status) {
    return res.status(400).json({ message: "Entry ID and status are required." });
  }

  try {
    if (status !== 'submitted' && status !== 'resubmitted') {
        return res.status(403).json({ message: "Invalid status update. Students can only change status to 'submitted' or 'resubmitted'." });
    }

    await db.promise().query(
      `UPDATE logbook_entries SET status = ? WHERE id = ?`,
      [status, entryId]
    );

    res.status(200).json({ message: "Entry status updated successfully." });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to update entry status.", error: error.message });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const [entries] = await db.promise().query(
      `SELECT
          le.id,
          le.case_number,
          le.entry_date,
          le.work_completed_date,
          le.type_of_work,
          le.grade,
          le.feedback,
          le.status,
          le.media_link,
          le.consent_form,
          le.clinical_info,
          le.allow_resubmit,
          s.username AS student,
          s.id AS student_id,
          c.fullname AS course,
          c.id AS course_id
       FROM logbook_entries le
       JOIN users s ON le.student_id = s.id
       JOIN courses c ON le.course_id = c.id
       ORDER BY le.entry_date DESC`
    );
    res.json({ entries });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch logbook entries", error: error.message });
  }
};

exports.getTeacherDashboard = async (req, res) => {
  const teacherId = req.user.id; 
  const teacherRole = req.user.role;

  console.log(`DEBUG (getTeacherDashboard) Start: req.user.id = ${req.user.id} (Type: ${typeof req.user.id}), req.user.role = ${req.user.role}`);

  
  if (!teacherId) {
      console.error(`❌ getTeacherDashboard: req.user.id is missing or null. Cannot proceed.`);
      return res.status(400).json({ message: "User ID missing from token. Please re-login." });
  }
  if (teacherRole !== 'teacher') {
      console.error(`❌ getTeacherDashboard: User role is '${teacherRole}', not 'teacher'.`);
      return res.status(403).json({ message: "Unauthorized access: Not a teacher." });
  }

  try {
   
    const [teacherRows] = await db.promise().query(
      "SELECT username FROM users WHERE id = CAST(? AS UNSIGNED) AND role = 'teacher'", 
      [teacherId]
    );

    console.log(`DEBUG (getTeacherDashboard): DB query for teacher ID ${teacherId} (Type: ${typeof teacherId}) and role 'teacher' returned:`, teacherRows);

    if (teacherRows.length === 0) {
      console.error(`❌ Teacher not found in DB with ID: ${teacherId} or role is not 'teacher' based on DB query.`);
      return res.status(404).json({ message: "Teacher not found or not authorized." });
    }

    const teacherName = teacherRows[0].username; 

    const [courseRows] = await db.promise().query(
      "SELECT c.id, c.fullname, c.shortname FROM courses c INNER JOIN teacher_courses tc ON c.id = tc.course_id WHERE tc.teacher_id = CAST(? AS UNSIGNED)", // CAST for consistency
      [teacherId]
    );

    console.log(`DEBUG (getTeacherDashboard): Course query result for teacher ID ${teacherId}:`, courseRows);


    if (courseRows.length === 0) {
      console.log(`Teacher ${teacherId} is not assigned to any courses.`);
      return res.status(200).json({ teacherName, courses: [], entries: [] });
    }

    const courseIds = courseRows.map(course => course.id);

    const [entries] = await db.promise().query(
      `SELECT l.id, l.case_number, l.student_id, u.username AS student_name, u.moodle_id,
                  l.course_id, c.fullname AS course_name, l.type_of_work, l.task_type, l.pathology,
                  l.content AS task_description, l.media_link, l.consent_form, l.clinical_info,
                  l.grade, l.feedback, l.status, l.work_completed_date,
                  l.entry_date,
                  l.allow_resubmit,
                  l.teacher_media_link
           FROM logbook_entries l
           JOIN users u ON l.student_id = u.id
           JOIN courses c ON l.course_id = c.id
           WHERE l.course_id IN (?)
           ORDER BY l.work_completed_date DESC`,
      [courseIds]
    );
    console.log(`DEBUG (getTeacherDashboard) Entries fetched count: ${entries.length}`);
    


    res.status(200).json({ teacherName, courses: courseRows, entries });
  } catch (error) {
    console.error("❌ Database error (getTeacherDashboard):", error);
    res.status(500).json({ message: "Failed to fetch teacher dashboard data.", error: error.message });
  }
};

exports.getStudentCourses = async (req, res) => {
  try {
    const { moodle_id, moodle_instance_id } = req.user;

    console.log(`Fetching courses for Student ID: ${moodle_id}`);
    console.log(`Moodle Instance ID from Token: ${moodle_instance_id}`);

    if (!moodle_instance_id) {
      console.error("❌ moodle_instance_id is missing in JWT token.");
      return res.status(400).json({ message: "Invalid session. Moodle instance ID is missing." });
    }

    const [instanceRows] = await db.promise().query(
      "SELECT * FROM moodle_instances WHERE id = ?",
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      console.error("❌ Moodle instance not found in database.");
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    console.log(`Using Moodle Instance:`, moodleInstance);
    console.log(`Moodle Base URL: ${moodleInstance.base_url}`);
    console.log(`Moodle API Token: ${moodleInstance.api_token}`);

    if (!moodleInstance.base_url || !moodleInstance.api_token) {
      console.error("❌ Moodle instance data is incomplete.");
      return res.status(500).json({ message: "Invalid Moodle instance configuration." });
    }

    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "core_enrol_get_users_courses",
        userid: moodle_id,
        moodlewsrestformat: "json",
      },
    });

    console.log(`Moodle Response:`, moodleResponse.data);

    res.json(moodleResponse.data);
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};

exports.getAssignmentsFromMoodle = async (req, res) => {
  console.log("🔍 Request User:", req.user);

  const { courseId } = req.params;
  const { moodle_instance_id } = req.user;

  if (!courseId || !moodle_instance_id) {
    return res.status(400).json({ message: "Course ID and Moodle Instance ID are required." });
  }

  console.log(`Fetching assignments from Moodle for Course ID: ${courseId}`);

  try {
    const [instanceRows] = await db.promise().query(
      "SELECT * FROM moodle_instances WHERE id = ?",
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "mod_assign_get_assignments",
        moodlewsrestformat: "json",
        [`courseids[0]`]: courseId,
      },
    });

    console.log(" Moodle API Response:", moodleResponse.data);

    if (!moodleResponse.data.courses || moodleResponse.data.courses.length === 0) {
      console.warn(`No assignments found in Moodle for Course ID: ${courseId}`);
      return res.status(404).json({ message: "No assignments found for this course." });
    }

    const assignments = moodleResponse.data.courses[0].assignments;

    if (!assignments || assignments.length === 0) {
      console.warn(` No assignments available for Course ID: ${courseId}`);
      return res.status(404).json({ message: "No assignments available for this course." });
    }

    const [courseRows] = await db.promise().query(
      "SELECT * FROM courses WHERE id = ? AND moodle_instance_id = ?",
      [courseId, moodle_instance_id]
    );

    if (courseRows.length === 0) {
      console.log(`Course ID ${courseId} not found locally. Fetching from Moodle...`);

      const courseResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
        params: {
          wstoken: moodleInstance.api_token,
          wsfunction: "core_course_get_courses",
          moodlewsrestformat: "json",
        },
      });

      const foundCourse = courseResponse.data.find(course => course.id == courseId);

      if (!foundCourse) {
        return res.status(400).json({ message: `❌ Course ID ${courseId} does not exist in Moodle.` });
      }

      console.log(`Course Found in Moodle: ${foundCourse.fullname}`);

      await db.promise().query(
        `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
        [foundCourse.id, foundCourse.fullname, foundCourse.shortname, moodle_instance_id]
      );

      console.log(`Course ${foundCourse.fullname} inserted into local database.`);
    }

    for (const assignment of assignments) {
      const [existingAssignment] = await db.promise().query(
        "SELECT * FROM assignments WHERE moodle_assignment_id = ? AND course_id = ?",
        [assignment.id, courseId]
      );

      if (existingAssignment.length === 0) {
        await db.promise().query(
          `INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id, moodle_instance_id)
           VALUES (?, ?, ?, ?)`,
          [courseId, assignment.name, assignment.id, moodle_instance_id]
        );

        console.log(`Saved assignment: ${assignment.name} (ID: ${assignment.id})`);
      } else {
        console.log(` Assignment already exists: ${assignment.name} (ID: ${assignment.id})`);
      }
    }

    console.log(` Found and processed ${assignments.length} assignments.`);
    res.json(assignments);
  } catch (error) {
    console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to fetch assignments from Moodle.", error: error.message });
  }
};
