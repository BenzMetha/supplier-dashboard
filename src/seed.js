// Reference date: 2026-05-13
// Overdue setup:
//   step_3  สกรีน (prod_1):  started May 6, expected 2d → elapsed 7d, overdue 5d
//   step_16 ทำตัวอย่าง (prod_5): started May 6, expected 3d → elapsed 7d, overdue 4d
//   step_4  ส่งโรงงาน (prod_2): started May 9, expected 1d → elapsed 4d, overdue 3d

export const SEED = {
  projects: [
    { id: 'proj_1', name: 'SS26 Tee Drop',    client: 'Loom & Co.',    deadline: '2026-05-20', budget: 240000, description: '',                           created_at: '2026-04-01' },
    { id: 'proj_2', name: 'Capsule FW25',      client: 'North Atelier', deadline: '2026-06-15', budget: null,   description: '',                           created_at: '2026-03-15' },
    { id: 'proj_3', name: 'Pop-up Bangkok',    client: 'Internal',      deadline: '2026-07-02', budget: 180000, description: 'Pop-up event collection',     created_at: '2026-04-10' },
    { id: 'proj_4', name: 'Tote Bag Reorder',  client: 'Mellow Mart',   deadline: '2026-05-28', budget: 85000,  description: '',                           created_at: '2026-04-20' },
  ],

  products: [
    // SS26 Tee Drop
    { id: 'prod_1',  project_id: 'proj_1', name: 'เสื้อยืดโลโก้กลาง', quantity: 500,  spec: 'Cotton 100% / สีดำ / Size S-XL',          unit_cost: 180, image_drive_id: null },
    { id: 'prod_2',  project_id: 'proj_1', name: 'หมวกแก๊ป',           quantity: 200,  spec: 'Cotton twill / Embroidery / 5-panel',      unit_cost: 220, image_drive_id: null },
    { id: 'prod_3',  project_id: 'proj_1', name: 'ถุงผ้า Canvas',       quantity: 300,  spec: 'Cotton canvas 12oz / สกรีน 1 จุด',         unit_cost: 95,  image_drive_id: null },
    { id: 'prod_4',  project_id: 'proj_1', name: 'Sticker pack',        quantity: 1000, spec: 'Die-cut vinyl / 4 ลาย',                    unit_cost: 15,  image_drive_id: null },
    // Capsule FW25
    { id: 'prod_5',  project_id: 'proj_2', name: 'กางเกงขาสั้น',        quantity: 300,  spec: 'Cotton ripstop / Navy / S-XL',             unit_cost: 250, image_drive_id: null },
    { id: 'prod_6',  project_id: 'proj_2', name: 'เสื้อ Oversize',       quantity: 400,  spec: 'Cotton 240gsm / Off-white',                unit_cost: 200, image_drive_id: null },
    { id: 'prod_7',  project_id: 'proj_2', name: 'กระเป๋า Tote',         quantity: 200,  spec: 'Canvas 10oz / ปักโลโก้',                   unit_cost: 120, image_drive_id: null },
    // Pop-up Bangkok
    { id: 'prod_8',  project_id: 'proj_3', name: 'เสื้อ Pop-up',         quantity: 500,  spec: 'Cotton 180gsm / Various colors',           unit_cost: 150, image_drive_id: null },
    { id: 'prod_9',  project_id: 'proj_3', name: 'สติ๊กเกอร์ Set',        quantity: 2000, spec: 'Die-cut vinyl / 6 ลาย',                    unit_cost: 12,  image_drive_id: null },
    // Tote Bag Reorder
    { id: 'prod_10', project_id: 'proj_4', name: 'Tote Bag Standard',   quantity: 500,  spec: 'Cotton canvas / Natural / สกรีน 1 สี',     unit_cost: 85,  image_drive_id: null },
    { id: 'prod_11', project_id: 'proj_4', name: 'Tote Bag Large',      quantity: 200,  spec: 'Cotton canvas / Black / สกรีน 2 สี',       unit_cost: 95,  image_drive_id: null },
  ],

  steps: [
    // ── prod_1 เสื้อยืดโลโก้กลาง ──────────────────────────────────────────────
    { id: 'step_1',  product_id: 'prod_1', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-08T00:00:00.000Z', note: '' },
    { id: 'step_2',  product_id: 'prod_1', order: 2, step_name: 'ตัดเย็บ',    factory_id: 'fact_2', assignee_id: 'mem_2', status: 'delivered',    expected_days: 14, started_at: '2026-04-15T00:00:00.000Z', note: '' },
    { id: 'step_3',  product_id: 'prod_1', order: 3, step_name: 'สกรีน',      factory_id: 'fact_3', assignee_id: 'mem_3', status: 'in_progress',  expected_days: 2,  started_at: '2026-05-06T00:00:00.000Z', note: '' },
    // ── prod_2 หมวกแก๊ป ───────────────────────────────────────────────────────
    { id: 'step_4',  product_id: 'prod_2', order: 1, step_name: 'ส่งโรงงาน',  factory_id: 'fact_4', assignee_id: 'mem_2', status: 'in_progress',  expected_days: 1,  started_at: '2026-05-09T00:00:00.000Z', note: '' },
    { id: 'step_5',  product_id: 'prod_2', order: 2, step_name: 'ทำตัวอย่าง', factory_id: 'fact_4', assignee_id: 'mem_3', status: 'draft',        expected_days: 5,  started_at: null,                       note: '' },
    { id: 'step_6',  product_id: 'prod_2', order: 3, step_name: 'ปัก Logo',   factory_id: 'fact_4', assignee_id: 'mem_3', status: 'draft',        expected_days: 7,  started_at: null,                       note: '' },
    // ── prod_3 ถุงผ้า Canvas ──────────────────────────────────────────────────
    { id: 'step_7',  product_id: 'prod_3', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-10T00:00:00.000Z', note: '' },
    { id: 'step_8',  product_id: 'prod_3', order: 2, step_name: 'ตัดเย็บ',    factory_id: 'fact_5', assignee_id: 'mem_2', status: 'delivered',    expected_days: 10, started_at: '2026-04-17T00:00:00.000Z', note: '' },
    { id: 'step_9',  product_id: 'prod_3', order: 3, step_name: 'สกรีน',      factory_id: 'fact_3', assignee_id: 'mem_3', status: 'delivered',    expected_days: 4,  started_at: '2026-04-27T00:00:00.000Z', note: '' },
    { id: 'step_10', product_id: 'prod_3', order: 4, step_name: 'QC & Pack',  factory_id: 'fact_3', assignee_id: 'mem_1', status: 'in_progress',  expected_days: 3,  started_at: '2026-05-10T00:00:00.000Z', note: '' },
    // ── prod_4 Sticker pack (all delivered) ──────────────────────────────────
    { id: 'step_11', product_id: 'prod_4', order: 1, step_name: 'ออกแบบ',     factory_id: 'fact_6', assignee_id: 'mem_1', status: 'delivered',    expected_days: 5,  started_at: '2026-04-01T00:00:00.000Z', note: '' },
    { id: 'step_12', product_id: 'prod_4', order: 2, step_name: 'พิมพ์',       factory_id: 'fact_6', assignee_id: 'mem_2', status: 'delivered',    expected_days: 7,  started_at: '2026-04-06T00:00:00.000Z', note: '' },
    { id: 'step_13', product_id: 'prod_4', order: 3, step_name: 'Die-cut',    factory_id: 'fact_6', assignee_id: 'mem_2', status: 'delivered',    expected_days: 3,  started_at: '2026-04-13T00:00:00.000Z', note: '' },
    // ── prod_5 กางเกงขาสั้น (Capsule FW25) ───────────────────────────────────
    { id: 'step_14', product_id: 'prod_5', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-01T00:00:00.000Z', note: '' },
    { id: 'step_15', product_id: 'prod_5', order: 2, step_name: 'ตัดเย็บ',    factory_id: 'fact_2', assignee_id: 'mem_2', status: 'delivered',    expected_days: 14, started_at: '2026-04-08T00:00:00.000Z', note: '' },
    { id: 'step_16', product_id: 'prod_5', order: 3, step_name: 'ทำตัวอย่าง', factory_id: 'fact_2', assignee_id: 'mem_3', status: 'in_progress',  expected_days: 3,  started_at: '2026-05-06T00:00:00.000Z', note: '' },
    // ── prod_6 เสื้อ Oversize (Capsule FW25) ─────────────────────────────────
    { id: 'step_17', product_id: 'prod_6', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-05T00:00:00.000Z', note: '' },
    { id: 'step_18', product_id: 'prod_6', order: 2, step_name: 'ตัดเย็บ',    factory_id: 'fact_2', assignee_id: 'mem_2', status: 'in_progress',  expected_days: 14, started_at: '2026-04-30T00:00:00.000Z', note: '' },
    // ── prod_7 กระเป๋า Tote (Capsule FW25) ───────────────────────────────────
    { id: 'step_19', product_id: 'prod_7', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-10T00:00:00.000Z', note: '' },
    { id: 'step_20', product_id: 'prod_7', order: 2, step_name: 'ปักโลโก้',    factory_id: 'fact_4', assignee_id: 'mem_3', status: 'draft',        expected_days: 10, started_at: null,                       note: '' },
    // ── prod_8 เสื้อ Pop-up (Pop-up Bangkok) ─────────────────────────────────
    { id: 'step_21', product_id: 'prod_8', order: 1, step_name: 'สั่งผ้า',    factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-15T00:00:00.000Z', note: '' },
    { id: 'step_22', product_id: 'prod_8', order: 2, step_name: 'ตัดเย็บ',    factory_id: 'fact_2', assignee_id: 'mem_2', status: 'delivered',    expected_days: 14, started_at: '2026-04-22T00:00:00.000Z', note: '' },
    { id: 'step_23', product_id: 'prod_8', order: 3, step_name: 'สกรีน',      factory_id: 'fact_3', assignee_id: 'mem_3', status: 'delivered',    expected_days: 4,  started_at: '2026-05-06T00:00:00.000Z', note: '' },
    { id: 'step_24', product_id: 'prod_8', order: 4, step_name: 'ผลิตจริง',   factory_id: 'fact_2', assignee_id: 'mem_2', status: 'in_progress',  expected_days: 21, started_at: '2026-05-10T00:00:00.000Z', note: '' },
    // ── prod_9 สติ๊กเกอร์ (Pop-up Bangkok) ───────────────────────────────────
    { id: 'step_25', product_id: 'prod_9', order: 1, step_name: 'ออกแบบ',     factory_id: 'fact_6', assignee_id: 'mem_1', status: 'delivered',    expected_days: 5,  started_at: '2026-04-20T00:00:00.000Z', note: '' },
    { id: 'step_26', product_id: 'prod_9', order: 2, step_name: 'พิมพ์',       factory_id: 'fact_6', assignee_id: 'mem_2', status: 'in_progress',  expected_days: 7,  started_at: '2026-05-08T00:00:00.000Z', note: '' },
    // ── prod_10 Tote Bag Standard (Tote Bag Reorder) ─────────────────────────
    { id: 'step_27', product_id: 'prod_10', order: 1, step_name: 'สั่งผ้า',   factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-21T00:00:00.000Z', note: '' },
    { id: 'step_28', product_id: 'prod_10', order: 2, step_name: 'ตัดเย็บ',   factory_id: 'fact_5', assignee_id: 'mem_2', status: 'delivered',    expected_days: 10, started_at: '2026-04-28T00:00:00.000Z', note: '' },
    { id: 'step_29', product_id: 'prod_10', order: 3, step_name: 'สกรีน',     factory_id: 'fact_3', assignee_id: 'mem_3', status: 'in_progress',  expected_days: 3,  started_at: '2026-05-08T00:00:00.000Z', note: '' },
    // ── prod_11 Tote Bag Large (Tote Bag Reorder) ────────────────────────────
    { id: 'step_30', product_id: 'prod_11', order: 1, step_name: 'สั่งผ้า',   factory_id: 'fact_1', assignee_id: 'mem_1', status: 'delivered',    expected_days: 7,  started_at: '2026-04-21T00:00:00.000Z', note: '' },
    { id: 'step_31', product_id: 'prod_11', order: 2, step_name: 'ตัดเย็บ',   factory_id: 'fact_5', assignee_id: 'mem_2', status: 'delivered',    expected_days: 10, started_at: '2026-04-28T00:00:00.000Z', note: '' },
    { id: 'step_32', product_id: 'prod_11', order: 3, step_name: 'สกรีน',     factory_id: 'fact_3', assignee_id: 'mem_3', status: 'in_progress',  expected_days: 3,  started_at: '2026-05-08T00:00:00.000Z', note: '' },
  ],

  factories: [
    { id: 'fact_1', name: 'Fabric House BKK', categories: ['ผ้า', 'Fabric'],          contact_name: 'คุณวิชัย สุขสม',      contact_phone: '02-345-6789',  contact_line: '@fabrichouse',    address: 'บางรัก, กรุงเทพฯ',       payment_terms: '50% มัดจำ / 50% ก่อนส่งมอบ',   moq: 50,  price_tier: '฿฿',  rating: 4.8 },
    { id: 'fact_2', name: 'Threadline Co.',   categories: ['ตัดเย็บ'],                 contact_name: 'คุณสมชาย วงศ์ทอง',    contact_phone: '081-234-5678', contact_line: '@threadline',     address: 'บางบอน, กรุงเทพฯ',       payment_terms: '50% มัดจำ / 50% ก่อนส่งมอบ',   moq: 100, price_tier: '฿฿',  rating: 4.2 },
    { id: 'fact_3', name: 'Inkwell Studio',   categories: ['สกรีน', 'DTF'],            contact_name: 'คุณพิมพ์ใจ ดีใจ',     contact_phone: '089-123-4567', contact_line: '@inkwellbkk',     address: 'ลาดพร้าว, กรุงเทพฯ',     payment_terms: '100% ก่อนพิมพ์',               moq: 50,  price_tier: '฿',   rating: 3.4 },
    { id: 'fact_4', name: 'CapWorks',         categories: ['หมวก', 'Headwear'],        contact_name: 'คุณณรงค์ หมวกดี',     contact_phone: '086-987-6543', contact_line: '@capworks',       address: 'สมุทรปราการ',             payment_terms: '30% มัดจำ / 70% ก่อนส่งมอบ',   moq: 200, price_tier: '฿฿฿', rating: 4.0 },
    { id: 'fact_5', name: 'Canvas Workshop',  categories: ['ถุงผ้า', 'Canvas'],        contact_name: 'คุณมานี ถุงสวย',      contact_phone: '082-456-7890', contact_line: '@canvasworkshop', address: 'บึงกุ่ม, กรุงเทพฯ',      payment_terms: '50% มัดจำ / 50% หลังส่ง',      moq: 100, price_tier: '฿฿',  rating: 4.5 },
    { id: 'fact_6', name: 'Sticker Lab',      categories: ['สติ๊กเกอร์', 'Die-cut'],   contact_name: 'คุณภาวิณี สติ๊กเกอร์', contact_phone: '098-765-4321', contact_line: '@stickerlab',     address: 'รามคำแหง, กรุงเทพฯ',     payment_terms: '100% ล่วงหน้า',                moq: 100, price_tier: '฿',   rating: 4.9 },
  ],

  members: [
    { id: 'mem_1', name: 'ปรียา', initials: 'PR', color: '#60a5fa' },
    { id: 'mem_2', name: 'กฤต',   initials: 'KT', color: '#d4ff3a' },
    { id: 'mem_3', name: 'นิน',   initials: 'NN', color: '#c084fc' },
  ],
};
