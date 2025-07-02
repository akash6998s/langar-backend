const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/summaryController');

// 🔥 Get total donations, expenses, and balance
router.get('/', getSummary);

module.exports = router;
