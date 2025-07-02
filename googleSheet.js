const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = '19R0vtuhYe8j1CfmqTqT7K4NBlNLnayUjKoZI2ucaWfI';

module.exports = { sheets, SPREADSHEET_ID };
