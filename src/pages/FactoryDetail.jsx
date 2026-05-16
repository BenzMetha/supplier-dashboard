import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { StarRating } from '../components.jsx';
import { formatDate } from '../logic.js';

export default function FactoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useStore();

  const factory = state.factories.find(f => f.id === id);
  if (!factory) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">ไม่พบโรงงานนี้</div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/factories')}>
          กลับ Factory Database
        </button>
      </div>
    );
  }

  // Auto-aggregate history from steps
  const historySteps = state.steps
    .filter(s => s.factory_id === id)
    .map(step => {
      const product = state.products.find(p => p.id === step.product_id);
      const project = product ? state.projects.find(p => p.id === product.project_id) : null;
      return { step, product, project };
    })
    .filter(x => x.project)
    .sort((a, b) => {
      const dateA = a.step.started_at ? new Date(a.step.started_at) : 0;
      const dateB = b.step.started_at ? new Date(b.step.started_at) : 0;
      return dateB - dateA;
    });

  const deliveredHistory = historySteps.filter(x => x.step.status === 'delivered');
  const avgLeadTime = deliveredHistory.length
    ? Math.round(deliveredHistory.reduce((sum, x) => sum + x.step.expected_days, 0) / deliveredHistory.length)
    : null;

  return (
    <div>
      <div className="breadcrumb">
        <a onClick={() => navigate('/factories')}>Factories</a> / {factory.name}
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">{factory.name}</div>
          <div className="page-sub">{factory.categories.join(' / ')}</div>
        </div>
        <div className="gap-8">
          <button className="btn btn-ghost" onClick={() => navigate(`/factories/${id}/edit`)}>
            แก้ไขข้อมูล
          </button>
        </div>
      </div>

      <div className="factory-detail-grid">
        {/* Left: info */}
        <div>
          <div className="card-box">
            <div className="section-title">ข้อมูลติดต่อ</div>
            {[
              ['ผู้ติดต่อ',  factory.contact_name],
              ['เบอร์',       factory.contact_phone],
              ['Line',        factory.contact_line],
              ['ที่อยู่',      factory.address],
            ].map(([key, val]) => (
              <div className="info-row" key={key}>
                <span className="info-row-key">{key}</span>
                <span className={`info-row-val${key === 'เบอร์' || key === 'Line' ? ' mono' : ''}`}>
                  {val || '—'}
                </span>
              </div>
            ))}
            {factory.website && (
              <div className="info-row">
                <span className="info-row-key">Website</span>
                <a
                  href={factory.website.startsWith('http') ? factory.website : `https://${factory.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="info-row-val mono"
                  style={{ color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  🔗 {factory.website}
                </a>
              </div>
            )}
          </div>

          <div className="card-box">
            <div className="section-title">เงื่อนไข</div>
            {[
              ['การชำระเงิน', factory.payment_terms],
              ['MOQ',          factory.moq ? `${factory.moq.toLocaleString()} ชิ้น` : null],
              ['Lead time เฉลี่ย', avgLeadTime != null ? `${avgLeadTime} วัน` : factory.moq ? '—' : '—'],
              ['ระดับราคา',    factory.price_tier ? `${factory.price_tier} ${priceTierLabel(factory.price_tier)}` : null],
            ].map(([key, val]) => (
              <div className="info-row" key={key}>
                <span className="info-row-key">{key}</span>
                <span className="info-row-val mono">{val || '—'}</span>
              </div>
            ))}
          </div>

          <div className="card-box">
            <div className="section-title">Rating</div>
            <StarRating rating={factory.rating} />
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-mute)' }}>
              ประเมินโดยทีม · ใช้งาน {historySteps.length} ครั้ง
            </div>
          </div>
        </div>

        {/* Right: history */}
        <div>
          <div className="card-box">
            <div className="section-title">
              <span>ประวัติการผลิต ({historySteps.length} รายการ)</span>
              <span className="mute-text" style={{ fontSize: 12, fontWeight: 400 }}>
                auto จาก project
              </span>
            </div>

            {historySteps.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                ยังไม่มี production step ที่ใช้โรงงานนี้
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>สินค้า / Step</th>
                    <th>จำนวน</th>
                    <th>กำหนด</th>
                    <th>วันที่</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historySteps.map(({ step, product, project }) => (
                    <tr
                      key={step.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td>{project.name}</td>
                      <td>
                        <div>{product?.name}</div>
                        <div className="mute-text" style={{ fontSize: 11 }}>{step.step_name}</div>
                      </td>
                      <td className="mono">{product?.quantity?.toLocaleString() || '—'}</td>
                      <td className="mono">{step.expected_days} วัน</td>
                      <td>{step.started_at ? formatDate(step.started_at) : '—'}</td>
                      <td>
                        <span className={`status-badge status-${statusCss(step.status)}`}>
                          {statusLabel(step.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function priceTierLabel(tier) {
  const map = { '฿': '(ถูก)', '฿฿': '(กลาง)', '฿฿฿': '(แพง)' };
  return map[tier] || '';
}

function statusCss(s) {
  const map = {
    draft: 'draft', sent_to_factory: 'sent', sampling: 'sample',
    approved: 'approved', producing: 'producing', qc: 'qc', delivered: 'delivered',
  };
  return map[s] || 'draft';
}

function statusLabel(s) {
  const map = {
    draft: 'ร่างแบบ', sent_to_factory: 'ส่งโรงงาน', sampling: 'ทำตัวอย่าง',
    approved: 'อนุมัติ', producing: 'ผลิตจริง', qc: 'QC', delivered: 'ส่งมอบ',
  };
  return map[s] || s;
}
