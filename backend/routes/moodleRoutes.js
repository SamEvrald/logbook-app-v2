const express = require("express");
const router = express.Router();
const db = require("../models/db"); // Ensure this is your database connection

// ✅ Fetch all Moodle instances
router.get("/instances", async (req, res) => {
  try {
    const [instances] = await db.promise().query("SELECT id, name, base_url FROM moodle_instances");
    res.json(instances);
  } catch (error) {
    console.error("❌ Error fetching Moodle instances:", error);
    res.status(500).json({ message: "Failed to retrieve Moodle instances", error: error.message });
  }
});

module.exports = router;
