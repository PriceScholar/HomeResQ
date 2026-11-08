// In-memory Map store stub for Vercel Blob
// Preserves state in memory across reloads and runs completely self-contained in AI Studio.

const ROOT = 'resqhome-office/v1/';

if (!globalThis.__RESQHOME_STORAGE__) {
  const store = new Map();

  // Initial seed data
  const seedCompany = {
    legal_name: 'HOME RESCUE TECHNICAL SERVICES LLC',
    license_number: '1191464',
    phone: '+971 52 452 4295',
    email: 'info@homerescue.ae',
    website: 'www.resqhome.ae',
    location: 'Al Nahda 1, Dubai, UAE',
    tax_rate: 5,
    advance_percent: 80,
    quotation_valid_days: 30,
    tax_registration_number: '104570745000003',
    bank_payable_to: 'HOME RESCUE TECHNICAL SERVICES LLC',
    bank_name: 'RAK BANK',
    bank_branch: 'AL QUOZ, DUBAI',
    bank_account_number: '0553196914001',
    bank_iban: 'AE110400000553196914001',
    bank_swift_code: 'NRAKAEAK',
  };

  const seedClient1 = {
    id: 'e4b2d184-7a1a-4c2c-9a4f-5f820c81d001',
    name: 'Al Fardan Properties LLC',
    email: 'facilities@alfardan.ae',
    phone: '+971 50 452 8899',
    address: 'Office 402, Al Fardan Tower, Al Barsha 1, Dubai, UAE',
    created_at: '2026-11-01T08:00:00.000Z',
    updated_at: '2026-11-01T08:00:00.000Z',
  };

  const seedClient2 = {
    id: 'e4b2d184-7a1a-4c2c-9a4f-5f820c81d002',
    name: 'Emaar Resident - Villa 42',
    email: 'tariq.almansoori@gmail.com',
    phone: '+971 52 884 1234',
    address: 'Villa 42, Street 8, Meadows 2, Dubai, UAE',
    created_at: '2026-11-03T10:30:00.000Z',
    updated_at: '2026-11-03T10:30:00.000Z',
  };

  const seedDoc1 = {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c51',
    number: 'RQ-QT-2026-510',
    type: 'quotation',
    status: 'accepted',
    issue_date: '2026-11-02',
    valid_until: '2026-12-02',
    client_name: 'Al Fardan Properties LLC',
    client_phone: '+971 50 452 8899',
    client_email: 'facilities@alfardan.ae',
    client_address: 'Office 402, Al Fardan Tower, Al Barsha 1, Dubai, UAE',
    project_title: 'AC Preventive Maintenance & Duct Sanitization',
    project_location: 'Al Barsha 1, Dubai, UAE',
    completion: '5 working days upon LPO',
    tax_rate: 5,
    advance_percent: 80,
    items: [
      {
        title: 'AC Maintenance & Comprehensive Inspection',
        description: 'Preventive inspection, deep coil & filter cleaning, pressure and operational checks across 8 split units.',
        qty: 8,
        rate: 250,
      },
      {
        title: 'Kitchen Sink Leak Rectification',
        description: 'Commercial pantry sink pipe repair, high-grade sealant, connection tests.',
        qty: 2,
        rate: 350,
      },
      {
        title: 'LED Light Fixture Installation',
        description: 'Safe replacement of 20 recessed LED panels with safety isolation checks.',
        qty: 20,
        rate: 75,
      },
    ],
    total: '4410.00',
    origin_id: null,
    created_at: '2026-11-02T09:15:00.000Z',
    updated_at: '2026-11-02T09:15:00.000Z',
  };

  const seedDoc2 = {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c52',
    number: 'RQ-INV-2026-510',
    type: 'invoice',
    status: 'paid',
    issue_date: '2026-11-05',
    client_name: 'Emaar Resident - Villa 42',
    client_phone: '+971 52 884 1234',
    client_email: 'tariq.almansoori@gmail.com',
    client_address: 'Villa 42, Street 8, Meadows 2, Dubai, UAE',
    project_title: 'Interior Wall Painting & Light Fixture Upgrade',
    project_location: 'Meadows 2, Dubai, UAE',
    completion: 'Completed',
    tax_rate: 5,
    advance_percent: 80,
    bank_payable_to: 'HOME RESCUE TECHNICAL SERVICES LLC',
    bank_name: 'RAK BANK',
    bank_branch: 'AL QUOZ, DUBAI',
    bank_account_number: '0553196914001',
    bank_iban: 'AE110400000553196914001',
    bank_swift_code: 'NRAKAEAK',
    items: [
      {
        title: 'Interior Wall Painting',
        description: 'Surface preparation, crack filling, primer coat and two coats of premium washable emulsion.',
        qty: 3,
        rate: 600,
      },
      {
        title: 'Electrical Services & Fixture Mounting',
        description: 'Wiring check and safe installation of decorative pendant fixtures.',
        qty: 6,
        rate: 75,
      },
    ],
    total: '2362.50',
    origin_id: null,
    created_at: '2026-11-05T14:20:00.000Z',
    updated_at: '2026-11-05T14:20:00.000Z',
  };

  store.set(`${ROOT}settings/company.json`, JSON.stringify(seedCompany));
  store.set(`${ROOT}clients/${seedClient1.id}.json`, JSON.stringify(seedClient1));
  store.set(`${ROOT}clients/${seedClient2.id}.json`, JSON.stringify(seedClient2));
  store.set(`${ROOT}documents/${seedDoc1.id}.json`, JSON.stringify(seedDoc1));
  store.set(`${ROOT}documents/${seedDoc2.id}.json`, JSON.stringify(seedDoc2));
  store.set(`${ROOT}issued-numbers/quotation/2026/510.json`, JSON.stringify({ number: 'RQ-QT-2026-510', issued_at: '2026-11-02T09:15:00.000Z' }));
  store.set(`${ROOT}issued-numbers/invoice/2026/510.json`, JSON.stringify({ number: 'RQ-INV-2026-510', issued_at: '2026-11-05T14:20:00.000Z' }));

  globalThis.__RESQHOME_STORAGE__ = store;
}

const storage = globalThis.__RESQHOME_STORAGE__;

export async function get(pathname) {
  if (!storage.has(pathname)) {
    return { statusCode: 404 };
  }
  const data = storage.get(pathname);
  return {
    statusCode: 200,
    stream: new Response(data).body,
  };
}

export async function put(pathname, body, options = {}) {
  if (options.allowOverwrite === false && storage.has(pathname)) {
    const err = new Error(`BlobAlreadyExists: The blob "${pathname}" already exists.`);
    err.name = 'BlobAlreadyExists';
    throw err;
  }
  const payload = typeof body === 'string' ? body : String(body);
  storage.set(pathname, payload);
  return {
    pathname,
    url: `blob://${pathname}`,
  };
}

export async function del(pathname) {
  storage.delete(pathname);
}

export async function list(options = {}) {
  const prefix = options.prefix || '';
  const matching = [];
  for (const key of storage.keys()) {
    if (key.startsWith(prefix)) {
      matching.push({ pathname: key });
    }
  }
  return {
    blobs: matching,
    hasMore: false,
    cursor: undefined,
  };
}
