const { sheets, SPREADSHEET_ID } = require('../googleSheet');

const DONATIONS_SHEET = 'Donations';
const EXPENSES_SHEET = 'Expenses';
const DELETED_DONATIONS_SHEET = 'DeletedDonations';

// ✅ Finance Summary
const getSummary = async (req, res) => {
    try {
        let totalDonations = 0;
        let totalExpenses = 0;
        let totalDeletedDonations = 0;

        // 🔹 Fetch Donations
        const donationRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${DONATIONS_SHEET}!A1:ZZ`,
        });

        const donationRows = donationRes.data.values;

        if (donationRows && donationRows.length > 1) {
            const headers = donationRows[0].slice(1); // exclude RollNumber
            const dataRows = donationRows.slice(1);

            dataRows.forEach(row => {
                headers.forEach((header, idx) => {
                    const amount = parseFloat(row[idx + 1] || 0);
                    totalDonations += isNaN(amount) ? 0 : amount;
                });
            });
        }

        // 🔹 Fetch Expenses (Fix Applied)
        const expenseRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${EXPENSES_SHEET}!A2:E`, // ID, Year, Month, Amount, Description
        });

        const expenseRows = expenseRes.data.values;

        if (expenseRows) {
            expenseRows.forEach(row => {
                const amount = parseFloat(row[3] || 0); // Amount is in 4th column
                totalExpenses += isNaN(amount) ? 0 : amount;
            });
        }

        // 🔹 Fetch Deleted Donations
        try {
            const deletedRes = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${DELETED_DONATIONS_SHEET}!A2:C`, // RollNumber, Name, TotalDonation
            });

            const deletedRows = deletedRes.data.values;

            if (deletedRows) {
                deletedRows.forEach(row => {
                    const amount = parseFloat(row[2] || 0);
                    totalDeletedDonations += isNaN(amount) ? 0 : amount;
                });
            }
        } catch (err) {
            console.log('DeletedDonations sheet not found or empty');
            totalDeletedDonations = 0;
        }

        const balance = totalDonations - totalExpenses;

        // 🔥 Response
        res.json({
            totalDonations,
            totalExpenses,
            totalDeletedDonations,
            balance,
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { getSummary };
