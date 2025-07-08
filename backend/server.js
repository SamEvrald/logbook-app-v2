const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./models/db");
const path = require("path");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const entryRoutes = require("./routes/entryRoutes");
const studentRoutes = require("./routes/studentRoutes"); 
const moodleRoutes = require("./routes/moodleRoutes"); 


const app = express();
app.use(express.json());
app.use(cors());

//  Use Routes
app.use("/auth", authRoutes);
app.use("/teachers", teacherRoutes);
app.use("/entries", entryRoutes);
app.use("/student", studentRoutes); 
// Use the Moodle routes
app.use("/moodle", moodleRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
