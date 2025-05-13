const axios = require("axios");
const db = require("../models/db");
const multer = require("multer"); // ✅ Import Multer
// const path = require("path"); // ✅ Import Path module
// const fs = require("fs"); // ✅ Ensure 'uploads/' exists
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary"); // or define here if not using separate file



// Function to generate a case number based on the course
const generateCaseNumber = async (courseId, courseName) => {
  const [caseResult] = await db.promise().query(
    "SELECT COUNT(*) AS count FROM logbook_entries WHERE course_id = ?",
    [courseId]
  );

  const entryNumber = caseResult[0].count + 1;
  return `${courseName.toUpperCase().replace(/\s+/g, "-")}-${entryNumber}`;
};

// ✅ Set up storage engine
// ✅ Set up Cloudinary storage
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
      pathology,
      clinical_info,
      content,
      consentForm,
      work_completed_date,
      moodle_instance_id,
    } = req.body;

    // const mediaFile = req.file ? `/uploads/${req.file.filename}` : null; // ✅ Store uploaded file path

    const mediaFiles = req.files ? req.files.map(file => file.path) : [];
    console.log("📁 Uploaded files info:", req.files); // ✅ Shows all uploaded files




    

    if (!moodle_id || !courseId || !assignmentId || !work_completed_date || !moodle_instance_id) {
      console.error("❌ Missing required fields:", { moodle_id, courseId, assignmentId, work_completed_date, moodle_instance_id });
      return res.status(400).json({ message: "❌ Required fields are missing." });
    }

    console.log("✅ All required fields received.");

    // ✅ Ensure student exists
    const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "❌ No user found with this Moodle ID." });
    }
    const studentId = userRows[0].id;

    // ✅ Prevent duplicate submissions unless resubmission is allowed
const [existingEntries] = await db.promise().query(
  `SELECT * FROM logbook_entries 
   WHERE student_id = ? AND assignment_id = ? AND moodle_instance_id = ? 
   ORDER BY entry_date DESC LIMIT 1`,
  [studentId, assignmentId, moodle_instance_id]
);

if (existingEntries.length > 0) {
  const latestEntry = existingEntries[0];

  if (latestEntry.status === "graded" && !latestEntry.allow_resubmit) {
    return res.status(400).json({ message: "❌ This entry is graded and locked. Resubmission is not allowed unless permitted by the teacher." });
  }

  if (latestEntry.status === "submitted") {
    return res.status(400).json({ message: "❌ You already submitted this entry and it's awaiting grading." });
  }
}


    // ✅ Ensure course exists
    let [courseRows] = await db.promise().query("SELECT * FROM courses WHERE id = ? AND moodle_instance_id = ?", [courseId, moodle_instance_id]);

    if (courseRows.length === 0) {
      console.log(`⚠️ Course ID ${courseId} not found locally. Fetching from Moodle...`);

      try {
        const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);
        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "❌ Moodle instance not found." });
        }

        const moodleInstance = instanceRows[0];

        // ✅ Fetch course details from Moodle
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

        console.log(`✅ Course Found in Moodle: ${foundCourse.fullname}`);

        // ✅ Insert course into local database
        await db.promise().query(
          `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
          [foundCourse.id, foundCourse.fullname, foundCourse.shortname, moodle_instance_id]
        );

        console.log(`✅ Course ${foundCourse.fullname} inserted into local database.`);
        courseRows = [{ fullname: foundCourse.fullname }];
      } catch (error) {
        console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to fetch course from Moodle.", error: error.message });
      }
    }

    const courseName = courseRows[0].fullname;

    // ✅ Ensure assignment exists in local database
    let [assignmentRows] = await db.promise().query(
      "SELECT moodle_assignment_id FROM assignments WHERE course_id = ? AND moodle_assignment_id = ?",
      [courseId, assignmentId]
    );

    if (assignmentRows.length === 0) {
      console.log(`⚠️ Assignment ID ${assignmentId} not found locally. Fetching from Moodle...`);

      try {
        // ✅ Get Moodle instance
        const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);
        if (instanceRows.length === 0) {
          return res.status(404).json({ message: "❌ Moodle instance not found." });
        }

        const moodleInstance = instanceRows[0];

        // ✅ Fetch assignments from Moodle
        const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleInstance.api_token,
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

        console.log(`✅ Moodle Assignment Found: ${foundAssignment.name} (ID: ${foundAssignment.id})`);

        // ✅ Insert assignment into local database
        await db.promise().query(
          `INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id, moodle_instance_id) 
           VALUES (?, ?, ?, ?)`,
          [courseId, foundAssignment.name, foundAssignment.id, moodle_instance_id]
        );

        console.log(`✅ Assignment ${foundAssignment.name} inserted into local database.`);
      } catch (error) {
        return res.status(500).json({ message: "❌ Failed to fetch assignments from Moodle.", error: error.message });
      }
    }
    // ✅ Check if entry already exists for this student + course + assignment
const [existingRows] = await db.promise().query(
  `SELECT * FROM logbook_entries 
   WHERE student_id = ? AND course_id = ? AND assignment_id = ?`,
  [studentId, courseId, assignmentId]
);

if (existingRows.length > 0) {
  const existingEntry = existingRows[0];
  if (!existingEntry.allow_resubmit) {
    return res.status(400).json({
      message: "❌ You already submitted this entry. Wait for your teacher to allow a resubmission.",
    });
  } else {
    // ✅ Optionally delete the previous entry if overwrite is expected
    await db.promise().query(
      `DELETE FROM logbook_entries 
       WHERE id = ?`,
      [existingEntry.id]
    );
  }
}


    // ✅ Generate Case Number
    const caseNumber = await generateCaseNumber(courseId, courseName);

    // ✅ Insert Logbook Entry
    await db.promise().query(
      `INSERT INTO logbook_entries 
       (case_number, student_id, course_id, assignment_id, type_of_work, pathology, clinical_info, content, consent_form, work_completed_date, media_link, moodle_instance_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        caseNumber, studentId, courseId, assignmentId, type_of_work, pathology || null,
        clinical_info || null, content, consentForm, work_completed_date,
        JSON.stringify(mediaFiles), parseInt(moodle_instance_id)
      ]
    );
    

    res.status(201).json({ message: "✅ Logbook entry created successfully.", case_number: caseNumber, mediaFiles });

  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to create entry", error: error.message });
  }
};

// ✅ Export `upload` middleware for handling file uploads
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


// ✅ Fetch all logbook entries for a student
exports.getStudentEntries = async (req, res) => {
  const { moodle_id } = req.params;

  try {
    // ✅ Fetch student ID from `users` table using moodle_id
    const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User with this Moodle ID not found." });
    }

    const studentId = userRows[0].id;

    // ✅ Fetch required logbook entry fields
    const [entries] = await db.promise().query(
      `SELECT case_number, 
                    DATE_FORMAT(work_completed_date, '%d/%m/%y') AS work_completed_date,
                    type_of_work, 
                    pathology,
                    content AS task_description, 
                    media_link, 
                    consent_form, 
                    clinical_info,
                    grade, 
                    feedback,
                    status
             FROM logbook_entries 
             WHERE student_id = ? 
             ORDER BY work_completed_date DESC`,
      [studentId]
    );

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch student logbook entries.", error: error.message });
  }
};



// ✅ Fetch all submitted logbook entries for a specific course (Teacher View)
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
    // ✅ Fetch all graded entries that are not yet synced
    const [gradedEntries] = await db.promise().query(
      `SELECT le.id, le.grade, le.assignment_id, le.student_id, u.moodle_id, le.course_id, le.moodle_instance_id
       FROM logbook_entries le
       JOIN users u ON le.student_id = u.id
       WHERE le.status = 'graded'`
    );

    if (gradedEntries.length === 0) {
      console.log("✅ No unsynced graded entries found.");
      return res.json({ message: "✅ All grades are already synced to Moodle." });
    }

    // ✅ Fetch Moodle Instance
    const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances");

    if (instanceRows.length === 0) {
      return res.status(404).json({ message: "❌ No Moodle instance found." });
    }

    const moodleInstance = instanceRows[0];

    console.log(`🌍 Moodle URL: ${moodleInstance.base_url}`);
    console.log(`🔑 Moodle API Token: ${moodleInstance.api_token}`);

    // ✅ Prepare Grade Payload for Moodle
    let gradesPayload = gradedEntries.map(entry => ({
      userid: entry.moodle_id,
      grade: entry.grade,
      attemptnumber: -1,
      addattempt: 0,
      workflowstate: "graded",
      applytoall: 0
    }));

    let assignmentIds = [...new Set(gradedEntries.map(entry => entry.assignment_id))]; // Get unique assignment IDs

    for (let assignmentId of assignmentIds) {
      let gradesForAssignment = gradesPayload.filter(g => g.assignmentid === assignmentId);

      // ✅ Send the Grade to Moodle
      const moodleGradeResponse = await axios.post(
        `${moodleInstance.base_url}/webservice/rest/server.php`,
        null, // No request body
        {
          params: {
            wstoken: moodleInstance.api_token,
            wsfunction: "mod_assign_save_grades",
            moodlewsrestformat: "json",
            assignmentid: assignmentId,
            grades: JSON.stringify(gradesForAssignment),
          },
        }
      );

      console.log(`✅ Moodle Grade Response for Assignment ${assignmentId}:`, moodleGradeResponse.data);

      if (moodleGradeResponse.data?.exception) {
        console.error(`❌ Moodle API Error for Assignment ${assignmentId}:`, moodleGradeResponse.data.message);
        continue; // Skip this assignment and proceed with others
      }

      // ✅ Mark Entries as Synced in Local Database
      await db.promise().query(
        `UPDATE logbook_entries SET status = 'synced' WHERE assignment_id = ?`,
        [assignmentId]
      );
    }

    res.json({ message: "✅ All grades synced successfully." });

  } catch (error) {
    console.error("❌ Grade Syncing Error:", error.message);
    res.status(500).json({ message: "❌ Failed to sync grades", error: error.message });
  }
};


// ✅ Update Entry Status (Student submits logbook entry)
exports.updateEntryStatus = async (req, res) => {
  const { entryId, status } = req.body;

  if (!entryId || !status) {
    return res.status(400).json({ message: "Entry ID and status are required." });
  }

  try {
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

// Get teacher Dashboard
exports.getTeacherDashboard = async (req, res) => {
  const { moodle_id } = req.params;

  try {
    // ✅ Get teacher's user ID
    const [teacherRows] = await db.promise().query("SELECT id, fullname FROM users WHERE moodle_id = ? AND role = 'teacher'", [moodle_id]);

    if (teacherRows.length === 0) {
      return res.status(404).json({ message: "Teacher not found or not authorized." });
    }

    const teacherId = teacherRows[0].id;
    const teacherName = teacherRows[0].fullname;

    // ✅ Get courses assigned to this teacher
    const [courseRows] = await db.promise().query(
      "SELECT c.id, c.fullname, c.shortname FROM courses c INNER JOIN teacher_courses tc ON c.id = tc.course_id WHERE tc.teacher_id = ?",
      [teacherId]
    );

    if (courseRows.length === 0) {
      return res.status(200).json({ teacherName, courses: [], entries: [] });
    }

    const courseIds = courseRows.map(course => course.id);

    // ✅ Get logbook entries for these courses
    const [entries] = await db.promise().query(
      `SELECT l.id, l.case_number, l.student_id, u.fullname AS student_name, l.course_id, c.fullname AS course_name, l.type_of_work, l.pathology, 
                  l.content AS task_description, l.media_link, l.consent_form, l.clinical_info, l.grade, l.feedback, l.status, l.work_completed_date
           FROM logbook_entries l
           JOIN users u ON l.student_id = u.id
           JOIN courses c ON l.course_id = c.id
           WHERE l.course_id IN (?) 
           ORDER BY l.work_completed_date DESC`,
      [courseIds]
    );

    res.status(200).json({ teacherName, courses: courseRows, entries });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch teacher dashboard data.", error: error.message });
  }
};
exports.getStudentCourses = async (req, res) => {
  try {
    const { moodle_id, moodle_instance_id } = req.user; // ✅ Ensure moodle_instance_id comes from token

    console.log(`🔍 Fetching courses for Student ID: ${moodle_id}`);
    console.log(`🌍 Moodle Instance ID from Token: ${moodle_instance_id}`);

    if (!moodle_instance_id) {
      console.error("❌ moodle_instance_id is missing in JWT token.");
      return res.status(400).json({ message: "Invalid session. Moodle instance ID is missing." });
    }

    // ✅ Fetch the correct Moodle instance from the database
    const [instanceRows] = await db.promise().query(
      "SELECT * FROM moodle_instances WHERE id = ?", 
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      console.error("❌ Moodle instance not found in database.");
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    console.log(`✅ Using Moodle Instance:`, moodleInstance);
    console.log(`🌍 Moodle Base URL: ${moodleInstance.base_url}`);
    console.log(`🔑 Moodle API Token: ${moodleInstance.api_token}`);

    // ✅ Double-check before making the request
    if (!moodleInstance.base_url || !moodleInstance.api_token) {
      console.error("❌ Moodle instance data is incomplete.");
      return res.status(500).json({ message: "Invalid Moodle instance configuration." });
    }

    // ✅ Fetch courses from the correct Moodle instance
    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "core_enrol_get_users_courses",
        userid: moodle_id,
        moodlewsrestformat: "json",
      },
    });

    console.log(`📚 Moodle Response:`, moodleResponse.data);

    res.json(moodleResponse.data);
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};



// ✅ Fetch All Assignments for a Course from Moodle
exports.getAssignmentsFromMoodle = async (req, res) => {
  console.log("🔍 Request User:", req.user); // Debug log

  const { courseId } = req.params;
  const { moodle_instance_id } = req.user; // ✅ Get moodle_instance_id from the JWT token

  if (!courseId || !moodle_instance_id) {
    return res.status(400).json({ message: "Course ID and Moodle Instance ID are required." });
  }

  console.log(`📡 Fetching assignments from Moodle for Course ID: ${courseId}`);

  try {
    // ✅ Fetch the correct Moodle instance from the database
    const [instanceRows] = await db.promise().query(
      "SELECT * FROM moodle_instances WHERE id = ?",
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    // ✅ Fetch assignments from Moodle
    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token, // ✅ Use the correct API token
        wsfunction: "mod_assign_get_assignments", // ✅ Moodle function for assignments
        moodlewsrestformat: "json",
        [`courseids[0]`]: courseId, // ✅ Ensure correct parameter format
      },
    });

    console.log("📩 Moodle API Response:", moodleResponse.data);

    if (!moodleResponse.data.courses || moodleResponse.data.courses.length === 0) {
      console.warn(`⚠️ No assignments found in Moodle for Course ID: ${courseId}`);
      return res.status(404).json({ message: "No assignments found for this course." });
    }

    const assignments = moodleResponse.data.courses[0].assignments;

    if (!assignments || assignments.length === 0) {
      console.warn(`⚠️ No assignments available for Course ID: ${courseId}`);
      return res.status(404).json({ message: "No assignments available for this course." });
    }

    // ✅ Check if the course exists in the `courses` table
    const [courseRows] = await db.promise().query(
      "SELECT * FROM courses WHERE id = ? AND moodle_instance_id = ?",
      [courseId, moodle_instance_id]
    );

    if (courseRows.length === 0) {
      console.log(`⚠️ Course ID ${courseId} not found locally. Fetching from Moodle...`);

      // ✅ Fetch course details from Moodle
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

      console.log(`✅ Course Found in Moodle: ${foundCourse.fullname}`);

      // ✅ Insert course into local database
      await db.promise().query(
        `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
        [foundCourse.id, foundCourse.fullname, foundCourse.shortname, moodle_instance_id]
      );

      console.log(`✅ Course ${foundCourse.fullname} inserted into local database.`);
    }

    // ✅ Save assignments to the database if they don't already exist
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

        console.log(`✅ Saved assignment: ${assignment.name} (ID: ${assignment.id})`);
      } else {
        console.log(`⚠️ Assignment already exists: ${assignment.name} (ID: ${assignment.id})`);
      }
    }

    console.log(`✅ Found and processed ${assignments.length} assignments.`);
    res.json(assignments);
  } catch (error) {
    console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to fetch assignments from Moodle.", error: error.message });
  }
};



