const express = require('express');
const router = express.Router();
const {
    getAllExpenses,
    addExpense,
    deleteExpenseById
} = require('../controllers/expensesController');

router.get('/', getAllExpenses);
router.post('/add', addExpense);
router.post('/delete', deleteExpenseById);

module.exports = router;
