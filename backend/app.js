const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const entryRoutes = require("./routes/entryRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const moodleRoutes = require("./routes/moodleRoutes"); 


const app = express();

// Multer Storage Setup (For handling file uploads)
const storage = multer.memoryStorage(); // Stores files in memory
const upload = multer({ storage });

//  Middleware
app.use(cors({
  origin: "https://logbook.human-study.org",
  credentials: true,
}));


app.use(express.json()); // Parse JSON requests app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(bodyParser.json()); // Fallback for JSON parsing

//  Define Routes
app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
//  Use the Moodle routes
app.use("/api/moodle", moodleRoutes);

//  Root Route for Health Check
app.get("/", (req, res) => {
  res.send("🚀 Logbook API is live and running!");
});

console.log("🔍 Using DB user:", process.env.DB_USER);

//  Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

//  Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
