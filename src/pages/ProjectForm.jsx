import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { genId, calcPlanDays } from '../logic.js';
import { getToken, getConfig, driveUpload, driveThumbnail, driveViewLink, makeFilePublic } from '../gapi.js';
import { Modal } from '../components.jsx';

const MEMBER_COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#3b82f6','#8b5cf6','#10b981','#ef4444'];

const EMPTY_STEP = () => ({
  id: genId('step'),
  step_name: '',
  factory_id: '',
  assignee_id: '',
  expected_days: 7,
  plan_start: '',
  plan_end: '',
  status: 'draft',
  started_at: null,
  note: '',
  order: 0,
});

const EMPTY_PRODUCT = () => ({
  id: genId('prod'),
  name: '',
  quantity: '',
  spec: '',
  unit_cost: '',
  image_drive_id: null,
  steps: [EMPTY_STEP()],
});

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useStore();

  const isEdit = Boolean(id);
  const existing = isEdit ? state.projects.find(p => p.id === id) : null;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [products, setProducts] = useState([EMPTY_PRODUCT()]);
  const [uploadingIdx, setUploadingIdx] = useState(null); // product index being uploaded

  // ── Quick-add factory / member modal ────────────────────────────────────────
  const [quickModal, setQuickModal] = useState(null); // { type:'factory'|'member', pIdx, sIdx }
  const [quickName, setQuickName] = useState('');
  const [quickInitials, setQuickInitials] = useState('');
  const [quickColor, setQuickColor] = useState('#6366f1');

  // Pre-fill when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setClient(existing.client);
      setDeadline(existing.deadline);
      setBudget(existing.budget ?? '');
      setDescription(existing.description ?? '');

      const existingProducts = state.products
        .filter(p => p.project_id === id)
        .map(prod => {
          const steps = state.steps
            .filter(s => s.product_id === prod.id)
            .sort((a, b) => a.order - b.order)
            .map(s => ({ ...s }));
          return { ...prod, image_drive_id: prod.image_drive_id ?? null, steps: steps.length ? steps : [EMPTY_STEP()] };
        });

      setProducts(existingProducts.length ? existingProducts : [EMPTY_PRODUCT()]);
    }
  }, [id]);

  // ── Product helpers ──────────────────────────────────────────────────────────
  const updateProduct = (idx, field, val) =>
    setProducts(ps => ps.map((p, i) => i === idx ? { ...p, [field]: val } : p));

  const addProduct = () => setProducts(ps => [...ps, EMPTY_PRODUCT()]);

  const removeProduct = (idx) =>
    setProducts(ps => ps.filter((_, i) => i !== idx));

  // ── Step helpers ─────────────────────────────────────────────────────────────
  const updateStep = (pIdx, sIdx, field, val) =>
    setProducts(ps => ps.map((p, i) =>
      i !== pIdx ? p : {
        ...p,
        steps: p.steps.map((s, j) => j !== sIdx ? s : { ...s, [field]: val }),
      }
    ));

  const updateStepMulti = (pIdx, sIdx, updates) =>
    setProducts(ps => ps.map((p, i) =>
      i !== pIdx ? p : {
        ...p,
        steps: p.steps.map((s, j) => j !== sIdx ? s : { ...s, ...updates }),
      }
    ));

  const addStep = (pIdx) =>
    setProducts(ps => ps.map((p, i) =>
      i !== pIdx ? p : { ...p, steps: [...p.steps, EMPTY_STEP()] }
    ));

  const removeStep = (pIdx, sIdx) =>
    setProducts(ps => ps.map((p, i) =>
      i !== pIdx ? p : { ...p, steps: p.steps.filter((_, j) => j !== sIdx) }
    ));

  // ── Image upload to Drive ────────────────────────────────────────────────────
  const handleImageUpload = async (pIdx, file) => {
    const token = getToken();
    if (!token) {
      alert('กรุณาเชื่อมต่อ Google ก่อน (Settings → Connect with Google)');
      return;
    }
    const { folderId } = getConfig();
    setUploadingIdx(pIdx);
    try {
      const result = await driveUpload(file, folderId || null, token);
      await makeFilePublic(result.id, token); // allow thumbnail URL to work
      updateProduct(pIdx, 'image_drive_id', result.id);
    } catch (err) {
      alert(`อัพโหลดรูปไม่สำเร็จ: ${err.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  // ── Quick-add factory / member ───────────────────────────────────────────────
  const openQuickAdd = (type, pIdx, sIdx) => {
    setQuickModal({ type, pIdx, sIdx });
    setQuickName('');
    setQuickInitials('');
    setQuickColor('#6366f1');
  };

  const saveQuickAdd = () => {
    if (!quickModal || !quickName.trim()) return;
    if (quickModal.type === 'factory') {
      const newFactory = {
        id: genId('fac'), name: quickName.trim(), categories: [],
        contact_name: '', contact_phone: '', contact_line: '',
        address: '', payment_terms: '', moq: null, price_tier: '฿฿', rating: 4.0,
      };
      dispatch({ type: 'ADD_FACTORY', payload: newFactory });
      updateStep(quickModal.pIdx, quickModal.sIdx, 'factory_id', newFactory.id);
    } else {
      const initials = quickInitials.trim() || quickName.trim().slice(0, 2).toUpperCase();
      const newMember = { id: genId('mem'), name: quickName.trim(), initials, color: quickColor };
      dispatch({ type: 'ADD_MEMBER', payload: newMember });
      updateStep(quickModal.pIdx, quickModal.sIdx, 'assignee_id', newMember.id);
    }
    setQuickModal(null);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = (asDraft = false) => {
    if (!name.trim() || !client.trim()) {
      alert('กรุณากรอกชื่อ Project และลูกค้า');
      return;
    }

    const projectId = existing?.id || genId('proj');
    const project = {
      id: projectId,
      name: name.trim(),
      client: client.trim(),
      deadline: deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: budget ? Number(budget) : null,
      description: description.trim(),
      created_at: existing?.created_at || new Date().toISOString().split('T')[0],
    };

    const flatProducts = products
      .filter(p => p.name.trim())
      .map(p => ({
        id: p.id,
        project_id: projectId,
        name: p.name.trim(),
        quantity: p.quantity ? Number(p.quantity) : null,
        spec: p.spec.trim(),
        unit_cost: p.unit_cost ? Number(p.unit_cost) : null,
        image_drive_id: p.image_drive_id ?? null,
      }));

    const flatSteps = products
      .filter(p => p.name.trim())
      .flatMap(p =>
        p.steps
          .filter(s => s.step_name.trim())
          .map((s, idx) => ({
            id: s.id,
            product_id: p.id,
            order: idx + 1,
            step_name: s.step_name.trim(),
            factory_id: s.factory_id || null,
            assignee_id: s.assignee_id || null,
            expected_days: s.expected_days ? Number(s.expected_days) : 7,
            plan_start: s.plan_start || '',
            plan_end: s.plan_end || '',
            status: s.status || 'draft',
            started_at: s.started_at || null,
            note: s.note || '',
          }))
      );

    dispatch({ type: 'SAVE_PROJECT_FULL', payload: { project, products: flatProducts, steps: flatSteps } });
    navigate(`/projects/${projectId}`);
  };

  return (
    <div>
      <div className="breadcrumb">
        <a onClick={() => navigate('/')}>Dashboard</a>
        {isEdit && (
          <>
            {' / '}
            <a onClick={() => navigate(`/projects/${id}`)}>{existing?.name}</a>
          </>
        )}
        {' / '}{isEdit ? 'แก้ไข' : 'สร้าง Project ใหม่'}
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'แก้ไข Project' : 'สร้าง Project ใหม่'}</div>
          <div className="page-sub">กรอกข้อมูล project + เพิ่มสินค้าได้เลยในหน้าเดียว</div>
        </div>
        <div className="gap-8">
          <button className="btn btn-ghost" onClick={() => navigate(isEdit ? `/projects/${id}` : '/')}>
            ยกเลิก
          </button>
          <button className="btn btn-secondary" onClick={() => handleSave(true)}>Save Draft</button>
          <button className="btn" onClick={() => handleSave(false)}>
            {isEdit ? 'บันทึก' : 'สร้าง Project'}
          </button>
        </div>
      </div>

      {/* Project info */}
      <div className="card-box">
        <div className="section-title">ข้อมูล Project</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">ชื่อ Project *</label>
            <input
              className="form-input"
              placeholder="เช่น SS26 Tee Drop"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ลูกค้า / Brand *</label>
            <input
              className="form-input"
              placeholder="เช่น Loom & Co."
              value={client}
              onChange={e => setClient(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input
              className="form-input"
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">งบประมาณรวม (บาท)</label>
            <input
              className="form-input mono"
              placeholder="เช่น 240000"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">รายละเอียดเพิ่มเติม</label>
            <textarea
              className="form-textarea"
              placeholder="โน้ตเกี่ยวกับ project..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="card-box">
        <div className="section-title">
          <span>สินค้าใน Project</span>
          <button className="btn btn-secondary" onClick={addProduct}>+ เพิ่มสินค้า</button>
        </div>

        {/* Quick-add factory / member modal */}
        {quickModal && (
          <Modal
            title={quickModal.type === 'factory' ? '🏭 เพิ่มโรงงานใหม่' : '👤 เพิ่มผู้รับผิดชอบใหม่'}
            onClose={() => setQuickModal(null)}
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setQuickModal(null)}>ยกเลิก</button>
                <button className="btn" onClick={saveQuickAdd}>เพิ่ม</button>
              </>
            }
          >
            <div className="form-group">
              <label className="form-label">{quickModal.type === 'factory' ? 'ชื่อโรงงาน *' : 'ชื่อ *'}</label>
              <input
                className="form-input"
                autoFocus
                placeholder={quickModal.type === 'factory' ? 'เช่น โรงงาน A ผ้า' : 'เช่น สมชาย ใจดี'}
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveQuickAdd()}
              />
            </div>
            {quickModal.type === 'member' && (
              <>
                <div className="form-group">
                  <label className="form-label">ชื่อย่อ (ไม่เกิน 2 ตัว)</label>
                  <input
                    className="form-input"
                    placeholder="เช่น SM"
                    maxLength={2}
                    value={quickInitials}
                    onChange={e => setQuickInitials(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">สี Avatar</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {MEMBER_COLORS.map(c => (
                      <div
                        key={c}
                        onClick={() => setQuickColor(c)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c,
                          cursor: 'pointer',
                          border: quickColor === c ? '3px solid white' : '2px solid transparent',
                          boxShadow: quickColor === c ? `0 0 0 2px ${c}` : 'none',
                          transition: 'box-shadow 0.15s',
                        }}
                      />
                    ))}
                  </div>
                  {/* Preview */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: quickColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, color: 'white' }}>
                      {(quickInitials || quickName.slice(0,2)).toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                      {quickName || '(ชื่อ)'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Modal>
        )}

        {products.map((prod, pIdx) => (
          <div key={prod.id} className="product-form-block">
            <div className="product-form-head">
              <strong>สินค้าที่ {pIdx + 1}{prod.name ? ` — ${prod.name}` : ''}</strong>
              {products.length > 1 && (
                <span className="remove-x" onClick={() => removeProduct(pIdx)}>✕ ลบสินค้า</span>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">ชื่อสินค้า</label>
                <input
                  className="form-input"
                  placeholder="เช่น เสื้อยืดโลโก้กลาง"
                  value={prod.name}
                  onChange={e => updateProduct(pIdx, 'name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">จำนวน</label>
                <input
                  className="form-input mono"
                  placeholder="500"
                  value={prod.quantity}
                  onChange={e => updateProduct(pIdx, 'quantity', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">สเปก / รายละเอียด</label>
                <input
                  className="form-input"
                  placeholder="เช่น Cotton 100% / สีดำ / Size S-XL"
                  value={prod.spec}
                  onChange={e => updateProduct(pIdx, 'spec', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">ราคาต้นทุน/ชิ้น (บาท)</label>
                <input
                  className="form-input mono"
                  placeholder="180"
                  value={prod.unit_cost}
                  onChange={e => updateProduct(pIdx, 'unit_cost', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">รูปสินค้า (อัพโหลดไปยัง Google Drive)</label>
                {prod.image_drive_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a href={driveViewLink(prod.image_drive_id)} target="_blank" rel="noreferrer">
                      <img
                        src={driveThumbnail(prod.image_drive_id)}
                        alt="product"
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    </a>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Drive ID: {prod.image_drive_id}</span>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: 12 }}>
                        เปลี่ยนรูป
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingIdx === pIdx}
                          onChange={e => e.target.files[0] && handleImageUpload(pIdx, e.target.files[0])} />
                      </label>
                      <span className="add-link" onClick={() => updateProduct(pIdx, 'image_drive_id', null)}>ลบรูป</span>
                    </div>
                  </div>
                ) : (
                  <label className="file-drop" style={{ cursor: 'pointer' }}>
                    {uploadingIdx === pIdx
                      ? <span style={{ color: 'var(--text-dim)' }}>กำลังอัพโหลด...</span>
                      : <>
                          <span style={{ fontSize: 22, marginBottom: 4 }}>📎</span>
                          <span>คลิกเพื่อเลือกรูปภาพ</span>
                          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>PNG, JPG, WEBP — ไฟล์จะถูกบันทึกใน Google Drive</span>
                        </>
                    }
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingIdx === pIdx}
                      onChange={e => e.target.files[0] && handleImageUpload(pIdx, e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Production Steps */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div className="section-title" style={{ fontSize: 13 }}>Production Steps</div>
              <div className="step-form-head">
                <div>ชื่อ Step</div>
                <div>โรงงาน</div>
                <div>ผู้รับผิดชอบ</div>
                <div>ช่วงเวลา (เริ่ม → จบ)</div>
                <div />
              </div>

              {prod.steps.map((step, sIdx) => (
                <div key={step.id} className="step-form-row">
                  <input
                    className="form-input"
                    placeholder="เช่น สั่งผ้า"
                    value={step.step_name}
                    onChange={e => updateStep(pIdx, sIdx, 'step_name', e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select
                      className="form-select"
                      value={step.factory_id}
                      onChange={e => updateStep(pIdx, sIdx, 'factory_id', e.target.value)}
                    >
                      <option value="">— เลือกโรงงาน —</option>
                      {state.factories.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '0 10px', fontSize: 18, flexShrink: 0 }}
                      title="เพิ่มโรงงานใหม่"
                      onClick={() => openQuickAdd('factory', pIdx, sIdx)}
                    >+</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select
                      className="form-select"
                      value={step.assignee_id}
                      onChange={e => updateStep(pIdx, sIdx, 'assignee_id', e.target.value)}
                    >
                      <option value="">— ผู้รับผิดชอบ —</option>
                      {state.members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '0 10px', fontSize: 18, flexShrink: 0 }}
                      title="เพิ่มผู้รับผิดชอบใหม่"
                      onClick={() => openQuickAdd('member', pIdx, sIdx)}
                    >+</button>
                  </div>
                  <div className="step-date-range">
                    <input
                      className="form-input"
                      type="date"
                      value={step.plan_start}
                      onChange={e => {
                        const newStart = e.target.value;
                        const days = newStart && step.plan_end ? calcPlanDays(newStart, step.plan_end) : step.expected_days;
                        updateStepMulti(pIdx, sIdx, { plan_start: newStart, expected_days: days });
                      }}
                    />
                    <input
                      className="form-input"
                      type="date"
                      value={step.plan_end}
                      min={step.plan_start || undefined}
                      onChange={e => {
                        const newEnd = e.target.value;
                        const days = step.plan_start && newEnd ? calcPlanDays(step.plan_start, newEnd) : step.expected_days;
                        updateStepMulti(pIdx, sIdx, { plan_end: newEnd, expected_days: days });
                      }}
                    />
                    {step.plan_start && step.plan_end && (
                      <div className="step-date-days">
                        {calcPlanDays(step.plan_start, step.plan_end)} วัน
                      </div>
                    )}
                  </div>
                  <span
                    className="remove-x"
                    onClick={() => prod.steps.length > 1 && removeStep(pIdx, sIdx)}
                    style={{ opacity: prod.steps.length <= 1 ? 0.3 : 1 }}
                  >
                    ✕
                  </span>
                </div>
              ))}

              <span className="add-link" onClick={() => addStep(pIdx)}>+ เพิ่ม Step</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
