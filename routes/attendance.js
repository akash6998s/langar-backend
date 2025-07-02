const express = require("express");
const router = express.Router();
const {
  getAllAttendance,
  getAttendanceByRollNumber,
  markAttendanceByDate,
  deleteAttendanceByDate,
} = require("../controllers/attendanceController");

// 🔹 Get full attendance
router.get("/", getAllAttendance);

// 🔹 Get attendance by RollNumber
router.get("/:rollNumber", getAttendanceByRollNumber);

// 🔸 Mark attendance by Date for multiple RollNumbers
router.post("/mark-attendance", markAttendanceByDate);

// 🔸 Delete attendance for a Date and RollNumbers
router.post("/delete-attendance", deleteAttendanceByDate);

module.exports = router;
