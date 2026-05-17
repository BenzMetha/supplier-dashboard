import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { STATUS_LABELS, STATUS_CSS } from '../logic.js';

export default function TeamMembers() {
  const { state } = useStore();
  const navigate = useNavigate();

  // Build member → assignments map
  const memberData = state.members.map(member => {
    const assignedSteps = state.steps
      .filter(s => s.assignee_id === member.id)
      .map(step => {
        const product = state.products.find(p => p.id === step.product_id);
        const project = product ? state.projects.find(p => p.id === product.project_id) : null;
        return { step, product, project };
      })
      .filter(x => x.project)
      .sort((a, b) => {
        const order = { in_progress: 0, draft: 1, delivered: 2 };
        return (order[a.step.status] ?? 1) - (order[b.step.status] ?? 1);
      });

    const activeCount   = assignedSteps.filter(x => x.step.status === 'in_progress').length;
    const pendingCount  = assignedSteps.filter(x => x.step.status === 'draft').length;
    const doneCount     = assignedSteps.filter(x => x.step.status === 'delivered').length;

    return { member, assignedSteps, activeCount, pendingCount, doneCount };
  });

  // Steps with no assignee that are not delivered
  const unassignedSteps = state.steps
    .filter(s => !s.assignee_id && s.status !== 'delivered')
    .map(step => {
      const product = state.products.find(p => p.id === step.product_id);
      const project = product ? state.projects.find(p => p.id === product.project_id) : null;
      return { step, product, project };
    })
    .filter(x => x.project);

  if (state.members.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Team</div>
            <div className="page-sub">ผู้รับผิดชอบงานและ Process ที่ดำเนินอยู่</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-title">ยังไม่มีผู้รับผิดชอบในระบบ</div>
          <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 8 }}>
            เพิ่มผู้รับผิดชอบได้ตอนสร้าง / แก้ไข Project → กด + ข้างช่องผู้รับผิดชอบใน Step
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Team</div>
          <div className="page-sub">
            ผู้รับผิดชอบงานและ Process ที่ดำเนินอยู่ · {state.members.length} คน
          </div>
        </div>
      </div>

      {/* Member cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 28 }}>
        {memberData.map(({ member, assignedSteps, activeCount, pendingCount, doneCount }) => (
          <div key={member.id} className="card-box" style={{ padding: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: member.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 17, color: 'white',
              }}>
                {member.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, display: 'flex', gap: 10 }}>
                  {activeCount > 0 && (
                    <span style={{ color: '#60a5fa' }}>● {activeCount} กำลังทำ</span>
                  )}
                  {pendingCount > 0 && (
                    <span style={{ color: 'var(--text-mute)' }}>○ {pendingCount} รอ</span>
                  )}
                  {doneCount > 0 && (
                    <span style={{ color: '#4ade80' }}>✓ {doneCount} เสร็จ</span>
                  )}
                  {activeCount === 0 && pendingCount === 0 && doneCount === 0 && (
                    <span style={{ color: 'var(--text-mute)' }}>ไม่มีงานที่ได้รับมอบหมาย</span>
                  )}
                </div>
              </div>
            </div>

            {/* Active & pending steps */}
            {assignedSteps.filter(x => x.step.status !== 'delivered').length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-mute)', padding: '10px 0', textAlign: 'center' }}>
                — ไม่มีงานที่ค้างอยู่ —
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {assignedSteps
                  .filter(x => x.step.status !== 'delivered')
                  .map(({ step, product, project }) => (
                    <div
                      key={step.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{
                        padding: '9px 11px', borderRadius: 7,
                        background: 'var(--surface-2)', cursor: 'pointer',
                        borderLeft: `3px solid ${step.status === 'in_progress' ? '#60a5fa' : 'var(--border)'}`,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{step.step_name}</div>
                        <span className={`status-badge ${STATUS_CSS[step.status] || 'status-draft'}`}
                          style={{ fontSize: 10, flexShrink: 0 }}>
                          {STATUS_LABELS[step.status] || step.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                        📁 {project.name}
                        {product && <span> · 📦 {product.name}</span>}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Completed steps (collapsed summary) */}
            {doneCount > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-mute)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                ✅ เสร็จสิ้นแล้ว {doneCount} step ใน project เหล่านี้
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unassigned steps warning */}
      {unassignedSteps.length > 0 && (
        <div className="card-box">
          <div className="section-title" style={{ color: 'var(--warn)' }}>
            ⚠ ยังไม่มีผู้รับผิดชอบ ({unassignedSteps.length} step)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {unassignedSteps.map(({ step, product, project }) => (
              <div
                key={step.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--surface-2)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{step.step_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>
                    {project.name} · {product?.name}
                  </span>
                </div>
                <span className={`status-badge ${STATUS_CSS[step.status] || 'status-draft'}`}>
                  {STATUS_LABELS[step.status] || step.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
