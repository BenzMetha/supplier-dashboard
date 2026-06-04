// Data schema + serialization + Google Sheets sync orchestration

import { sheetRead, sheetWrite } from './gapi.js';

// ── Schema ────────────────────────────────────────────────────────────────────
// Each entry defines: sheet tab name, column headers, serialize (state→sheet),
// deserialize (sheet row→state object).

export const SCHEMA = {
  projects: {
    tab: 'Projects',
    headers: ['id','name','client','deadline','budget','description','created_at'],
    ser: p => ({
      ...p,
      budget:      p.budget      ?? '',
      description: p.description ?? '',
    }),
    de: r => ({
      id:          r.id,
      name:        r.name,
      client:      r.client,
      deadline:    r.deadline,
      budget:      r.budget !== '' ? Number(r.budget) : null,
      description: r.description || '',
      created_at:  r.created_at,
    }),
  },

  products: {
    tab: 'Products',
    headers: ['id','project_id','name','quantity','spec','unit_cost','image_drive_id'],
    ser: p => ({
      ...p,
      quantity:      p.quantity      ?? '',
      unit_cost:     p.unit_cost     ?? '',
      image_drive_id: p.image_drive_id ?? '',
    }),
    de: r => ({
      id:            r.id,
      project_id:    r.project_id,
      name:          r.name,
      quantity:      r.quantity  !== '' ? Number(r.quantity)  : null,
      spec:          r.spec || '',
      unit_cost:     r.unit_cost !== '' ? Number(r.unit_cost) : null,
      image_drive_id: r.image_drive_id || null,
    }),
  },

  steps: {
    tab: 'Steps',
    headers: ['id','product_id','order','step_name','factory_id','assignee_id',
              'status','expected_days','started_at','note','plan_start','plan_end'],
    ser: s => ({
      ...s,
      factory_id:    s.factory_id   ?? '',
      assignee_id:   s.assignee_id  ?? '',
      started_at:    s.started_at   ?? '',
      note:          s.note         ?? '',
      plan_start:    s.plan_start   ?? '',
      plan_end:      s.plan_end     ?? '',
    }),
    de: r => ({
      id:            r.id,
      product_id:    r.product_id,
      order:         Number(r.order) || 1,
      step_name:     r.step_name,
      factory_id:    r.factory_id   || null,
      assignee_id:   r.assignee_id  || null,
      status:        r.status       || 'draft',
      expected_days: Number(r.expected_days) || 7,
      started_at:    r.started_at   || null,
      note:          r.note         || '',
      plan_start:    r.plan_start   || '',
      plan_end:      r.plan_end     || '',
    }),
  },

  factories: {
    tab: 'Factories',
    headers: ['id','name','categories','contact_name','contact_phone','contact_line',
              'address','payment_terms','moq','price_tier','rating','website'],
    ser: f => ({
      ...f,
      categories: Array.isArray(f.categories) ? f.categories.join('|') : '',
      moq:        f.moq ?? '',
      website:    f.website ?? '',
    }),
    de: r => ({
      id:            r.id,
      name:          r.name,
      categories:    r.categories ? r.categories.split('|').filter(Boolean) : [],
      contact_name:  r.contact_name  || '',
      contact_phone: r.contact_phone || '',
      contact_line:  r.contact_line  || '',
      address:       r.address       || '',
      payment_terms: r.payment_terms || '',
      moq:           r.moq !== '' ? Number(r.moq) : null,
      price_tier:    r.price_tier || '฿฿',
      rating:        Number(r.rating) || 4.0,
      website:       r.website || '',
    }),
  },

  members: {
    tab: 'Members',
    headers: ['id','name','initials','color'],
    ser: m => m,
    de:  r => ({ id: r.id, name: r.name, initials: r.initials, color: r.color }),
  },
};

// ── Read ALL sheets → state shape ─────────────────────────────────────────────
// Returns { projects, products, steps, factories, members }.
// Any key whose sheet read fails is set to null (caller should keep existing data).

export async function readFromSheets(spreadsheetId, token) {
  const out = {};
  await Promise.all(
    Object.entries(SCHEMA).map(async ([key, schema]) => {
      try {
        const rows  = await sheetRead(spreadsheetId, schema.tab, token);
        out[key]    = rows.map(schema.de).filter(x => x.id);
      } catch (err) {
        console.warn(`[sync] Failed to read sheet "${schema.tab}":`, err.message);
        out[key] = null; // signal "read failed, keep existing"
      }
    })
  );
  return out;
}

// ── Write ALL sheets ──────────────────────────────────────────────────────────
// Writes every entity type sequentially to avoid rate-limit bursts.

export async function writeAllToSheets(state, spreadsheetId, token) {
  for (const [key, schema] of Object.entries(SCHEMA)) {
    const items = (state[key] || []).map(schema.ser);
    await sheetWrite(spreadsheetId, schema.tab, schema.headers, items, token);
  }
}
