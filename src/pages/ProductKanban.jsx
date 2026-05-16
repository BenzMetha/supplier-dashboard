import { useState } from 'react';
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store.jsx';
import { STATUS_LABELS } from '../logic.js';
import { driveThumbnail } from '../gapi.js';

const DONE_COL = '__done__';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build ordered column names from union of all step_names in the project */
function buildColumns(allSteps) {
  const nameData = {};
  allSteps.forEach(s => {
    if (!nameData[s.step_name]) nameData[s.step_name] = { sum: 0, count: 0 };
    nameData[s.step_name].sum   += s.order;
    nameData[s.step_name].count += 1;
  });
  return Object.entries(nameData)
    .map(([name, d]) => ({ name, avg: d.sum / d.count }))
    .sort((a, b) => a.avg - b.avg)
    .map(x => x.name);
}

/** First step that is NOT 'delivered' = the current active step */
function getCurrentStep(productSteps) {
  const sorted = [...productSteps].sort((a, b) => a.order - b.order);
  return sorted.find(s => s.status !== 'delivered') || null;
}

/** Which column does this product belong to? */
function getProductColId(productSteps) {
  const cur = getCurrentStep(productSteps);
  return cur ? cur.step_name : DONE_COL;
}

// ── Droppable Column ──────────────────────────────────────────────────────────

function KanbanColumn({ colId, title, count, isDone, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });

  return (
    <div
      ref={setNodeRef}
      className={[
        'kb-col',
        isOver  ? 'kb-col--over' : '',
        isDone  ? 'kb-col--done' : '',
        (!isDone && count > 0) ? 'kb-col--active' : '',
      ].join(' ')}
    >
      <div className="kb-col-head">
        <span className={`kb-col-title${isDone ? ' kb-col-title--done' : count > 0 ? ' kb-col-title--active' : ''}`}>
          {title}
        </span>
        <span className={`kb-col-badge${isDone ? ' kb-col-badge--done' : count > 0 ? ' kb-col-badge--active' : ''}`}>
          {count}
        </span>
      </div>

      <div className="kb-cards">
        {count === 0
          ? <div className="kb-empty">ไม่มีสินค้า</div>
          : children
        }
      </div>
    </div>
  );
}

// ── Product Card (draggable) ──────────────────────────────────────────────────

function ProductCard({ product, productSteps, factories, members, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: product.id });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : {};

  const sorted    = [...productSteps].sort((a, b) => a.order - b.order);
  const current   = getCurrentStep(productSteps);
  const doneCount = sorted.filter(s => s.status === 'delivered').length;
  const factory   = current?.factory_id   ? factories.find(f => f.id === current.factory_id)   : null;
  const member    = current?.assignee_id  ? members.find(m => m.id === current.assignee_id)    : null;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
      className={`kb-card${isDragging && !isOverlay ? ' kb-card--dragging' : ''}${isOverlay ? ' kb-card--overlay' : ''}`}
    >
      {/* Thumbnail */}
      <div className="kb-card-thumb">
        {product.image_drive_id
          ? <img
              src={driveThumbnail(product.image_drive_id)}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
            />
          : <span className="kb-card-icon">📦</span>
        }
      </div>

      {/* Info */}
      <div className="kb-card-name">{product.name}</div>

      {product.quantity && (
        <div className="kb-card-meta">
          <span>{product.quantity.toLocaleString()} ชิ้น</span>
          {product.spec && <span>· {product.spec}</span>}
        </div>
      )}

      {/* Factory / Assignee */}
      {(factory || member) && (
        <div className="kb-card-assign">
          {factory && <span className="kb-assign-item">🏭 {factory.name}</span>}
          {member  && (
            <span className="kb-assign-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="kb-avatar" style={{ background: member.color }}>{member.initials}</span>
              {member.name}
            </span>
          )}
        </div>
      )}

      {/* Step progress bar */}
      <div className="kb-stepbar">
        {sorted.map(s => {
          let cls = 'kb-seg';
          if (s.status === 'delivered')           cls += ' kb-seg--done';
          else if (s.status !== 'draft')          cls += ' kb-seg--act';
          return <div key={s.id} className={cls} title={`${s.step_name}: ${STATUS_LABELS[s.status] || s.status}`} />;
        })}
      </div>
      <div className="kb-step-count">{doneCount}/{sorted.length} steps</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProductKanban({ projectId }) {
  const { state, dispatch } = useStore();
  const [activeId, setActiveId] = useState(null);

  const products   = state.products.filter(p => p.project_id === projectId);
  const productIds = products.map(p => p.id);
  const allSteps   = state.steps.filter(s => productIds.includes(s.product_id));

  const columns = buildColumns(allSteps);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;

    const productId  = active.id;
    const targetCol  = over.id; // step_name or DONE_COL

    const pSteps = allSteps
      .filter(s => s.product_id === productId)
      .sort((a, b) => a.order - b.order);

    if (!pSteps.length) return;

    if (targetCol === DONE_COL) {
      // Mark every step as delivered
      pSteps.forEach(s => {
        if (s.status !== 'delivered') {
          dispatch({ type: 'UPDATE_STEP_STATUS', id: s.id, status: 'delivered', note: s.note });
        }
      });
      return;
    }

    const targetIdx = pSteps.findIndex(s => s.step_name === targetCol);
    if (targetIdx === -1) return; // Product has no step with this name → ignore

    pSteps.forEach((step, i) => {
      const newStatus = i < targetIdx ? 'delivered'
                      : i === targetIdx ? 'in_progress'
                      : 'draft';
      if (step.status !== newStatus) {
        dispatch({ type: 'UPDATE_STEP_STATUS', id: step.id, status: newStatus, note: step.note });
      }
    });
  };

  // Build column → products map
  const colMap = Object.fromEntries([...columns, DONE_COL].map(c => [c, []]));
  products.forEach(p => {
    const pSteps = allSteps.filter(s => s.product_id === p.id);
    if (!pSteps.length) return; // No steps → skip
    const col = getProductColId(pSteps);
    if (colMap[col] !== undefined) colMap[col].push(p);
  });

  const activeProd  = activeId ? products.find(p => p.id === activeId) : null;
  const activeSteps = activeProd ? allSteps.filter(s => s.product_id === activeProd.id) : [];

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">ยังไม่มีสินค้า</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kb-hint">
        ✦ ลากการ์ดสินค้าไปยัง column เพื่ออัพเดต step — steps ก่อนหน้าจะถูกทำเครื่องหมาย <strong>ส่งมอบแล้ว</strong> อัตโนมัติ
      </div>

      <div className="kb-board">
        {columns.map(col => (
          <KanbanColumn
            key={col}
            colId={col}
            title={col}
            count={colMap[col]?.length || 0}
          >
            {(colMap[col] || []).map(prod => (
              <ProductCard
                key={prod.id}
                product={prod}
                productSteps={allSteps.filter(s => s.product_id === prod.id)}
                factories={state.factories}
                members={state.members}
              />
            ))}
          </KanbanColumn>
        ))}

        {/* Always show "Done" column last */}
        <KanbanColumn
          colId={DONE_COL}
          title="✅ เสร็จสิ้น"
          count={colMap[DONE_COL]?.length || 0}
          isDone
        >
          {(colMap[DONE_COL] || []).map(prod => (
            <ProductCard
              key={prod.id}
              product={prod}
              productSteps={allSteps.filter(s => s.product_id === prod.id)}
              factories={state.factories}
              members={state.members}
            />
          ))}
        </KanbanColumn>
      </div>

      {/* Ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeProd && (
          <ProductCard
            product={activeProd}
            productSteps={activeSteps}
            factories={state.factories}
            members={state.members}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
