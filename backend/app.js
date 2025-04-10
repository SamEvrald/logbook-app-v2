
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const entryRoutes = require("./routes/entryRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const moodleRoutes = require("./routes/moodleRoutes"); // ✅ Import the Moodle routes


dotenv.config();
const app = express();

// ✅ Multer Storage Setup (For handling file uploads)
const storage = multer.memoryStorage(); // Stores files in memory
const upload = multer({ storage });

// ✅ Middleware
app.use(cors({
  origin: ["https://logbook-app-v2-ubcj.vercel.app", "http://localhost:3000"],
  credentials: true,
}));

app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(bodyParser.json()); // Fallback for JSON parsing

// ✅ Define Routes
app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.use("/teachers", teacherRoutes);
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);
// ✅ Use the Moodle routes
app.use("/moodle", moodleRoutes);



// ✅ Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// ✅ Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
