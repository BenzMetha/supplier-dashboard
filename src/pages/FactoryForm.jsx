import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { genId } from '../logic.js';

const CATEGORY_OPTIONS = [
  'ผ้า', 'Fabric', 'ตัดเย็บ', 'สกรีน', 'DTF', 'เย็บปัก', 'หมวก', 'Headwear',
  'ถุงผ้า', 'Canvas', 'บรรจุภัณฑ์', 'สติ๊กเกอร์', 'Die-cut', 'อื่นๆ',
];

export default function FactoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useStore();

  const isEdit = Boolean(id);
  const existing = isEdit ? state.factories.find(f => f.id === id) : null;

  const [name, setName] = useState('');
  const [categories, setCategories] = useState([]);
  const [customCat, setCustomCat] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLine, setContactLine] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [moq, setMoq] = useState('');
  const [priceTier, setPriceTier] = useState('฿฿');
  const [rating, setRating] = useState('4.0');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCategories(existing.categories || []);
      setContactName(existing.contact_name || '');
      setContactPhone(existing.contact_phone || '');
      setContactLine(existing.contact_line || '');
      setAddress(existing.address || '');
      setPaymentTerms(existing.payment_terms || '');
      setMoq(existing.moq ?? '');
      setPriceTier(existing.price_tier || '฿฿');
      setRating(String(existing.rating || 4.0));
      setWebsite(existing.website || '');
    }
  }, [id]);

  const toggleCategory = (cat) =>
    setCategories(cs =>
      cs.includes(cat) ? cs.filter(c => c !== cat) : [...cs, cat]
    );

  const addCustomCat = () => {
    const t = customCat.trim();
    if (t && !categories.includes(t)) {
      setCategories(cs => [...cs, t]);
      setCustomCat('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('กรุณากรอกชื่อโรงงาน');
      return;
    }
    const factory = {
      id: existing?.id || genId('fact'),
      name: name.trim(),
      categories,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_line: contactLine.trim(),
      address: address.trim(),
      payment_terms: paymentTerms.trim(),
      moq: moq ? Number(moq) : null,
      price_tier: priceTier,
      rating: parseFloat(rating) || 4.0,
      website: website.trim(),
    };

    if (isEdit) {
      dispatch({ type: 'UPDATE_FACTORY', payload: factory });
    } else {
      dispatch({ type: 'ADD_FACTORY', payload: factory });
    }
    navigate(isEdit ? `/factories/${factory.id}` : '/factories');
  };

  const handleDelete = () => {
    if (!window.confirm(`ลบโรงงาน "${name}" ออกจากระบบ?`)) return;
    dispatch({ type: 'DELETE_FACTORY', id });
    navigate('/factories');
  };

  return (
    <div>
      <div className="breadcrumb">
        <a onClick={() => navigate('/factories')}>Factories</a>
        {isEdit && (
          <>
            {' / '}
            <a onClick={() => navigate(`/factories/${id}`)}>{existing?.name}</a>
          </>
        )}
        {' / '}{isEdit ? 'แก้ไข' : 'เพิ่มโรงงานใหม่'}
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'แก้ไขโรงงาน' : 'เพิ่มโรงงานใหม่'}</div>
          <div className="page-sub">ข้อมูลติดต่อและเงื่อนไขการทำงาน</div>
        </div>
        <div className="gap-8">
          {isEdit && (
            <button className="btn btn-danger" onClick={handleDelete}>ลบโรงงาน</button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate(isEdit ? `/factories/${id}` : '/factories')}>
            ยกเลิก
          </button>
          <button className="btn" onClick={handleSave}>บันทึก</button>
        </div>
      </div>

      {/* Basic info */}
      <div className="card-box">
        <div className="section-title">ข้อมูลหลัก</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">ชื่อโรงงาน *</label>
            <input
              className="form-input"
              placeholder="เช่น Threadline Co."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ระดับราคา</label>
            <select
              className="form-select"
              value={priceTier}
              onChange={e => setPriceTier(e.target.value)}
            >
              <option value="฿">฿ — ถูก</option>
              <option value="฿฿">฿฿ — กลาง</option>
              <option value="฿฿฿">฿฿฿ — แพง</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rating (1–5)</label>
            <input
              className="form-input mono"
              placeholder="4.0"
              value={rating}
              onChange={e => setRating(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">MOQ (ชิ้น)</label>
            <input
              className="form-input mono"
              placeholder="100"
              value={moq}
              onChange={e => setMoq(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">ประเภทงาน</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {CATEGORY_OPTIONS.map(cat => (
                <div
                  key={cat}
                  className={`chip${categories.includes(cat) ? ' active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="พิมพ์ประเภทงานเพิ่มเติม..."
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomCat()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={addCustomCat}>เพิ่ม</button>
            </div>
            {categories.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                เลือก: {categories.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card-box">
        <div className="section-title">ข้อมูลติดต่อ</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">ผู้ติดต่อ</label>
            <input
              className="form-input"
              placeholder="เช่น คุณสมชาย วงศ์ทอง"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">เบอร์โทร</label>
            <input
              className="form-input mono"
              placeholder="081-234-5678"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Line ID</label>
            <input
              className="form-input mono"
              placeholder="@threadline"
              value={contactLine}
              onChange={e => setContactLine(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ที่อยู่</label>
            <input
              className="form-input"
              placeholder="เช่น บางบอน, กรุงเทพฯ"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Website / Link อ้างอิง</label>
            <input
              className="form-input mono"
              placeholder="https://..."
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">เงื่อนไขการชำระเงิน</label>
            <input
              className="form-input"
              placeholder="เช่น 50% มัดจำ / 50% ก่อนส่งมอบ"
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
