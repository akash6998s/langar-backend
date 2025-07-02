const express = require('express');
const router = express.Router();
const upload = require("../middlewares/upload");
const {
    getAllMembers,
    getMemberByRollNumber,
    addOrUpdateMember,
    deleteMember,
    changeRollNumber,
} = require('../controllers/membersController');

// 🔹 Get all members
router.get('/', getAllMembers);

// 🔹 Get a single member with donation and attendance
router.get('/:rollNumber', getMemberByRollNumber);

// // 🔸 Add or Edit member by RollNumber
// router.post('/add', addOrUpdateMember);

// 🔸 Add or Edit member with image upload
router.post("/add", upload.single("Photo"), addOrUpdateMember);

// 🔸 Delete member by RollNumber
router.post('/delete', deleteMember);

// 🔸 Change Roll Number API
router.post('/change-roll-number', changeRollNumber);


module.exports = router;
