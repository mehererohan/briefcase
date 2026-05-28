const TOKEN_KEY = 'gsheets_token';
const EXPIRY_KEY = 'gsheets_token_expiry';

export function getAuthToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() >= Number(expiry)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
  return token;
}

export function signOutGoogle() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function signInWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = window.location.origin;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const popup = window.open(
    authUrl,
    'google-oauth',
    'width=600,height=600,scrollbars=yes,resizable=yes'
  );

  if (!popup) {
    return Promise.reject(new Error('Popup was blocked. Please allow popups for this site and try again.'));
  }

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error('Sign-in cancelled.'));
          return;
        }

        const href = popup.location.href;

        if (href.startsWith(redirectUri) && href.includes('access_token')) {
          clearInterval(interval);
          popup.close();

          const hash = new URLSearchParams(popup.location.hash.slice(1));
          const accessToken = hash.get('access_token');
          const expiresIn = Number(hash.get('expires_in') || 3600);

          if (!accessToken) {
            reject(new Error('No access token found in OAuth response.'));
            return;
          }

          localStorage.setItem(TOKEN_KEY, accessToken);
          localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));

          resolve(accessToken);
        }
      } catch {
        // Cross-origin access throws while popup is on Google's domain — ignore and keep polling
      }
    }, 500);
  });
}

export async function logProspectToSheets({ name, title, company, meetingType, icpScore, linkedinNote, coldEmail, status, dateAdded }) {
  const sheetsId = import.meta.env.VITE_GOOGLE_SHEETS_ID;

  let token = getAuthToken();
  if (!token) {
    token = await signInWithGoogle();
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/Prospects!A:I:append`
  );
  url.searchParams.set('valueInputOption', 'RAW');
  url.searchParams.set('insertDataOption', 'INSERT_ROWS');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[name, title, company, meetingType, icpScore, linkedinNote, coldEmail, status, dateAdded]],
    }),
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    throw new Error('Google Sheets session expired. Please reconnect your Google account and try again.');
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets API error ${res.status}: ${err}`);
  }

  return res.json();
}
