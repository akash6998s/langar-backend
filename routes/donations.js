const express = require('express');
const router = express.Router();
const {
    getAllDonations,
    getDonationByRollNumber,
    addOrUpdateDonation,
    deleteDonation
} = require('../controllers/donationsController');

// 🔹 Get all donations
router.get('/', getAllDonations);

// 🔹 Get donation of a single roll number
router.get('/:rollNumber', getDonationByRollNumber);

// 🔸 Add or update donation
router.post('/add', addOrUpdateDonation);

// 🔻 Delete donation (subtract amount)
router.post('/delete', deleteDonation);

module.exports = router;
