const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');


// Import Routes
const memberRoutes = require('./routes/members');
const donationRoutes = require('./routes/donations');
const attendanceRoutes = require('./routes/attendance');
const expenseRoutes = require('./routes/expenses');
const summaryRoutes = require('./routes/summary');
const userRoutes = require("./routes/user");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Use Routes
app.use('/api/members', memberRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/summary', summaryRoutes);
app.use("/api/user", userRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// 👉 Add this small ping route to keep the server alive
app.get('/ping', (req, res) => {
  res.send('Server is alive 🚀');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));