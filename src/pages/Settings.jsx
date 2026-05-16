import { useState } from 'react';
import { useStore } from '../store.jsx';
import { getConfig, saveConfig, getToken, requestToken, revokeToken } from '../gapi.js';
import { ensureSheetTabs } from '../gapi.js';

export default function Settings() {
  const { syncStatus, dispatch, state, reloadFromSheets } = useStore();
  const cfg = getConfig();

  const [clientId, setClientId] = useState(cfg.clientId || '');
  const [spreadsheetId, setSpreadsheetId] = useState(cfg.spreadsheetId || '');
  const [folderId, setFolderId] = useState(cfg.folderId || '');
  const [authStatus, setAuthStatus] = useState(getToken() ? 'connected' : 'idle');
  const [initStatus, setInitStatus] = useState('idle'); // idle | loading | ok | error
  const [initMsg, setInitMsg] = useState('');
  const [reloadStatus, setReloadStatus] = useState('idle'); // idle | loading | ok | error
  const [reloadMsg, setReloadMsg] = useState('');

  const handleSaveConfig = () => {
    saveConfig({ clientId: clientId.trim(), spreadsheetId: spreadsheetId.trim(), folderId: folderId.trim() });
    alert('บันทึก Config แล้ว');
  };

  const handleConnect = async () => {
    const id = clientId.trim();
    if (!id) { alert('กรุณากรอก Client ID ก่อน'); return; }
    saveConfig({ clientId: id, spreadsheetId: spreadsheetId.trim(), folderId: folderId.trim() });
    setAuthStatus('loading');
    try {
      await requestToken(id);
      setAuthStatus('connected');
    } catch (err) {
      console.error(err);
      setAuthStatus('error');
      alert(`เชื่อมต่อไม่สำเร็จ: ${err.message}`);
    }
  };

  const handleDisconnect = () => {
    revokeToken();
    setAuthStatus('idle');
  };

  const handleClearAll = () => {
    if (!window.confirm('ล้างข้อมูลทั้งหมดใน app นี้ใช่หรือไม่?\n(Projects, Products, Steps, Factories, Members จะหายหมด)\nGoogle Sheets จะไม่ได้รับผลกระทบ)')) return;
    dispatch({ type: 'CLEAR_ALL' });
  };

  const handleReloadFromSheets = async () => {
    const token = getToken();
    const { spreadsheetId: sid } = getConfig();
    if (!sid) { alert('กรุณากรอก Spreadsheet ID ก่อน'); return; }
    if (!token) { alert('กรุณาเชื่อมต่อ Google ก่อน'); return; }
    setReloadStatus('loading');
    setReloadMsg('');
    try {
      await reloadFromSheets();
      setReloadStatus('ok');
      setReloadMsg('โหลดข้อมูลจาก Sheets สำเร็จแล้ว');
    } catch (err) {
      setReloadStatus('error');
      setReloadMsg(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const handleInitSheets = async () => {
    const { spreadsheetId: sid } = getConfig();
    const token = getToken();
    if (!sid) { alert('กรุณากรอก Spreadsheet ID ก่อน'); return; }
    if (!token) { alert('กรุณาเชื่อมต่อ Google ก่อน'); return; }
    setInitStatus('loading');
    setInitMsg('');
    try {
      await ensureSheetTabs(sid, token);
      setInitStatus('ok');
      setInitMsg('สร้าง Sheet Tabs สำเร็จแล้ว (Projects, Products, Steps, Factories, Members)');
    } catch (err) {
      setInitStatus('error');
      setInitMsg(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const syncDot = {
    idle:    '#6b7280',
    pending: '#f59e0b',
    loading: '#60a5fa',
    syncing: '#60a5fa',
    synced:  '#4ade80',
    error:   '#ff4757',
  }[syncStatus] || '#6b7280';

  const syncLabel = {
    idle:    'ไม่ได้เชื่อมต่อ Google Sheets',
    pending: 'รอ sync...',
    loading: 'กำลังโหลดข้อมูลจาก Sheets',
    syncing: 'กำลัง sync...',
    synced:  'Synced แล้ว',
    error:   'Sync ผิดพลาด',
  }[syncStatus] || syncStatus;

  return (
    <div>
      <div className="breadcrumb">Settings</div>

      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">ตั้งค่าการเชื่อมต่อ Google Sheets และ Google Drive</div>
        </div>
      </div>

      {/* Sync status */}
      <div className="card-box" style={{ marginBottom: 16 }}>
        <div className="section-title">สถานะการ Sync</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: syncDot, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{syncLabel}</span>
        </div>
      </div>

      {/* Google API config */}
      <div className="card-box">
        <div className="section-title">Google API Configuration</div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Google OAuth Client ID</label>
            <input
              className="form-input mono"
              placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
              สร้างได้ที่ Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID (type: Web application)
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Google Sheets — Spreadsheet ID</label>
            <input
              className="form-input mono"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
              เอา ID จาก URL ของ Google Sheets: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Google Drive — Folder ID (สำหรับเก็บรูปสินค้า)</label>
            <input
              className="form-input mono"
              placeholder="1a2b3c4d5e6f7g8h9i0j (ไม่บังคับ — ถ้าว่างจะเก็บใน root Drive)"
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
              เอา ID จาก URL ของ Google Drive Folder: drive.google.com/drive/folders/<strong>ID</strong>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleSaveConfig}>บันทึก Config</button>

          {authStatus !== 'connected' ? (
            <button
              className="btn"
              onClick={handleConnect}
              disabled={authStatus === 'loading'}
            >
              {authStatus === 'loading' ? 'กำลังเชื่อมต่อ...' : '🔗 Connect with Google'}
            </button>
          ) : (
            <>
              <span style={{ color: 'var(--success)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                เชื่อมต่อ Google แล้ว
              </span>
              <button className="btn btn-ghost" onClick={handleDisconnect}>ยกเลิกการเชื่อมต่อ</button>
            </>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card-box">
        <div className="section-title">จัดการข้อมูล</div>

        {/* Connection verification */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 12, marginBottom: 16 }}>
          {[
            { label: 'Google OAuth', ok: authStatus === 'connected' },
            { label: 'Spreadsheet ID', ok: !!getConfig().spreadsheetId },
            { label: 'Drive Folder ID', ok: !!getConfig().folderId },
            { label: 'Sheets Sync', ok: syncStatus === 'synced' || syncStatus === 'pending' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 6,
              background: item.ok ? 'rgba(74,222,128,0.08)' : 'rgba(255,71,87,0.08)',
              border: `1px solid ${item.ok ? 'rgba(74,222,128,0.25)' : 'rgba(255,71,87,0.25)'}`,
              fontSize: 12,
            }}>
              <span style={{ fontSize: 14 }}>{item.ok ? '✅' : '❌'}</span>
              <span style={{ color: 'var(--text-dim)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Data counts */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Projects', count: state.projects?.length ?? 0 },
            { label: 'Products', count: state.products?.length ?? 0 },
            { label: 'Steps', count: state.steps?.length ?? 0 },
            { label: 'Factories', count: state.factories?.length ?? 0 },
            { label: 'Members', count: state.members?.length ?? 0 },
          ].map(item => (
            <div key={item.label} style={{
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--surface-2)', fontSize: 12, color: 'var(--text-dim)',
            }}>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{item.count}</span>
              {' '}{item.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleReloadFromSheets} disabled={reloadStatus === 'loading'}>
            {reloadStatus === 'loading' ? '⏳ กำลังโหลด...' : '🔄 โหลดข้อมูลจาก Sheets ใหม่'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={handleClearAll}
          >
            🗑 ล้างข้อมูลทั้งหมด
          </button>
          {reloadMsg && (
            <span style={{ fontSize: 13, color: reloadStatus === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
              {reloadMsg}
            </span>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-mute)' }}>
          "โหลดจาก Sheets" = ดึงข้อมูลล่าสุดจาก Google Sheets มาแทนที่ข้อมูลใน app | "ล้างข้อมูลทั้งหมด" = ลบข้อมูลใน app เท่านั้น (Sheets ไม่เปลี่ยน)
        </div>
      </div>

      {/* Initialize Sheets */}
      <div className="card-box">
        <div className="section-title">Initialize Sheet Structure</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 8, marginBottom: 16 }}>
          สร้าง Tab ที่จำเป็นใน Google Sheets อัตโนมัติ (Projects, Products, Steps, Factories, Members)
          ถ้า Tab มีอยู่แล้วจะไม่ถูกเขียนทับ
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleInitSheets}
            disabled={initStatus === 'loading'}
          >
            {initStatus === 'loading' ? 'กำลังสร้าง...' : 'สร้าง Sheet Tabs'}
          </button>
          {initMsg && (
            <span style={{ fontSize: 13, color: initStatus === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
              {initMsg}
            </span>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="card-box">
        <div className="section-title">วิธีตั้งค่าครั้งแรก</div>
        <ol style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
          <li>สร้าง Google Cloud Project ใหม่ และเปิดใช้งาน Google Sheets API + Google Drive API</li>
          <li>สร้าง OAuth 2.0 Client ID (Web application) — ใส่ <code style={{ background: 'var(--surface-2)', padding: '1px 4px', borderRadius: 3 }}>http://localhost:5173</code> ใน Authorized JavaScript origins</li>
          <li>สร้าง Google Spreadsheet ใหม่ และคัดลอก Spreadsheet ID จาก URL</li>
          <li>(ไม่บังคับ) สร้าง Google Drive Folder สำหรับเก็บรูปสินค้า และคัดลอก Folder ID</li>
          <li>กรอก Client ID, Spreadsheet ID, Folder ID ด้านบน แล้วกด "บันทึก Config"</li>
          <li>กด "Connect with Google" เพื่อ login และขอสิทธิ์</li>
          <li>กด "สร้าง Sheet Tabs" เพื่อเตรียม Spreadsheet</li>
          <li>ข้อมูลจาก app จะ sync เข้า Sheets อัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง</li>
        </ol>
      </div>
    </div>
  );
}
