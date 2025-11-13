import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const SHEET_ID = '1txVlNQZO2xo5gT7IpsZmP7HqU2AtAUQsoLq895ta_ZM';
const GID = '0';

/**
 * Initialize Google Sheets API client
 * Supports both service account (JSON file) and API key authentication
 */
export async function getGoogleSheetsClient() {
  try {
    // Try service account authentication first (recommended)
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS;
    
    if (credentialsPath) {
      // Check if path exists, if not try relative to backend directory
      let fullPath = credentialsPath;
      if (!fs.existsSync(fullPath)) {
        // Try relative to backend directory
        fullPath = path.join(__dirname, '../../', credentialsPath);
      }
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Credentials file not found at: ${credentialsPath} or ${fullPath}`);
      }
      
      const auth = new google.auth.GoogleAuth({
        keyFile: fullPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const authClient = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient as any });
      return sheets;
    }
    
    // Fallback: Try to use default credentials file in backend directory
    const defaultCredentialsPath = path.join(__dirname, '../../nusukautomation-829cadc24582.json');
    if (fs.existsSync(defaultCredentialsPath)) {
      const auth = new google.auth.GoogleAuth({
        keyFile: defaultCredentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const authClient = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient as any });
      return sheets;
    }
    
    // Fallback to API key authentication
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (apiKey) {
      const sheets = google.sheets({ version: 'v4', auth: apiKey });
      return sheets;
    }
    
    throw new Error('Google Sheets credentials not configured. Please set GOOGLE_SHEETS_CREDENTIALS environment variable or place credentials file in backend directory.');
  } catch (error: any) {
    console.error('Error initializing Google Sheets client:', error);
    throw new Error(`Failed to initialize Google Sheets client: ${error.message}`);
  }
}

/**
 * Fetch all data from the configured Google Sheet
 */
export async function fetchSheetData() {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Fetch all data from the sheet (assuming data starts from row 1)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1', // Adjust if your sheet has a different name
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    return rows;
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    throw new Error(`Failed to fetch sheet data: ${error.message}`);
  }
}

export { SHEET_ID, GID };

