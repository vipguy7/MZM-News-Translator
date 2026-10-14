import { getAccessToken } from './firebaseService';

export const exportToGoogleSheets = async (data: { title: string; script: string; seo?: string; category?: string }) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Please sign in with Google to export to Google Sheets.');
  }

  // First, create a new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `News Script: ${data.title || 'Untitled'}`,
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Now, update the sheet with the content
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:D2?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Sheet1!A1:D2',
      majorDimension: 'ROWS',
      values: [
        ['Title', 'Category', 'SEO Data', 'Script Content'],
        [data.title, data.category || '', data.seo || '', data.script]
      ]
    })
  });

  if (!updateRes.ok) {
    const updateErr = await updateRes.json();
    throw new Error(updateErr.error?.message || 'Failed to write content to Google Sheet');
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};
