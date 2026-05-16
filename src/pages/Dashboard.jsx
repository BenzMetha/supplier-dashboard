import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { StatusBadge, ProgressBar7 } from '../components.jsx';
import {
  computeStatus, isStepOverdue, getDaysOverdue, getDaysElapsed,
  getProgress7, getDaysUntilDeadline, formatDate,
} from '../logic.js';

export default function Dashboard() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // ── Overdue alerts ──────────────────────────────────────────────────────────
  const overdueItems = state.steps
    .filter(s => isStepOverdue(s))
    .map(step => {
      const product = state.products.find(p => p.id === step.product_id);
      const project = product ? state.projects.find(p => p.id === product.project_id) : null;
      const factory = step.factory_id ? state.factories.find(f => f.id === step.factory_id) : null;
      return { step, product, project, factory };
    })
    .filter(x => x.project)
    .sort((a, b) => getDaysOverdue(b.step) - getDaysOverdue(a.step));

  // ── Stats ───────────────────────────────────────────────────────────────────
  const producingSteps = state.steps.filter(s => s.status !== 'draft' && s.status !== 'delivered').length;
  const urgentCount = overdueItems.filter(x => getDaysOverdue(x.step) >= 3).length;

  const nearestProject = [...state.projects]
    .filter(p => getDaysUntilDeadline(p.deadline) > 0)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  // ── Project list ────────────────────────────────────────────────────────────
  let projects = state.projects.map(project => {
    const products = state.products.filter(p => p.project_id === project.id);
    const allSteps = state.steps.filter(s => products.map(p => p.id).includes(s.product_id));
    const status = computeStatus(allSteps);
    const hasOverdue = allSteps.some(s => isStepOverdue(s));
    const daysUntil = getDaysUntilDeadline(project.deadline);
    const segments = projectProgress7(allSteps);
    const overdueCount = allSteps.filter(s => isStepOverdue(s)).length;
    return { ...project, status, hasOverdue, daysUntil, segments, productCount: products.length, overdueCount };
  });

  if (search) {
    const q = search.toLowerCase();
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q)
    );
  }
  if (filter === 'overdue')  projects = projects.filter(p => p.hasOverdue);
  if (filter === 'deadline') projects = projects.filter(p => p.daysUntil <= 14 && p.daysUntil >= 0);
  if (filter === 'active')   projects = projects.filter(p => p.status !== 'delivered');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">
            ภาพรวม project ทั้งหมด · อัพเดทล่าสุด {formatDate(new Date().toISOString())}
          </div>
        </div>
        <button className="btn" onClick={() => navigate('/projects/new')}>+ Project ใหม่</button>
      </div>

      {/* Alert banner */}
      {overdueItems.length > 0 && (
        <div className="alerts">
          <div className="alert-head">
            ⚠ ต้องตามต่อ — {overdueItems.length} รายการค้างเกินกำหนด
          </div>
          <div className="alert-list">
            {overdueItems.slice(0, 5).map(({ step, product, project, factory }) => (
              <div
                key={step.id}
                className="alert-item"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <span className={`alert-dot${getDaysOverdue(step) >= 3 ? ' danger' : ''}`} />
                <span>
                  <strong>{project.name}</strong>
                  {product && ` / ${product.name}`}
                  {` / step ${step.step_name}`}
                  {factory && ` (โรงงาน ${factory.name})`}
                </span>
                <span className="alert-meta mono">
                  ค้าง {getDaysOverdue(step)} วัน · กำหนด {step.expected_days} วัน
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{state.projects.length}</div>
          <div className="stat-foot">
            {state.projects.filter(p => {
              const prods = state.products.filter(x => x.project_id === p.id);
              const steps = state.steps.filter(s => prods.map(x => x.id).includes(s.product_id));
              return computeStatus(steps) !== 'delivered';
            }).length} กำลังดำเนินการ
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">สินค้ารวมในระบบ</div>
          <div className="stat-value">{state.products.length}</div>
          <div className="stat-foot">{producingSteps} step อยู่ระหว่างผลิต</div>
        </div>
        <div className="stat">
          <div className="stat-label">ต้องตามต่อ</div>
          <div className="stat-value" style={{ color: overdueItems.length > 0 ? 'var(--warn)' : undefined }}>
            {overdueItems.length}
          </div>
          <div className="stat-foot">{urgentCount} รายการเร่งด่วน</div>
        </div>
        <div className="stat">
          <div className="stat-label">Deadline ใกล้สุด</div>
          {nearestProject ? (
            <>
              <div className="stat-value">
                {Math.max(0, getDaysUntilDeadline(nearestProject.deadline))}
                <span className="small">วัน</span>
              </div>
              <div className="stat-foot">
                {nearestProject.name} · {formatDate(nearestProject.deadline)}
              </div>
            </>
          ) : (
            <div className="stat-value">—</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <input
          className="search"
          placeholder="🔍 ค้นหา project, ลูกค้า..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {[
          { key: 'all',      label: 'ทั้งหมด' },
          { key: 'active',   label: 'กำลังดำเนินการ' },
          { key: 'overdue',  label: 'ต้องตามต่อ' },
          { key: 'deadline', label: 'ใกล้ deadline' },
        ].map(f => (
          <div
            key={f.key}
            className={`chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">ไม่มี project ที่ตรงกับเงื่อนไข</div>
          {state.projects.length === 0 && (
            <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/projects/new')}>
              + สร้าง Project แรก
            </button>
          )}
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="pc-head">
                <div>
                  <div className="pc-title">{project.name}</div>
                  <div className="pc-client">
                    ลูกค้า: {project.client} · {project.productCount} สินค้า
                  </div>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <ProgressBar7 segments={project.segments} />
              <div className="pc-meta">
                <span>
                  Deadline: <strong>{formatDate(project.deadline)}</strong>
                  {' · '}
                  {project.daysUntil < 0
                    ? <span className="danger-text">เลย {Math.abs(project.daysUntil)} วัน</span>
                    : `เหลือ ${project.daysUntil} วัน`
                  }
                </span>
                {project.hasOverdue
                  ? <span className="warn-text">⚠ ค้าง {project.overdueCount} step</span>
                  : <span className="success-text">on track</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function projectProgress7(allSteps) {
  const n = allSteps.length;
  if (!n) return Array(7).fill('');

  const sorted = [...allSteps].sort((a, b) => a.order - b.order);
  const deliveredCount = sorted.filter(s => s.status === 'delivered').length;
  const hasOverdue = sorted.some(s => isStepOverdue(s));
  const firstActive = sorted.find(s => s.status !== 'delivered');

  const segments = Array(7).fill('');
  const doneSeg = Math.min(Math.floor((deliveredCount / n) * 7), 7);
  for (let i = 0; i < doneSeg; i++) segments[i] = 'done';

  if (deliveredCount < n && doneSeg < 7) {
    segments[doneSeg] = hasOverdue ? 'late' : 'current';
  } else if (deliveredCount === n) {
    return Array(7).fill('done');
  }

  return segments;
}
