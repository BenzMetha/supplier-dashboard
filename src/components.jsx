import { useLocation, useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_CSS } from './logic.js';
import { useStore } from './store.jsx';

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { syncStatus } = useStore();

  const navItems = [
    { path: '/',            label: '▦  Dashboard',        section: 'Main' },
    { path: '/projects/new',label: '+  Create Project',    section: null },
    { path: '/factories',   label: '⛁  Factories',         section: 'Database' },
    { path: '/activity',    label: '◷  Activity',           section: 'Team',     disabled: true },
    { path: '/settings',    label: '⚙  Settings',           section: null },
  ];

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  let lastSection = null;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-dot" />
          SupplyHub
        </div>
        {navItems.map(item => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <span key={item.path}>
              {showSection && <div className="nav-section">{item.section}</div>}
              <div
                className={`nav-item${isActive(item.path) ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
                onClick={() => !item.disabled && navigate(item.path)}
              >
                {item.label}
              </div>
            </span>
          );
        })}
        <div className="sync-indicator">
          <div className={`sync-dot sync-dot--${syncStatus}`} />
          <span className="sync-label">
            {{ idle: 'Not connected', pending: 'Pending…', loading: 'Loading…', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error' }[syncStatus] || syncStatus}
          </span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${STATUS_CSS[status] || 'status-draft'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── 7-segment progress bar ────────────────────────────────────────────────────
export function ProgressBar7({ segments, mini = false }) {
  return (
    <div className={mini ? 'product-progress-mini' : 'pc-progress'}>
      {(segments || Array(7).fill('')).map((seg, i) => (
        <div key={i} className={`pc-progress-seg ${seg}`} />
      ))}
    </div>
  );
}

// ── Avatar + name ─────────────────────────────────────────────────────────────
export function Avatar({ member, showName = true }) {
  if (!member) return <span className="mute-text" style={{ fontSize: 12 }}>—</span>;
  return (
    <div className="assignee">
      <div className="avatar" style={{ background: member.color }}>{member.initials}</div>
      {showName && member.name}
    </div>
  );
}

// ── Star rating display ───────────────────────────────────────────────────────
export function StarRating({ rating }) {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return (
    <div className="factory-rating">
      <span className="star">{'★'.repeat(full)}</span>
      <span style={{ color: 'var(--text-mute)' }}>{'★'.repeat(empty)}</span>
      <span className="mono dim-text">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Generic Modal ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, footer, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span>{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
