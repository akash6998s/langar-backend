const { sheets, SPREADSHEET_ID } = require("../googleSheet");

const SHEET_NAME = "Donations";

// ✅ Get All Donations
const getAllDonations = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.json([]);

    const headers = rows[0];

    const donations = rows.slice(1).map((row) => {
      const rollNumber = row[0];
      const donationObj = { RollNumber: rollNumber };

      headers.forEach((header, idx) => {
        if (idx === 0) return;

        const headerParts = header.trim().split(" ");

        if (headerParts.length === 2) {
          const year = headerParts[0];
          const month = headerParts[1];

          const amount = row[idx] || "0";

          if (amount !== "" && amount !== "0" && amount !== 0) {
            if (!donationObj[year]) {
              donationObj[year] = {};
            }
            donationObj[year][month] = amount;
          }
        }
      });

      return donationObj;
    });

    res.json(donations);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
};

// ✅ Get Donation by RollNumber
const getDonationByRollNumber = async (req, res) => {
  const rollNumber = req.params.rollNumber;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).send("No data found");
    }

    const headers = rows[0];
    const row = rows.slice(1).find((r) => r[0] == rollNumber);

    if (!row) {
      return res.status(404).send("RollNumber not found");
    }

    const donation = { RollNumber: row[0] };

    headers.forEach((header, index) => {
      if (index === 0) return; // skip RollNumber column

      const value = row[index] || "0";

      if (value !== "" && value !== "0" && value !== 0) {
        donation[header] = value;
      }
    });

    res.json(donation);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// ✅ Add Donation
const addOrUpdateDonation = async (req, res) => {
  const { RollNumber, Year, Month, Amount } = req.body;
  if (!RollNumber || !Year || !Month || !Amount) {
    return res
      .status(400)
      .send("RollNumber, Year, Month, and Amount are required");
  }

  const monthKey = `${Year} ${Month}`;

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = getResponse.data.values;
    const headers = rows[0];
    const rollNumbers = rows.slice(1).map((r) => r[0]);

    // 🔍 Find or add Month column
    let monthIndex = headers.indexOf(monthKey);
    if (monthIndex === -1) {
      headers.push(monthKey);
      monthIndex = headers.length - 1;

      // ➕ Add month header
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });

      // ➕ Fill empty column below
      if (rows.length > 1) {
        const emptyColumn = Array(rows.length - 1).fill("");
        const columnLetter = String.fromCharCode(65 + monthIndex);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!${columnLetter}2:${columnLetter}${rows.length}`,
          valueInputOption: "RAW",
          requestBody: { values: emptyColumn.map((e) => [e]) },
        });
      }
    }

    const rowIndex = rollNumbers.findIndex((r) => r == RollNumber);
    if (rowIndex >= 0) {
      const row = rows[rowIndex + 1] || [];

      const existingAmount = parseFloat(row[monthIndex] || "0");
      const newAmount = parseFloat(Amount);

      const totalAmount = existingAmount + newAmount;

      row[monthIndex] = totalAmount.toString();

      const fullRow = headers.map((h, idx) => row[idx] || "");
      const range = `${SHEET_NAME}!A${rowIndex + 2}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: "RAW",
        requestBody: { values: [fullRow] },
      });

      res.send(
        `Donation updated successfully. Total for ${monthKey} is ${totalAmount}`
      );
    } else {
      const newRow = headers.map((h, idx) => {
        if (idx === 0) return RollNumber;
        if (idx === monthIndex) return Amount;
        return "";
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:ZZ`,
        valueInputOption: "RAW",
        requestBody: { values: [newRow] },
      });

      res.send("Donation added successfully");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// ✅ delete Donation
const deleteDonation = async (req, res) => {
  const { RollNumber, Year, Month, Amount } = req.body;
  if (!RollNumber || !Year || !Month || !Amount) {
    return res
      .status(400)
      .send("RollNumber, Year, Month, and Amount are required");
  }

  const monthKey = `${Year} ${Month}`;

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = getResponse.data.values;
    const headers = rows[0];
    const rollNumbers = rows.slice(1).map((r) => r[0]);

    const monthIndex = headers.indexOf(monthKey);
    if (monthIndex === -1) {
      return res.status(400).send(`Month "${monthKey}" not found in sheet`);
    }

    const rowIndex = rollNumbers.findIndex((r) => r == RollNumber);
    if (rowIndex === -1) {
      return res.status(404).send("RollNumber not found");
    }

    const row = rows[rowIndex + 1] || [];

    const existingAmount = parseFloat(row[monthIndex] || "0");
    const deleteAmount = parseFloat(Amount);

    if (existingAmount === 0) {
      return res.status(400).send("No donation exists for this date to delete");
    }

    let totalAmount = existingAmount - deleteAmount;
    if (totalAmount < 0) totalAmount = 0; // ✅ Never go negative

    // ✅ Always set to "0" if zero, not empty string
    row[monthIndex] = totalAmount.toString();

    const fullRow = headers.map(
      (h, idx) => row[idx] || (idx === monthIndex ? "0" : "")
    );
    const range = `${SHEET_NAME}!A${rowIndex + 2}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });

    res.send(
      `Donation deleted successfully. Remaining for ${monthKey} is ${totalAmount}`
    );
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getAllDonations,
  getDonationByRollNumber,
  addOrUpdateDonation,
  deleteDonation,
};
