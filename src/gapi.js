// Google API wrapper — Auth (GIS), Sheets v4, Drive v3
// All functions are pure async; no React dependencies.

const TOKEN_KEY  = 'supplyhub_gtoken';
const CONFIG_KEY = 'supplyhub_config';

// ── Config ────────────────────────────────────────────────────────────────────

export function getConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch { return {}; }
}

export function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ── Token storage ─────────────────────────────────────────────────────────────

export function saveToken(resp) {
  const expiry = Date.now() + ((resp.expires_in || 3600) - 60) * 1000;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: resp.access_token, expiry }));
}

export function getToken() {
  try {
    const { token, expiry } = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
    return (token && Date.now() < expiry) ? token : null;
  } catch { return null; }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Google Identity Services ──────────────────────────────────────────────────

let gisLoaded = false;

function loadGIS() {
  if (gisLoaded || window.google?.accounts?.oauth2) {
    gisLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload  = () => { gisLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

export async function requestToken(clientId) {
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ].join(' '),
      callback(resp) {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        saveToken(resp);
        resolve(resp.access_token);
      },
      error_callback(err) {
        reject(new Error(err?.type || 'OAuth cancelled'));
      },
    });
    client.requestAccessToken({ prompt: '' }); // '' = only consent screen on first time
  });
}

export function revokeToken() {
  const tok = getToken();
  if (tok && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(tok);
  clearToken();
}

// ── Sheets API v4 ─────────────────────────────────────────────────────────────

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

async function sheetsReq(url, options, token) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Sheets API error ${res.status}`);
  }
  return res.json();
}

// Read all rows from one named sheet tab. Returns array of row objects (header-keyed).
export async function sheetRead(spreadsheetId, tabName, token) {
  const enc = encodeURIComponent(tabName);
  const data = await sheetsReq(
    `${SHEETS}/${spreadsheetId}/values/${enc}!A1:Z5000`,
    { method: 'GET' },
    token,
  );
  const vals = data.values || [];
  if (vals.length < 2) return [];
  const headers = vals[0];
  return vals
    .slice(1)
    .filter(r => r.some(c => c !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

// Overwrite one named sheet tab entirely (header row + data rows).
export async function sheetWrite(spreadsheetId, tabName, headers, rows, token) {
  const enc = encodeURIComponent(tabName);
  const values = [
    headers,
    ...rows.map(row => headers.map(h => {
      const v = row[h];
      return v == null ? '' : String(v);
    })),
  ];
  // Clear first so deleted rows don't remain
  await sheetsReq(
    `${SHEETS}/${spreadsheetId}/values/${enc}!A1:Z5000:clear`,
    { method: 'POST' },
    token,
  );
  return sheetsReq(
    `${SHEETS}/${spreadsheetId}/values/${enc}!A1?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values }) },
    token,
  );
}

// Create missing sheet tabs so the app can read/write them.
export async function ensureSheetTabs(spreadsheetId, token) {
  const required = ['Projects', 'Products', 'Steps', 'Factories', 'Members'];
  const meta = await sheetsReq(
    `${SHEETS}/${spreadsheetId}?fields=sheets.properties.title`,
    { method: 'GET' },
    token,
  );
  const existing = (meta.sheets || []).map(s => s.properties.title);
  const toCreate = required.filter(n => !existing.includes(n));
  if (toCreate.length === 0) return;
  await sheetsReq(
    `${SHEETS}/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: toCreate.map(title => ({ addSheet: { properties: { title } } })),
      }),
    },
    token,
  );
}

// ── Drive API v3 ──────────────────────────────────────────────────────────────

export async function driveUpload(file, folderId, token) {
  const meta = { name: file.name, mimeType: file.type || 'application/octet-stream' };
  if (folderId) meta.parents = [folderId];

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Drive upload failed ${res.status}`);
  }
  return res.json(); // { id, name, webViewLink }
}

// Public thumbnail URL (works for files shared "anyone with link can view")
export function driveThumbnail(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
}

export function driveViewLink(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// Make a Drive file publicly readable so thumbnail URLs work without auth
export async function makeFilePublic(fileId, token) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Drive permission failed ${res.status}`);
  }
  return res.json();
}
