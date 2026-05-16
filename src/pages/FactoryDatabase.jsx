import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { StarRating } from '../components.jsx';

const ALL_CATEGORIES = ['ผ้า / Fabric', 'ตัดเย็บ', 'สกรีน / Print', 'เย็บปัก', 'หมวก', 'ถุงผ้า', 'บรรจุภัณฑ์', 'สติ๊กเกอร์'];

export default function FactoryDatabase() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Compute avg lead time and use count from steps
  const factories = state.factories.map(factory => {
    const factorySteps = state.steps.filter(s => s.factory_id === factory.id && s.status === 'delivered');
    const useCount = state.steps.filter(s => s.factory_id === factory.id).length;
    const avgDays = factorySteps.length
      ? Math.round(factorySteps.reduce((sum, s) => sum + s.expected_days, 0) / factorySteps.length)
      : null;
    return { ...factory, useCount, avgDays };
  });

  let displayed = factories;

  if (search) {
    const q = search.toLowerCase();
    displayed = displayed.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.categories.some(c => c.toLowerCase().includes(q)) ||
      (f.contact_name || '').toLowerCase().includes(q)
    );
  }

  if (catFilter !== 'all') {
    displayed = displayed.filter(f =>
      f.categories.some(c => c.toLowerCase().includes(catFilter.toLowerCase()))
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Factory Database</div>
          <div className="page-sub">
            โรงงานทั้งหมด {state.factories.length} ราย · อัพเดทอัตโนมัติจาก project
          </div>
        </div>
        <button className="btn" onClick={() => navigate('/factories/new')}>+ เพิ่มโรงงาน</button>
      </div>

      <div className="filter-row">
        <input
          className="search"
          placeholder="🔍 ค้นหาโรงงาน, ประเภทงาน..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div
          className={`chip${catFilter === 'all' ? ' active' : ''}`}
          onClick={() => setCatFilter('all')}
        >
          ทั้งหมด
        </div>
        {ALL_CATEGORIES.map(cat => (
          <div
            key={cat}
            className={`chip${catFilter === cat ? ' active' : ''}`}
            onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
          >
            {cat}
          </div>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">ไม่พบโรงงานที่ตรงกับเงื่อนไข</div>
          {state.factories.length === 0 && (
            <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/factories/new')}>
              + เพิ่มโรงงานแรก
            </button>
          )}
        </div>
      ) : (
        <div className="factory-grid">
          {displayed.map(factory => (
            <div
              key={factory.id}
              className="factory-card"
              onClick={() => navigate(`/factories/${factory.id}`)}
            >
              <div className="factory-name">{factory.name}</div>
              <div className="factory-type">{factory.categories.join(' / ')}</div>
              <StarRating rating={factory.rating} />
              <div className="factory-stats">
                <div>
                  <div className="factory-stat-num mono">{factory.useCount}</div>
                  <div className="factory-stat-lab">ครั้งที่ใช้</div>
                </div>
                <div>
                  <div className="factory-stat-num mono">
                    {factory.avgDays != null ? `${factory.avgDays}d` : '—'}
                  </div>
                  <div className="factory-stat-lab">เฉลี่ย/ครั้ง</div>
                </div>
                <div>
                  <div className="factory-stat-num">{factory.price_tier}</div>
                  <div className="factory-stat-lab">ระดับราคา</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
