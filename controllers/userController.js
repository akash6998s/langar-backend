const { sheets, SPREADSHEET_ID } = require("../googleSheet");

const MEMBER_SHEET = "Members";
const STATUS_SHEET = "UserStatus";

// ✅ Signup API
const signup = async (req, res) => {
  const { rollNumber, loginId, password } = req.body;

  if (!rollNumber || !loginId || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields required" });
  }

  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${STATUS_SHEET}!A1:C`,
    });

    const rows = read.data.values || [];
    const headers = rows[0] || ["RollNumber", "loginId", "password"];
    const dataRows = rows.slice(1);

    const loginIdIndex = headers.indexOf("loginId");
    const rollIndex = headers.indexOf("RollNumber");

    const exists = dataRows.some(
      (r) => r[loginIdIndex] === loginId || r[rollIndex] === rollNumber
    );

    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists in UserStatus" });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${STATUS_SHEET}!A1:C1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[rollNumber, loginId, password]],
      },
    });

    res.json({
      success: true,
      message: "Signup successful, waiting for approval",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

// ✅ Login API
const login = async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res
      .status(400)
      .json({ success: false, message: "loginId and password required" });
  }

  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MEMBER_SHEET}!A1:Z`,
    });

    const rows = read.data.values || [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    const loginIndex = headers.indexOf("loginId");
    const passwordIndex = headers.indexOf("password");
    const rollIndex = headers.indexOf("RollNumber");

    if (loginIndex === -1 || passwordIndex === -1) {
      return res.status(500).json({
        success: false,
        message: "loginId or password columns not found in Members sheet",
      });
    }

    const userRow = dataRows.find(
      (r) => r[loginIndex] === loginId && r[passwordIndex] === password
    );

    if (!userRow) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Convert userRow into key:value pair
    const userData = {};
    headers.forEach((header, index) => {
      if (header === "RollNumber") {
        userData["rollNumber"] = userRow[index] || "";
      } else {
        userData[header] = userRow[index] || "";
      }
    });

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

// ✅ Get all UserStatus data
const getUserStatus = async (req, res) => {
  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${STATUS_SHEET}!A1:C`,
    });

    const rows = read.data.values || [];
    if (rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const formattedData = dataRows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Status API — only "approve" and "delete"
const updateStatus = async (req, res) => {
  const { rollNumber, action } = req.body;

  if (!rollNumber || !action) {
    return res.status(400).json({
      success: false,
      message: "rollNumber and action (approve/delete) required",
    });
  }

  try {
    // Read UserStatus
    const statusRead = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${STATUS_SHEET}!A1:C`,
    });

    const rows = statusRead.data.values || [];
    const headers = rows[0] || ["RollNumber", "loginId", "password"];
    const dataRows = rows.slice(1);

    const rollIndex = headers.indexOf("RollNumber");
    const loginIdIndex = headers.indexOf("loginId");
    const passwordIndex = headers.indexOf("password");

    const rowIndex = dataRows.findIndex(
      (r) => String(r[rollIndex]) === String(rollNumber)
    );

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "User not found in UserStatus",
      });
    }

    const userRow = dataRows[rowIndex];

    // ✅ APPROVE
    const extendRow = (row, length) => {
      while (row.length <= length) {
        row.push("");
      }
    };

    if (action === "approve") {
      const memberRead = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MEMBER_SHEET}!A1:Z`,
      });

      const memberRows = memberRead.data.values || [];
      const memberHeaders = memberRows[0];
      const memberDataRows = memberRows.slice(1);

      const memberRollIndex = memberHeaders.indexOf("RollNumber");
      const memberLoginIndex = memberHeaders.indexOf("loginId");
      const memberPasswordIndex = memberHeaders.indexOf("password");
      const memberIsAdminIndex = memberHeaders.indexOf("isAdmin");
      const memberIsSuperAdminIndex = memberHeaders.indexOf("isSuperAdmin");

      const memberRowIndex = memberDataRows.findIndex(
        (r) => String(r[memberRollIndex]) === String(rollNumber)
      );

      if (memberRowIndex !== -1) {
        const memberRow = memberDataRows[memberRowIndex];

        extendRow(
          memberRow,
          Math.max(
            memberLoginIndex,
            memberPasswordIndex,
            memberIsAdminIndex,
            memberIsSuperAdminIndex
          )
        );

        memberRow[memberLoginIndex] = userRow[loginIdIndex];
        memberRow[memberPasswordIndex] = userRow[passwordIndex];

        if (memberIsAdminIndex !== -1) {
          memberRow[memberIsAdminIndex] = "false";
        }
        if (memberIsSuperAdminIndex !== -1) {
          memberRow[memberIsSuperAdminIndex] = "false";
        }

        memberDataRows[memberRowIndex] = memberRow;

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${MEMBER_SHEET}!A2`,
          valueInputOption: "RAW",
          requestBody: { values: memberDataRows },
        });
      }

      // ✅ Remove from UserStatus
      dataRows.splice(rowIndex, 1);

      const updatedValues =
        dataRows.length > 0 ? [headers, ...dataRows] : [headers];

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${STATUS_SHEET}!A1:Z1000`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${STATUS_SHEET}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: updatedValues },
      });

      return res.json({
        success: true,
        message:
          "User approved, credentials moved, and admin roles set to false",
      });
    }

    // ✅ DELETE
    if (action === "delete") {
      dataRows.splice(rowIndex, 1);

      const updatedValues =
        dataRows.length > 0 ? [headers, ...dataRows] : [headers];

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${STATUS_SHEET}!A1:Z1000`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${STATUS_SHEET}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: updatedValues },
      });

      return res.json({
        success: true,
        message: "User deleted from UserStatus",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'delete'.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

module.exports = {
  signup,
  login,
  updateStatus,
  getUserStatus,
};
