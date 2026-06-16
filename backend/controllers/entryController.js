const axios = require("axios");
const db = require("../models/db");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");
const validator = require("../utils/validators");
const {
  notifyNewLogbookEntry,
  createAssignmentNotification,
  notifyEntryGraded,
  notifyTeacherOnStudentSubmission
} = require("../controllers/notificationController");

/**
 * Generate case number based on course
 */
const generateCaseNumber = async (courseId, courseName) => {
  const [caseResult] = await db.promise().query(
    "SELECT COUNT(*) AS count FROM logbook_entries WHERE course_id = ? AND deleted_at IS NULL",
    [courseId]
  );

  const entryNumber = caseResult[0].count + 1;
  return `${courseName.toUpperCase().replace(/\s+/g, "-")}-${entryNumber}`;
};

/**
 * Set up Cloudinary storage with file validation
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "logbook-entries",
    resource_type: "auto",
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'pdf']
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    try {
      validator.validateFileType(file);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

exports.upload = upload;

/**
 * Create logbook entry
 * ✅ FIXED: Added input validation, file validation, soft deletes, authorization checks
 */
exports.createEntry = async (req, res) => {
  try {
    console.log("📌 Received Entry Submission:", req.body);

    const {
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
    } = req.body;

    // ✅ FIX: Use authenticated user's moodle_id, not from request body
    const moodle_id = req.user.moodle_id;
    const userMoodleInstanceId = req.user.moodle_instance_id;

    // Validate required fields
    validator.validateRequiredFields(
      { courseId, assignmentId, work_completed_date },
      ['courseId', 'assignmentId', 'work_completed_date']
    );

    // Validate IDs
    const validCourseId = validator.validateCourseId(courseId);
    const validAssignmentId = validator.validateAssignmentId(assignmentId);
    validator.validateDate(work_completed_date);

    // Validate text fields
    const sanitizedTypeOfWork = validator.sanitizeString(type_of_work, 'type_of_work', 100);
    const sanitizedTaskType = validator.sanitizeString(task_type, 'task_type', 100);
    const sanitizedPathology = validator.sanitizeString(pathology, 'pathology', 100);
    const sanitizedClinicalInfo = validator.sanitizeContent(clinical_info, 1000);
    const sanitizedContent = validator.sanitizeContent(content, 5000);

    // Validate files
    const mediaFiles = req.files ? req.files.map(file => file.path) : [];
    if (mediaFiles.length > 5) {
      return res.status(400).json({ message: "❌ Maximum 5 files allowed per entry" });
    }

    console.log("✅ All validations passed");

    // Ensure student exists
    const [userRows] = await db.promise().query(
      "SELECT id, username FROM users WHERE moodle_id = ? AND role = 'student'",
      [moodle_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const studentId = userRows[0].id;
    const studentName = userRows[0].username;

    // Check for duplicate submissions (soft delete aware)
    const [existingEntries] = await db.promise().query(
      `SELECT * FROM logbook_entries
       WHERE student_id = ? AND assignment_id = ? AND moodle_instance_id = ? AND deleted_at IS NULL
       ORDER BY entry_date DESC LIMIT 1`,
      [studentId, validAssignmentId, userMoodleInstanceId]
    );

    let allow_resubmit_flag = 0;

    if (req.body.isResubmission === 'true' && existingEntries.length > 0 && existingEntries[0].allow_resubmit) {
      // ✅ FIX: Use soft delete instead of hard delete
      await db.promise().query(
        `UPDATE logbook_entries SET deleted_at = NOW() WHERE id = ?`,
        [existingEntries[0].id]
      );
      console.log(`✅ Soft-deleted previous entry ${existingEntries[0].id} for resubmission`);
    } else if (existingEntries.length > 0 && existingEntries[0].status === "submitted") {
      return res.status(400).json({ message: "❌ Entry already submitted and awaiting grading" });
    } else if (existingEntries.length > 0 && existingEntries[0].status === "graded" && !existingEntries[0].allow_resubmit) {
      return res.status(400).json({ message: "❌ Entry is graded and resubmission not allowed" });
    }

    // Ensure course exists
    let [courseRows] = await db.promise().query(
      "SELECT * FROM courses WHERE id = ? AND moodle_instance_id = ?",
      [validCourseId, userMoodleInstanceId]
    );

    if (courseRows.length === 0) {
      console.log(`Course ${validCourseId} not found locally. Fetching from Moodle...`);

      try {
        const [instanceRows] = await db.promise().query(
          "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
          [userMoodleInstanceId]
        );

        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "❌ Moodle instance not found" });
        }

        const moodleInstance = instanceRows[0];

        const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleInstance.api_token,
            wsfunction: "core_course_get_courses",
            moodlewsrestformat: "json",
          },
        });

        const foundCourse = moodleResponse.data.find(course => course.id == validCourseId);
        if (!foundCourse) {
          return res.status(400).json({ message: `Course ID ${validCourseId} does not exist in Moodle` });
        }

        await db.promise().query(
          `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
          [foundCourse.id, foundCourse.fullname, foundCourse.shortname, userMoodleInstanceId]
        );

        courseRows = [{ fullname: foundCourse.fullname }];
      } catch (error) {
        console.error("❌ Moodle API Error:", error.message);
        return res.status(500).json({ message: "Failed to fetch course from Moodle", error: error.message });
      }
    }

    const courseName = courseRows[0].fullname;

    // Ensure assignment exists
    let [assignmentRows] = await db.promise().query(
      "SELECT moodle_assignment_id FROM assignments WHERE course_id = ? AND moodle_assignment_id = ?",
      [validCourseId, validAssignmentId]
    );

    if (assignmentRows.length === 0) {
      console.log(`Assignment ${validAssignmentId} not found locally. Fetching from Moodle...`);

      try {
        const [instanceRows] = await db.promise().query(
          "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
          [userMoodleInstanceId]
        );

        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "Moodle instance not found" });
        }

        const moodleInstance = instanceRows[0];

        // ✅ FIX: Use api_token from instanceRows, not undefined variable
        const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleInstance.api_token,
            wsfunction: "mod_assign_get_assignments",
            moodlewsrestformat: "json",
            [`courseids[0]`]: validCourseId,
          },
        });

        if (!moodleResponse.data.courses || !moodleResponse.data.courses.length) {
          return res.status(400).json({ message: `No assignments found for course ${validCourseId}` });
        }

        const assignments = moodleResponse.data.courses[0].assignments;
        const foundAssignment = assignments.find(a => a.id == validAssignmentId);

        if (!foundAssignment) {
          return res.status(400).json({ message: "Selected assignment does not exist in Moodle" });
        }

        await db.promise().query(
          `INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id, moodle_instance_id)
           VALUES (?, ?, ?, ?)`,
          [validCourseId, foundAssignment.name, foundAssignment.id, userMoodleInstanceId]
        );
      } catch (error) {
        console.error("❌ Assignment fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch assignments from Moodle", error: error.message });
      }
    }

    // Generate case number
    const caseNumber = await generateCaseNumber(validCourseId, courseName);

    // Insert entry
    const [insertResult] = await db.promise().query(
      `INSERT INTO logbook_entries
       (case_number, student_id, course_id, assignment_id, type_of_work, task_type, pathology, 
        clinical_info, content, consent_form, work_completed_date, media_link, moodle_instance_id, status, allow_resubmit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [caseNumber, studentId, validCourseId, validAssignmentId, sanitizedTypeOfWork, sanitizedTaskType, 
       sanitizedPathology, sanitizedClinicalInfo, sanitizedContent, consentForm, work_completed_date, 
       JSON.stringify(mediaFiles), userMoodleInstanceId, 'submitted', 0]
    );

    console.log(`✅ Entry created successfully: ${caseNumber}`);

    // Send notifications
    await notifyNewLogbookEntry(studentId, caseNumber);
    await notifyTeacherOnStudentSubmission(validCourseId, studentName, caseNumber);

    res.status(201).json({ 
      message: "Logbook entry submitted successfully", 
      case_number: caseNumber, 
      mediaFiles 
    });

  } catch (error) {
    console.error("❌ Entry creation error:", error);
    res.status(500).json({ message: "Failed to create entry", error: error.message });
  }
};

/**
 * Get student entries (authorization check added)
 */
exports.getStudentEntries = async (req, res) => {
  const { moodle_id } = req.params;

  try {
    // ✅ FIX: Ensure user can only access their own entries
    if (req.user.moodle_id !== parseInt(moodle_id)) {
      return res.status(403).json({ message: "❌ Unauthorized: You can only view your own entries" });
    }

    const [userRows] = await db.promise().query(
      "SELECT id FROM users WHERE moodle_id = ? AND role = 'student'",
      [moodle_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const studentId = userRows[0].id;

    const [entries] = await db.promise().query(
      `SELECT le.id, le.case_number, le.entry_date,
              DATE_FORMAT(le.work_completed_date, '%d/%m/%y') AS work_completed_date,
              le.type_of_work, le.task_type, le.pathology, le.content AS task_description,
              le.media_link, le.consent_form, le.clinical_info, le.grade, le.feedback,
              le.status, le.allow_resubmit, le.assignment_id, le.course_id,
              c.fullname AS course_name, le.teacher_media_link
       FROM logbook_entries le
       JOIN courses c ON le.course_id = c.id
       WHERE le.student_id = ? AND le.deleted_at IS NULL
       ORDER BY le.work_completed_date DESC`,
      [studentId]
    );

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Error fetching entries:", error);
    res.status(500).json({ message: "Failed to fetch entries", error: error.message });
  }
};

/**
 * Grade entry with proper authorization
 * ✅ FIXED: Added teacher authorization check, removed token logging
 */
exports.gradeEntry = async (req, res) => {
  try {
    const { entryId, grade, feedback } = req.body;

    // Validate inputs
    validator.validateRequiredFields({ entryId, grade }, ['entryId', 'grade']);
    const validEntryId = validator.validateId(entryId, 'Entry ID');
    const validGrade = validator.validateGrade(grade);
    const sanitizedFeedback = validator.sanitizeContent(feedback, 1000);

    let teacher_media_link = null;

    // Handle teacher media upload
    if (req.file) {
      try {
        validator.validateFileType(req.file);
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "auto",
          folder: "logbook/teacher_feedback",
        });
        teacher_media_link = result.secure_url;
        console.log("✅ Teacher media uploaded");
      } catch (uploadError) {
        console.error("⚠️ Upload error:", uploadError.message);
      }
    }

    // Fetch entry and verify ownership
    const [entryRows] = await db.promise().query(
      `SELECT le.student_id, le.assignment_id, le.moodle_instance_id, le.case_number, u.moodle_id
       FROM logbook_entries le
       JOIN users u ON le.student_id = u.id
       WHERE le.id = ? AND le.deleted_at IS NULL`,
      [validEntryId]
    );

    if (entryRows.length === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }

    // ✅ FIX: Verify teacher has access to this entry's course
    const entry = entryRows[0];
    const [courseAccess] = await db.promise().query(
      `SELECT 1 FROM teacher_courses WHERE teacher_id = ? AND course_id = 
       (SELECT course_id FROM logbook_entries WHERE id = ?)`,
      [req.user.teacherId, validEntryId]
    );

    if (courseAccess.length === 0) {
      console.warn(`⚠️ Unauthorized grading attempt by teacher ${req.user.teacherId}`);
      return res.status(403).json({ message: "❌ You don't have access to grade this entry" });
    }

    // Update entry
    await db.promise().query(
      `UPDATE logbook_entries SET grade = ?, feedback = ?, teacher_media_link = ?, status = 'graded' 
       WHERE id = ?`,
      [validGrade, sanitizedFeedback, teacher_media_link, validEntryId]
    );

    console.log(`✅ Entry ${validEntryId} graded successfully`);

    // Notify student
    try {
      await notifyEntryGraded(entry.student_id, entry.case_number, validGrade, sanitizedFeedback);
    } catch (notifError) {
      console.error("⚠️ Notification error:", notifError.message);
    }

    // Sync to Moodle
    const [instanceRows] = await db.promise().query(
      "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
      [entry.moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      return res.status(200).json({ message: "✅ Graded locally (Moodle instance not found)" });
    }

    const moodleInstance = instanceRows[0];

    try {
      await axios.post(
        `${moodleInstance.base_url}/webservice/rest/server.php`,
        null,
        {
          params: {
            wstoken: moodleInstance.api_token,
            wsfunction: "mod_assign_save_grade",
            moodlewsrestformat: "json",
            assignmentid: entry.assignment_id,
            userid: entry.moodle_id,
            grade: validGrade,
            attemptnumber: -1,
            addattempt: 0,
            workflowstate: "graded",
            applytoall: 0,
          },
        }
      );

      await db.promise().query(
        `UPDATE logbook_entries SET status = 'synced' WHERE id = ?`,
        [validEntryId]
      );

      res.status(200).json({ message: "✅ Entry graded and synced to Moodle" });
    } catch (moodleError) {
      console.error("⚠️ Moodle sync error:", moodleError.message);
      res.status(200).json({ message: "✅ Graded locally (Moodle sync failed)" });
    }

  } catch (error) {
    console.error("❌ Grade entry error:", error);
    res.status(500).json({ message: "Failed to grade entry", error: error.message });
  }
};

/**
 * Get assignments from Moodle with proper token handling
 * ✅ FIXED: Use instance token, not undefined variable
 */
exports.getAssignmentsFromMoodle = async (req, res) => {
  const { courseId } = req.params;
  const { moodle_instance_id } = req.user;

  try {
    validator.validateRequiredFields({ courseId, moodle_instance_id }, ['courseId', 'moodle_instance_id']);
    const validCourseId = validator.validateCourseId(courseId);

    const [instanceRows] = await db.promise().query(
      "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      return res.status(404).json({ message: "Moodle instance not found" });
    }

    const moodleInstance = instanceRows[0];

    // ✅ FIX: Use moodleInstance.api_token
    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "mod_assign_get_assignments",
        moodlewsrestformat: "json",
        [`courseids[0]`]: validCourseId,
      },
    });

    if (!moodleResponse.data.courses || moodleResponse.data.courses.length === 0) {
      return res.status(404).json({ message: "No assignments found for this course" });
    }

    const assignments = moodleResponse.data.courses[0].assignments || [];

    if (assignments.length === 0) {
      return res.status(404).json({ message: "No assignments available" });
    }

    // Save assignments to local database
    for (const assignment of assignments) {
      const [existing] = await db.promise().query(
        "SELECT id FROM assignments WHERE moodle_assignment_id = ? AND course_id = ?",
        [assignment.id, validCourseId]
      );

      if (existing.length === 0) {
        await db.promise().query(
          `INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id, moodle_instance_id)
           VALUES (?, ?, ?, ?)`,
          [validCourseId, assignment.name, assignment.id, moodle_instance_id]
        );
      }
    }

    res.json(assignments);
  } catch (error) {
    console.error("❌ Error fetching assignments:", error.message);
    res.status(500).json({ message: "Failed to fetch assignments", error: error.message });
  }
};

// Export remaining functions unchanged (minimal changes needed)
exports.getSubmittedEntries = async (req, res) => {
  const { courseId } = req.params;

  try {
    const validCourseId = validator.validateCourseId(courseId);
    
    const [entries] = await db.promise().query(
      `SELECT * FROM logbook_entries 
       WHERE course_id = ? AND status = 'submitted' AND deleted_at IS NULL`,
      [validCourseId]
    );

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch entries", error: error.message });
  }
};

exports.updateEntryStatus = async (req, res) => {
  const { entryId, status } = req.body;

  try {
    validator.validateRequiredFields({ entryId, status }, ['entryId', 'status']);
    
    if (!['submitted', 'resubmitted'].includes(status)) {
      return res.status(403).json({ message: "Invalid status" });
    }

    const validEntryId = validator.validateId(entryId);

    await db.promise().query(
      `UPDATE logbook_entries SET status = ? WHERE id = ? AND deleted_at IS NULL`,
      [status, validEntryId]
    );

    res.status(200).json({ message: "Entry status updated successfully" });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to update entry", error: error.message });
  }
};

exports.getTeacherDashboard = async (req, res) => {
  const teacherId = req.user.teacherId || req.user.id;

  try {
    if (!teacherId) {
      return res.status(400).json({ message: "User ID missing from token" });
    }

    const [teacherRows] = await db.promise().query(
      "SELECT username FROM users WHERE id = ? AND role = 'teacher'",
      [teacherId]
    );

    if (teacherRows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const [courseRows] = await db.promise().query(
      `SELECT c.id, c.fullname, c.shortname FROM courses c
       INNER JOIN teacher_courses tc ON c.id = tc.course_id
       WHERE tc.teacher_id = ?`,
      [teacherId]
    );

    if (courseRows.length === 0) {
      return res.status(200).json({ teacherName: teacherRows[0].username, courses: [], entries: [] });
    }

    const courseIds = courseRows.map(c => c.id);

    const [entries] = await db.promise().query(
      `SELECT l.id, l.case_number, l.student_id, u.username AS student_name, u.moodle_id,
              l.course_id, c.fullname AS course_name, l.type_of_work, l.task_type, l.pathology,
              l.content AS task_description, l.media_link, l.consent_form, l.clinical_info,
              l.grade, l.feedback, l.status, l.work_completed_date, l.entry_date,
              l.allow_resubmit, l.teacher_media_link
       FROM logbook_entries l
       JOIN users u ON l.student_id = u.id
       JOIN courses c ON l.course_id = c.id
       WHERE l.course_id IN (?) AND l.deleted_at IS NULL
       ORDER BY l.work_completed_date DESC`,
      [courseIds]
    );

    res.status(200).json({ teacherName: teacherRows[0].username, courses: courseRows, entries });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard", error: error.message });
  }
};

exports.getStudentCourses = async (req, res) => {
  try {
    const { moodle_id, moodle_instance_id } = req.user;

    if (!moodle_instance_id) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const [instanceRows] = await db.promise().query(
      "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      return res.status(404).json({ message: "Moodle instance not found" });
    }

    const moodleInstance = instanceRows[0];

    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "core_enrol_get_users_courses",
        userid: moodle_id,
        moodlewsrestformat: "json",
      },
    });

    res.json(moodleResponse.data);
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};

exports.allowResubmit = async (req, res) => {
  try {
    const { id } = req.params;
    const validId = validator.validateId(id);

    const [result] = await db.promise().query(
      "UPDATE logbook_entries SET allow_resubmit = 1 WHERE id = ?",
      [validId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json({ message: "Resubmission allowed" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ message: "Failed to allow resubmission", error: error.message });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const [entries] = await db.promise().query(
      `SELECT le.id, le.case_number, le.entry_date, le.work_completed_date,
              le.type_of_work, le.grade, le.feedback, le.status, le.media_link,
              le.consent_form, le.clinical_info, le.allow_resubmit,
              s.username AS student, s.id AS student_id,
              c.fullname AS course, c.id AS course_id
       FROM logbook_entries le
       JOIN users s ON le.student_id = s.id
       JOIN courses c ON le.course_id = c.id
       WHERE le.deleted_at IS NULL
       ORDER BY le.entry_date DESC`
    );
    res.json({ entries });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch entries", error: error.message });
  }
};
