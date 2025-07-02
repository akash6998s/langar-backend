const { sheets, SPREADSHEET_ID } = require("../googleSheet");

const MEMBERS_SHEET = "Members";
const DONATIONS_SHEET = "Donations";
const ATTENDANCE_SHEET = "Attendance";

// ✅ Get all members
const getAllMembers = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MEMBERS_SHEET}!A1:K`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.json([]);

    const headers = rows[0];
    const members = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    res.json(members);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// ✅ Get a single member with donation and attendance summary
const getMemberByRollNumber = async (req, res) => {
  const rollNumber = req.params.rollNumber;
  try {
    // ✅ Fetch Members Data
    const membersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MEMBERS_SHEET}!A1:K`,
    });

    const memberRows = membersRes.data.values;
    const memberHeaders = memberRows[0];
    const memberRow = memberRows.slice(1).find((r) => r[0] == rollNumber);

    if (!memberRow) {
      return res.status(404).send("Member not found");
    }

    const memberData = {};
    memberHeaders.forEach((header, i) => {
      if (header !== "RollNumber") {
        memberData[header] = memberRow[i] || "";
      }
    });

    // ✅ Fetch Donations Data
    const donationsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${DONATIONS_SHEET}!A1:ZZ`,
    });

    const donationsRows = donationsRes.data.values;
    const donationHeaders = donationsRows[0];
    const donationRow =
      donationsRows.slice(1).find((r) => r[0] == rollNumber) || [];

    const donations = {};

    donationHeaders.forEach((header, i) => {
      if (i === 0) return; // Skip RollNumber
      const [year, month] = header.split(" "); // Expecting "2025 March"
      if (year && month) {
        if (!donations[year]) {
          donations[year] = {};
        }
        if (donationRow[i]) {
          donations[year][month] = donationRow[i];
        }
      }
    });

    // ✅ Fetch Attendance Data
    const attendanceRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ATTENDANCE_SHEET}!A1:ZZ`,
    });

    const attendanceRows = attendanceRes.data.values;
    const attendanceHeaders = attendanceRows[0];
    const attendanceRow =
      attendanceRows.slice(1).find((r) => r[0] == rollNumber) || [];

    const attendance = {};

    attendanceHeaders.forEach((header, i) => {
      if (i === 0) return; // Skip RollNumber
      const [year, month] = header.split(" "); // Expecting "2025 March"
      if (year && month) {
        if (!attendance[year]) {
          attendance[year] = {};
        }
        if (attendanceRow[i]) {
          attendance[year][month] = attendanceRow[i];
        }
      }
    });

    // ✅ Final Response
    res.json({
      RollNumber: rollNumber,
      member: memberData,
      donations: donations,
      attendance: attendance,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// ✅ Add or update member by RollNumber
const addOrUpdateMember = async (req, res) => {
  const data = req.body;
  const file = req.file;

  if (!data.RollNumber) return res.status(400).send("RollNumber is required");

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MEMBERS_SHEET}!A1:K`,
    });

    const rows = getResponse.data.values;
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const rollNumbers = dataRows.map((r) => r[0]);

    const photo = file ? file.filename : "";

    const row = headers.map((h) => {
      if (h === "RollNumber") return data.RollNumber || "";
      if (h === "Name") return data.Name || "";
      if (h === "LastName") return data.LastName || "";
      if (h === "PhoneNumber") return data.PhoneNumber || "";
      if (h === "Address") return data.Address || "";
      if (h === "Photo") return photo;
      if (h === "isAdmin") return "False";
      if (h === "isSuperAdmin") return "False";
      return "";
    });

    const existingIndex = dataRows.findIndex((r) => r[0] == data.RollNumber);

    // ✅ Check if there is any empty row to reuse
    const emptyIndex = dataRows.findIndex(
      (r) => (r[0] === "" || !r[0]) && r.slice(1).every((x) => x === "")
    );

    if (existingIndex >= 0) {
      // ✅ Update existing row
      const range = `${MEMBERS_SHEET}!A${existingIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      res.send("Member updated successfully");
    } else if (emptyIndex >= 0) {
      // ✅ Fill empty row
      const range = `${MEMBERS_SHEET}!A${emptyIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      res.send("Member added successfully in empty row");
    } else {
      // ✅ No empty row → Append
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MEMBERS_SHEET}!A1:K`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      res.send("Member added successfully");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
};


// ✅ Delete member by RollNumber
const deleteMember = async (req, res) => {
  const { RollNumber } = req.body;
  if (!RollNumber) {
    return res.status(400).send("RollNumber is required");
  }

  try {
    // ✅ Members Sheet
    const membersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MEMBERS_SHEET}!A1:K`,
    });

    const memberRows = membersRes.data.values;
    const headers = memberRows[0];
    const dataRows = memberRows.slice(1);
    const memberIndex = dataRows.findIndex((r) => r[0] == RollNumber);

    let memberName = "";
    if (memberIndex !== -1) {
      const memberRow = dataRows[memberIndex];
      memberName = memberRow[1] || ""; // Assuming Name is in column B

      // ✅ Delete Photo
      const photoFileName = memberRow[headers.indexOf("Photo")] || "";
      if (photoFileName) {
        const photoPath = path.join(__dirname, "../uploads", photoFileName);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          console.log(`Photo ${photoFileName} deleted`);
        }
      }
    }

    // ✅ Donations Sheet
    const donationsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${DONATIONS_SHEET}!A1:ZZ`,
    });

    const donationRows = donationsRes.data.values;
    const donationHeaders = donationRows[0];
    const donationDataRows = donationRows.slice(1);
    const donationIndex = donationDataRows.findIndex((r) => r[0] == RollNumber);

    let totalDonation = 0;
    if (donationIndex !== -1) {
      const donationRow = donationDataRows[donationIndex];
      for (let i = 1; i < donationRow.length; i++) {
        const amount = parseFloat(donationRow[i]);
        if (!isNaN(amount)) {
          totalDonation += amount;
        }
      }

      // ✅ Save in DeletedDonations Sheet
      const deletedDonationRow = [
        RollNumber,
        memberName,
        totalDonation.toString(),
        new Date().toLocaleString(),
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `DeletedDonations!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [deletedDonationRow] },
      });

      // ✅ Clear Donation Row
      const emptyDonationRow = donationHeaders.map((h, idx) =>
        idx === 0 ? RollNumber : ""
      );
      const donationRange = `${DONATIONS_SHEET}!A${donationIndex + 2}:ZZ${donationIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: donationRange,
        valueInputOption: "RAW",
        requestBody: { values: [emptyDonationRow] },
      });
    }

    // ✅ Clear Members Row
    if (memberIndex !== -1) {
      const emptyRow = headers.map((h, idx) =>
        idx === 0 ? RollNumber : ""
      );
      const range = `${MEMBERS_SHEET}!A${memberIndex + 2}:K${memberIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: "RAW",
        requestBody: { values: [emptyRow] },
      });
    }

    // ✅ Attendance Sheet
    const attendanceRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ATTENDANCE_SHEET}!A1:ZZ`,
    });

    const attendanceRows = attendanceRes.data.values;
    const attendanceHeaders = attendanceRows[0];
    const attendanceDataRows = attendanceRows.slice(1);
    const attendanceIndex = attendanceDataRows.findIndex(
      (r) => r[0] == RollNumber
    );

    if (attendanceIndex !== -1) {
      const emptyAttendanceRow = attendanceHeaders.map((h, idx) =>
        idx === 0 ? RollNumber : ""
      );
      const attendanceRange = `${ATTENDANCE_SHEET}!A${
        attendanceIndex + 2
      }:ZZ${attendanceIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: attendanceRange,
        valueInputOption: "RAW",
        requestBody: { values: [emptyAttendanceRow] },
      });
    }

    // ✅ Check if anything was updated
    if (
      memberIndex === -1 &&
      donationIndex === -1 &&
      attendanceIndex === -1
    ) {
      return res.status(404).send("RollNumber not found in any sheet");
    }

    res.send(`Member deleted successfully.`);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


// ✅ Change the RollNumber
const changeRollNumber = async (req, res) => {
    const { oldRollNumber, newRollNumber } = req.body;

    if (!oldRollNumber || !newRollNumber) {
        return res.status(400).send('Both oldRollNumber and newRollNumber are required');
    }

    try {
        let isNewEmpty = true;

        // ✅ Members Sheet
        const membersRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MEMBERS_SHEET}!A1:K`,
        });
        const memberRows = membersRes.data.values;
        const headers = memberRows[0];
        const dataRows = memberRows.slice(1);

        const oldMemberIndex = dataRows.findIndex(r => r[0] == oldRollNumber);
        const newMemberIndex = dataRows.findIndex(r => r[0] == newRollNumber);

        if (oldMemberIndex === -1 || newMemberIndex === -1) {
            return res.status(404).send(`RollNumber ${oldRollNumber} or ${newRollNumber} not found in Members sheet`);
        }

        const newRow = dataRows[newMemberIndex] || [];
        const isEmpty = newRow.slice(1).every(cell => cell === '');
        if (!isEmpty) isNewEmpty = false;

        if (!isNewEmpty) {
            return res.status(400).send(`First delete RollNumber ${newRollNumber}`);
        }

        const oldRow = dataRows[oldMemberIndex] || [];

        // 🔸 Members Sheet (Remove Photo while copying)
        const memberRow = headers.map((h, idx) => {
            if (idx === 0) return newRollNumber;
            if (h === 'Photo') return '';
            return oldRow[idx] || '';
        });

        const memberRange = `${MEMBERS_SHEET}!A${newMemberIndex + 2}:K${newMemberIndex + 2}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: memberRange,
            valueInputOption: 'RAW',
            requestBody: { values: [memberRow] },
        });

        // 🔸 Clear Old Member Row
        const emptyMemberRow = headers.map((h, idx) => (idx === 0 ? oldRollNumber : ''));
        const oldMemberRange = `${MEMBERS_SHEET}!A${oldMemberIndex + 2}:K${oldMemberIndex + 2}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: oldMemberRange,
            valueInputOption: 'RAW',
            requestBody: { values: [emptyMemberRow] },
        });

        // ✅ Donations Sheet
        const donationsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${DONATIONS_SHEET}!A1:ZZ`,
        });
        const donationRows = donationsRes.data.values;
        const donationHeaders = donationRows[0];
        const donationDataRows = donationRows.slice(1);

        const oldDonationIndex = donationDataRows.findIndex(r => r[0] == oldRollNumber);
        const newDonationIndex = donationDataRows.findIndex(r => r[0] == newRollNumber);

        if (oldDonationIndex !== -1 && newDonationIndex !== -1) {
            const oldRow = donationDataRows[oldDonationIndex] || [];
            const donationRow = donationHeaders.map((h, idx) => (idx === 0 ? newRollNumber : (oldRow[idx] || '')));
            const donationRange = `${DONATIONS_SHEET}!A${newDonationIndex + 2}:ZZ${newDonationIndex + 2}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: donationRange,
                valueInputOption: 'RAW',
                requestBody: { values: [donationRow] },
            });

            const emptyDonationRow = donationHeaders.map((h, idx) => (idx === 0 ? oldRollNumber : ''));
            const oldDonationRange = `${DONATIONS_SHEET}!A${oldDonationIndex + 2}:ZZ${oldDonationIndex + 2}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: oldDonationRange,
                valueInputOption: 'RAW',
                requestBody: { values: [emptyDonationRow] },
            });
        }

        // ✅ Attendance Sheet
        const attendanceRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${ATTENDANCE_SHEET}!A1:ZZ`,
        });
        const attendanceRows = attendanceRes.data.values;
        const attendanceHeaders = attendanceRows[0];
        const attendanceDataRows = attendanceRows.slice(1);

        const oldAttendanceIndex = attendanceDataRows.findIndex(r => r[0] == oldRollNumber);
        const newAttendanceIndex = attendanceDataRows.findIndex(r => r[0] == newRollNumber);

        if (oldAttendanceIndex !== -1 && newAttendanceIndex !== -1) {
            const oldRow = attendanceDataRows[oldAttendanceIndex] || [];
            const attendanceRow = attendanceHeaders.map((h, idx) => (idx === 0 ? newRollNumber : (oldRow[idx] || '')));
            const attendanceRange = `${ATTENDANCE_SHEET}!A${newAttendanceIndex + 2}:ZZ${newAttendanceIndex + 2}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: attendanceRange,
                valueInputOption: 'RAW',
                requestBody: { values: [attendanceRow] },
            });

            const emptyAttendanceRow = attendanceHeaders.map((h, idx) => (idx === 0 ? oldRollNumber : ''));
            const oldAttendanceRange = `${ATTENDANCE_SHEET}!A${oldAttendanceIndex + 2}:ZZ${oldAttendanceIndex + 2}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: oldAttendanceRange,
                valueInputOption: 'RAW',
                requestBody: { values: [emptyAttendanceRow] },
            });
        }

        res.send(`Roll number data moved from ${oldRollNumber} to ${newRollNumber} successfully (old data cleared and photo removed)`);
    } catch (error) {
        res.status(500).send(error.message);
    }
};


module.exports = {
  getAllMembers,
  getMemberByRollNumber,
  addOrUpdateMember,
  deleteMember,
  changeRollNumber,
};
