export const STATUS_ORDER = ['draft', 'in_progress', 'delivered'];

export const STATUS_LABELS = {
  draft:       'ยังไม่เริ่ม',
  in_progress: 'กำลังดำเนินการ',
  delivered:   'เสร็จแล้ว',
};

export const STATUS_CSS = {
  draft:       'status-draft',
  in_progress: 'status-producing',
  delivered:   'status-delivered',
};

// Migrate old 7-step statuses to the simplified 3-step system
export function migrateStatus(status) {
  if (!status || status === 'draft' || status === 'in_progress' || status === 'delivered') return status || 'draft';
  if (status === 'delivered') return 'delivered';
  // All intermediate statuses → in_progress
  return 'in_progress';
}

// Compute the "slowest" (least-progressed) status among a list of steps.
export function computeStatus(steps) {
  if (!steps || !steps.length) return 'draft';
  let minIdx = STATUS_ORDER.length - 1;
  for (const step of steps) {
    const idx = STATUS_ORDER.indexOf(step.status);
    if (idx >= 0 && idx < minIdx) minIdx = idx;
  }
  return STATUS_ORDER[minIdx];
}

export function getDaysElapsed(step) {
  if (!step.started_at) return 0;
  const ms = Date.now() - new Date(step.started_at).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function isStepOverdue(step) {
  if (step.status === 'delivered' || !step.started_at) return false;
  return getDaysElapsed(step) > step.expected_days;
}

export function getDaysOverdue(step) {
  const elapsed = getDaysElapsed(step);
  return Math.max(0, elapsed - step.expected_days);
}

// Build a 7-segment progress bar state for a list of steps (sorted by order).
export function getProgress7(steps) {
  const n = steps.length;
  if (!n) return Array(7).fill('');

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  // Find first non-delivered step
  const activeIdx = sorted.findIndex(s => s.status !== 'delivered');
  const doneCount = activeIdx === -1 ? n : activeIdx;
  const pct = doneCount / n;

  const segments = Array(7).fill('');
  const doneSeg = Math.floor(pct * 7);
  for (let i = 0; i < doneSeg; i++) segments[i] = 'done';

  if (activeIdx !== -1 && doneSeg < 7) {
    const activeStep = sorted[activeIdx];
    segments[doneSeg] = isStepOverdue(activeStep) ? 'late' : 'current';
  } else if (activeIdx === -1) {
    // All delivered
    for (let i = 0; i < 7; i++) segments[i] = 'done';
  }

  return segments;
}

export function getDaysUntilDeadline(deadline) {
  const d = new Date(deadline);
  d.setHours(23, 59, 59, 999);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`;
}

export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
