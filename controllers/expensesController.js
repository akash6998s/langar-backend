const { sheets, SPREADSHEET_ID } = require('../googleSheet');
const { v4: uuidv4 } = require('uuid');

const SHEET_NAME = 'Expenses';

// ✅ Get All Expenses
const getAllExpenses = async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:E`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return res.json([]);

        const headers = rows[0];
        const expenses = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        res.json(expenses);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// ✅ Add New Expense
const addExpense = async (req, res) => {
    const { Year, Month, Amount, Description } = req.body;

    if (!Year || !Month || !Amount || !Description) {
        return res.status(400).send('Year, Month, Amount, and Description are required');
    }

    const ID = uuidv4(); // Unique ID

    const newRow = [ID, Year, Month, Amount, Description];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:E`,
            valueInputOption: 'RAW',
            requestBody: { values: [newRow] },
        });

        res.send('Expense added successfully');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// ✅ Delete Expense by ID
const deleteExpenseById = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).send('ID is required');
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:E`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).send('No data found');
        }

        const headers = rows[0];
        const idIndex = headers.indexOf('ID');

        if (idIndex === -1) {
            return res.status(500).send('ID column not found in sheet');
        }

        const rowIndex = rows.findIndex((row, index) => index !== 0 && row[idIndex] === id);

        if (rowIndex === -1) {
            return res.status(404).send('Expense with this ID not found');
        }

        // Delete the row (rowIndex + 1 because Sheets is 1-indexed)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: 0, // Change this if your sheet is not the first one
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1,
                            },
                        },
                    },
                ],
            },
        });

        res.send('Expense deleted successfully');
    } catch (error) {
        res.status(500).send(error.message);
    }
};


module.exports = {
    getAllExpenses,
    addExpense,
    deleteExpenseById
};
