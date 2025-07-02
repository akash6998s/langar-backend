const { google } = require('googleapis');
const credentials = require('./credentials.json');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = '19R0vtuhYe8j1CfmqTqT7K4NBlNLnayUjKoZI2ucaWfI'; // 🔥 Replace this with your actual spreadsheet ID

module.exports = { sheets, SPREADSHEET_ID };
