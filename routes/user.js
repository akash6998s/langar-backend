const express = require('express');
const { signup, login, updateStatus, getUserStatus } = require('../controllers/userController');
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/status', updateStatus);
router.get('/user-status', getUserStatus);

module.exports = router;
