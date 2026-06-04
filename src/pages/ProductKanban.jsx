import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Modal } from '../components.jsx';
import { STATUS_LABELS, STATUS_CSS } from '../logic.js';
import { driveThumbnail } from '../gapi.js';

export default function ProductKanban({ projectId }) {
  const { state, dispatch } = useStore();
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText]   = useState('');

  const products = state.products.filter(p => p.project_id === projectId);

  const openNote = (step) => {
    setNoteModal(step);
    setNoteText(step.note || '');
  };

  const saveNote = () => {
    if (!noteModal) return;
    dispatch({ type: 'UPDATE_STEP', payload: { ...noteModal, note: noteText } });
    setNoteModal(null);
  };

  const toggleDone = (step) => {
    const newStatus = step.status === 'delivered' ? 'in_progress' : 'delivered';
    dispatch({ type: 'UPDATE_STEP_STATUS', id: step.id, status: newStatus, note: step.note });
  };

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">ยังไม่มีสินค้า</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hint */}
      <div className="kb-hint">
        ✦ กด <strong>วงกลม</strong> มุมซ้ายของแต่ละ step เพื่อทำเครื่องหมาย <strong>เสร็จสิ้น</strong> — ทำได้อิสระ ไม่ต้องเรียงลำดับ
      </div>

      {products.map(product => {
        const steps = state.steps
          .filter(s => s.product_id === product.id)
          .sort((a, b) => a.order - b.order);

        const doneCount = steps.filter(s => s.status === 'delivered').length;
        const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

        return (
          <div key={product.id} className="task-group">

            {/* ── Product header ── */}
            <div className="task-group-head">
              <div className="task-group-thumb">
                {product.image_drive_id
                  ? <img
                      src={driveThumbnail(product.image_drive_id)}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                    />
                  : <span style={{ fontSize: 24 }}>📦</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="task-group-name">{product.name}</div>
                {product.spec && (
                  <div className="task-group-spec">{product.spec}</div>
                )}
              </div>
              <div className="task-group-right">
                {product.quantity && (
                  <div className="task-group-qty mono">{product.quantity.toLocaleString()} ชิ้น</div>
                )}
                <div className="task-progress-wrap">
                  <div className="task-progress-bar">
                    <div
                      className="task-progress-fill"
                      style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }}
                    />
                  </div>
                  <div className="task-progress-label">{doneCount}/{steps.length}</div>
                </div>
              </div>
            </div>

            {/* ── Step list ── */}
            <div className="task-list">
              {steps.map((step, idx) => {
                const isDone   = step.status === 'delivered';
                const isActive = step.status === 'in_progress';
                const factory  = step.factory_id  ? state.factories.find(f => f.id === step.factory_id)  : null;
                const member   = step.assignee_id ? state.members.find(m => m.id === step.assignee_id)   : null;

                return (
                  <div
                    key={step.id}
                    className={`task-card${isDone ? ' task-card--done' : isActive ? ' task-card--active' : ''}`}
                  >
                    {/* Circle checkbox */}
                    <button
                      className={`task-check${isDone ? ' task-check--done' : isActive ? ' task-check--active' : ''}`}
                      onClick={() => toggleDone(step)}
                      title={isDone ? 'คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายเสร็จสิ้น'}
                    >
                      {isDone && (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                    {/* Step number */}
                    <div className={`task-num${isDone ? ' task-num--done' : isActive ? ' task-num--active' : ''}`}>
                      {idx + 1}
                    </div>

                    {/* Main content */}
                    <div className="task-content">
                      <div className={`task-name${isDone ? ' task-name--done' : ''}`}>
                        {step.step_name}
                      </div>
                      <div className="task-meta">
                        {factory && (
                          <span className="task-meta-item">🏭 {factory.name}</span>
                        )}
                        {member && (
                          <span className="task-meta-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 18, height: 18, borderRadius: '50%',
                              background: member.color, fontSize: 9, fontWeight: 700, color: 'white',
                              flexShrink: 0,
                            }}>
                              {member.initials}
                            </span>
                            {member.name}
                          </span>
                        )}
                        {step.expected_days && (
                          <span className="task-meta-item mono" style={{ color: 'var(--text-mute)' }}>
                            {step.expected_days} วัน
                          </span>
                        )}
                        {step.note && (
                          <span className="task-meta-item" style={{ color: 'var(--text-mute)', fontStyle: 'italic' }}>
                            "{step.note}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right — status + note btn */}
                    <div className="task-right">
                      <span className={`status-badge ${STATUS_CSS[step.status] || 'status-draft'}`}>
                        {STATUS_LABELS[step.status] || step.status}
                      </span>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '2px 7px', fontSize: 12, opacity: 0.6 }}
                        title="บันทึกหมายเหตุ"
                        onClick={() => openNote(step)}
                      >
                        📝
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Note modal */}
      {noteModal && (
        <Modal
          title={`📝 หมายเหตุ: ${noteModal.step_name}`}
          onClose={() => setNoteModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setNoteModal(null)}>ยกเลิก</button>
              <button className="btn" onClick={saveNote}>บันทึก</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">บันทึก / หมายเหตุ</label>
            <textarea
              className="form-textarea"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="บันทึกสิ่งที่คุยกับโรงงาน, วันส่ง, รายละเอียดเพิ่มเติม..."
              style={{ minHeight: 100 }}
              autoFocus
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>
            💡 กดวงกลมมุมซ้ายเพื่ออัพเดต Process เสร็จสิ้น
          </div>
        </Modal>
      )}
    </div>
  );
}
