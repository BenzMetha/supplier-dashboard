import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { StatusBadge, ProgressBar7, Avatar, Modal } from '../components.jsx';
import {
  computeStatus, isStepOverdue, getDaysElapsed,
  getProgress7, getDaysUntilDeadline, formatDate,
  STATUS_LABELS, STATUS_CSS,
} from '../logic.js';
import ProductKanban from './ProductKanban.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const [view, setView] = useState('board'); // 'list' | 'board'
  const [expanded, setExpanded] = useState({});
  const [statusModal, setStatusModal] = useState(null); // { stepId, currentStatus }
  const [newStatus, setNewStatus] = useState('');
  const [stepNote, setStepNote] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDelete = () => {
    dispatch({ type: 'DELETE_PROJECT', id });
    navigate('/');
  };

  const project = state.projects.find(p => p.id === id);
  if (!project) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">ไม่พบ project นี้</div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const products = state.products.filter(p => p.project_id === id);
  const allSteps = state.steps.filter(s => products.map(p => p.id).includes(s.product_id));
  const projectStatus = computeStatus(allSteps);
  const daysUntil = getDaysUntilDeadline(project.deadline);

  const toggleExpand = (prodId) => setExpanded(e => ({ ...e, [prodId]: !e[prodId] }));

  const openStatusModal = (step) => {
    setStatusModal(step);
    setNewStatus(step.status);
    setStepNote(step.note || '');
  };

  const saveStatus = () => {
    if (!statusModal) return;
    // Only update the note — status is managed via Kanban board
    dispatch({ type: 'UPDATE_STEP', payload: { ...statusModal, note: stepNote } });
    setStatusModal(null);
  };

  return (
    <div>
      <div className="breadcrumb">
        <a onClick={() => navigate('/')}>Dashboard</a> / {project.name}
      </div>

      {/* Project header */}
      <div className="detail-header">
        <div className="dh-top">
          <div>
            <div className="dh-title">{project.name}</div>
            <div className="page-sub">{project.client} · สร้างเมื่อ {formatDate(project.created_at)}</div>
          </div>
          <div className="gap-8">
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setDeleteConfirm(true)}
            >
              🗑 ลบ Project
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(`/projects/${id}/edit`)}>แก้ไข</button>
            <button className="btn" onClick={() => navigate(`/projects/${id}/edit?addProduct=1`)}>+ เพิ่มสินค้า</button>
          </div>
        </div>
        <div className="dh-info">
          <div>
            <div className="dh-info-label">Deadline</div>
            <div className="dh-info-val">
              {formatDate(project.deadline)}
              {' '}
              {daysUntil < 0
                ? <span className="danger-text" style={{ fontSize: 12 }}>(เลย {Math.abs(daysUntil)} วัน)</span>
                : daysUntil <= 7
                ? <span className="warn-text" style={{ fontSize: 12 }}>({daysUntil} วัน)</span>
                : <span className="dim-text" style={{ fontSize: 12 }}>({daysUntil} วัน)</span>
              }
            </div>
          </div>
          <div>
            <div className="dh-info-label">งบประมาณ</div>
            <div className="dh-info-val mono">
              {project.budget ? `฿ ${project.budget.toLocaleString()}` : '—'}
            </div>
          </div>
          <div>
            <div className="dh-info-label">Status รวม</div>
            <div className="dh-info-val"><StatusBadge status={projectStatus} /></div>
          </div>
          <div>
            <div className="dh-info-label">สินค้า / step</div>
            <div className="dh-info-val">
              {products.length} รายการ · {allSteps.length} steps
            </div>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="section-title">
        <span>สินค้าใน Project ({products.length} รายการ)</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn${view === 'board' ? '' : ' btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setView('board')}
          >
            ⊞ Board
          </button>
          <button
            className={`btn${view === 'list' ? '' : ' btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setView('list')}
          >
            ≡ List
          </button>
        </div>
      </div>

      {/* ── Board view ── */}
      {view === 'board' && <ProductKanban projectId={id} />}

      {/* ── List view ── */}
      {view === 'list' && (products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">ยังไม่มีสินค้า</div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate(`/projects/${id}/edit`)}>
            + เพิ่มสินค้า
          </button>
        </div>
      ) : (
        products.map(product => {
          const steps = state.steps
            .filter(s => s.product_id === product.id)
            .sort((a, b) => a.order - b.order);
          const productStatus = computeStatus(steps);
          const segments = getProgress7(steps);
          const isOpen = expanded[product.id];

          return (
            <div key={product.id} className="product-block">
              {/* Product header row */}
              <div className="product-head" onClick={() => toggleExpand(product.id)}>
                <div className="product-img">IMG</div>
                <div>
                  <div className="product-name">{product.name}</div>
                  <div className="product-spec">{product.spec}</div>
                </div>
                <div>
                  <div className="product-qty-label">จำนวน</div>
                  <div className="product-qty mono">
                    {product.quantity?.toLocaleString()} ชิ้น
                  </div>
                </div>
                <div>
                  <div className="product-qty-label">ต้นทุน/ชิ้น</div>
                  <div className="product-qty mono">
                    {product.unit_cost ? `฿ ${product.unit_cost}` : '—'}
                  </div>
                </div>
                <div>
                  <ProgressBar7 segments={segments} mini />
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge status={productStatus} />
                  </div>
                </div>
                <div className="expand-icon">{isOpen ? '▾' : '▸'}</div>
              </div>

              {/* Steps table (expanded) */}
              {isOpen && (
                <div className="steps-table">
                  <div className="steps-row header">
                    <div />
                    <div>Production Step</div>
                    <div>โรงงาน</div>
                    <div>Status</div>
                    <div>ผู้รับผิดชอบ</div>
                    <div>วัน elapsed/นัด</div>
                    <div />
                  </div>
                  {steps.map((step, idx) => {
                    const factory = step.factory_id
                      ? state.factories.find(f => f.id === step.factory_id)
                      : null;
                    const member = step.assignee_id
                      ? state.members.find(m => m.id === step.assignee_id)
                      : null;
                    const elapsed = getDaysElapsed(step);
                    const overdue = isStepOverdue(step);
                    const isDelivered = step.status === 'delivered';

                    let numClass = '';
                    if (isDelivered)              numClass = 'done';
                    else if (overdue)             numClass = 'late';
                    else if (step.status === 'in_progress') numClass = 'current';

                    return (
                      <div key={step.id} className="steps-row">
                        <div className={`step-num ${numClass}`}>
                          {isDelivered ? '✓' : overdue ? '!' : idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{step.step_name}</div>
                          {step.note && (
                            <div className="mute-text" style={{ fontSize: 11, marginTop: 2 }}>
                              {step.note}
                            </div>
                          )}
                        </div>
                        <div className="dim-text">{factory?.name || '—'}</div>
                        <div><StatusBadge status={step.status} /></div>
                        <div><Avatar member={member} /></div>
                        <div className={`days-cell ${overdue ? 'days-late' : isDelivered ? 'days-ontime' : ''}`}>
                          {step.started_at
                            ? `${elapsed} / ${step.expected_days} วัน${overdue ? ' ⚠' : ''}`
                            : `— / ${step.expected_days} วัน`
                          }
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {step.status !== 'delivered' && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              title="บันทึกหมายเหตุ"
                              onClick={e => { e.stopPropagation(); openStatusModal(step); }}
                            >
                              📝
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ))}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <Modal
          title="🗑 ลบ Project"
          onClose={() => setDeleteConfirm(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>ยกเลิก</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                ลบถาวร
              </button>
            </>
          }
        >
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            ต้องการลบ <strong>"{project.name}"</strong> ใช่หรือไม่?
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--danger)', fontSize: 13 }}>
            ⚠ ข้อมูลสินค้าและ steps ทั้งหมดใน project นี้จะถูกลบถาวร ไม่สามารถกู้คืนได้
          </p>
        </Modal>
      )}

      {/* Status update modal */}
      {statusModal && (
        <Modal
          title={`📝 หมายเหตุ: ${statusModal.step_name}`}
          onClose={() => setStatusModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setStatusModal(null)}>ยกเลิก</button>
              <button className="btn" onClick={saveStatus}>บันทึก</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">บันทึก / หมายเหตุ</label>
            <textarea
              className="form-textarea"
              value={stepNote}
              onChange={e => setStepNote(e.target.value)}
              placeholder="บันทึกสิ่งที่คุยกับโรงงาน, วันส่ง, รายละเอียดเพิ่มเติม..."
              style={{ minHeight: 100 }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>
            💡 อัพเดต Process (ย้าย step) ให้ใช้ Board View ด้านบน
          </div>
        </Modal>
      )}
    </div>
  );
}
