const { sheets, SPREADSHEET_ID } = require("../googleSheet");

const SHEET_NAME = "Attendance";

// ✅ Get All Attendance
const getAllAttendance = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.json([]);

    const headers = rows[0];

    const attendance = rows.slice(1).map((row) => {
      const rollNumber = row[0];
      const attendanceObj = {
        RollNumber: rollNumber,
      };

      headers.forEach((header, idx) => {
        if (idx === 0) return; // Skip RollNumber

        const headerParts = header.trim().split(" ");

        if (headerParts.length === 2) {
          const year = headerParts[0];
          const month = headerParts[1];

          const dates = row[idx] || "";

          if (dates !== "") {
            if (!attendanceObj[year]) {
              attendanceObj[year] = {};
            }
            attendanceObj[year][month] = dates;
          }
        }
      });

      return attendanceObj;
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
};

// ✅ Get Attendance by RollNumber
const getAttendanceByRollNumber = async (req, res) => {
  const rollNumber = req.params.rollNumber;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = response.data.values;
    const headers = rows[0];

    const row = rows.slice(1).find((r) => r[0] == rollNumber);
    if (!row) return res.status(404).send("Member not found");

    const attendance = { RollNumber: row[0] };

    headers.forEach((header, index) => {
      if (index === 0) return; // Skip RollNumber column

      const headerParts = header.trim().split(" ");
      if (headerParts.length === 2) {
        const month = headerParts[1]; // Extract month
        const dates = row[index] || "";

        if (dates !== "") {
          attendance[month] = dates;
        }
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
};

// ✅ Mark Attendance by Date for Multiple RollNumbers
const markAttendanceByDate = async (req, res) => {
  const { Year, Month, Date, RollNumber } = req.body;

  if (!Year || !Month || !Date || !RollNumber || !Array.isArray(RollNumber)) {
    return res
      .status(400)
      .send("Year, Month, Date, and RollNumber array are required.");
  }

  const columnHeader = `${Year} ${Month}`;

  try {
    // Get current sheet data
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = getResponse.data.values || [];
    const headers = rows[0] || ["RollNumber"];
    const dataRows = rows.slice(1);
    const rollNumbers = dataRows.map((r) => r[0]);

    // Find or create the month column
    let monthIndex = headers.indexOf(columnHeader);
    if (monthIndex === -1) {
      headers.push(columnHeader);
      monthIndex = headers.length - 1;

      // Update header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });

      // Add empty cells for the new column
      if (dataRows.length > 0) {
        const emptyColumn = Array(dataRows.length).fill("");
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!${String.fromCharCode(
            65 + monthIndex
          )}2:${String.fromCharCode(65 + monthIndex)}${dataRows.length + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: emptyColumn.map((e) => [e]) },
        });
      }
    }

    // Process each RollNumber
    for (let rn of RollNumber) {
      const rowIndex = rollNumbers.findIndex((r) => r == rn);

      if (rowIndex >= 0) {
        // ✅ Roll number exists — update
        const row = dataRows[rowIndex];
        const existingDates = row[monthIndex] || "";

        const dateArray = existingDates
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d);

        if (!dateArray.includes(String(Date))) {
          dateArray.push(String(Date));
          const newDates = dateArray.join(",");

          row[monthIndex] = newDates;

          const fullRow = headers.map((h, idx) => row[idx] || "");

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${rowIndex + 2}`,
            valueInputOption: "RAW",
            requestBody: { values: [fullRow] },
          });
        }
      } else {
        // ✅ Roll number doesn't exist — add new row
        const newRow = headers.map((h, idx) => {
          if (idx === 0) return rn;
          if (idx === monthIndex) return String(Date);
          return "";
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A1:ZZ`,
          valueInputOption: "RAW",
          requestBody: { values: [newRow] },
        });
      }
    }

    res.send("Attendance marked successfully.");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
};

// ✅ Delete Attendance by Date for Multiple RollNumbers
const deleteAttendanceByDate = async (req, res) => {
  const { Year, Month, Date, RollNumber } = req.body;

  // Validation
  if (!Year || !Month || !Date || !RollNumber || !Array.isArray(RollNumber)) {
    return res
      .status(400)
      .send("Year, Month, Date, and RollNumber array are required.");
  }

  const columnHeader = `${Year} ${Month}`;

  try {
    // Fetch current sheet data
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:ZZ`,
    });

    const rows = getResponse.data.values;
    const headers = rows[0];
    const rollNumbers = rows.slice(1).map((r) => r[0]);

    const monthIndex = headers.indexOf(columnHeader);
    if (monthIndex === -1) {
      return res.status(400).send(`Column '${columnHeader}' does not exist.`);
    }

    // Process each roll number
    for (let rn of RollNumber) {
      const rowIndex = rollNumbers.findIndex((r) => r == rn);

      if (rowIndex >= 0) {
        const row = rows[rowIndex + 1];
        const existingDates = row[monthIndex] || "";

        const dateArray = existingDates
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d && d !== String(Date));

        const newDates = dateArray.join(",");

        row[monthIndex] = newDates;

        const fullRow = headers.map((h, idx) => row[idx] || "");

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${rowIndex + 2}`,
          valueInputOption: "RAW",
          requestBody: { values: [fullRow] },
        });
      }
    }

    res.send("Attendance date removed successfully.");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceByRollNumber,
  markAttendanceByDate,
  deleteAttendanceByDate,
};
