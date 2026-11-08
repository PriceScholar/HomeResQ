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

  const seedClient3 = {
    id: 'e4b2d184-7a1a-4c2c-9a4f-5f820c81d003',
    name: 'Dubai Properties LLC',
    email: 'accounts@dubaiproperties.ae',
    phone: '+971 4 435 1100',
    address: 'Vision Tower, Business Bay, Dubai, UAE',
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-01-10T08:00:00.000Z',
  };

  const seedClient4 = {
    id: 'e4b2d184-7a1a-4c2c-9a4f-5f820c81d004',
    name: 'Al Noor Villa',
    email: 'info@alnoorvilla.ae',
    phone: '+971 50 123 4567',
    address: 'Villa 14, Al Safa 2, Dubai, UAE',
    created_at: '2026-01-12T08:00:00.000Z',
    updated_at: '2026-01-12T08:00:00.000Z',
  };

  const seedClient5 = {
    id: 'e4b2d184-7a1a-4c2c-9a4f-5f820c81d005',
    name: 'Emirates Facilities Co.',
    email: 'procurement@emiratesfacilities.ae',
    phone: '+971 4 882 9900',
    address: 'JAFZA One, Jebel Ali Free Zone, Dubai, UAE',
    created_at: '2026-01-14T08:00:00.000Z',
    updated_at: '2026-01-14T08:00:00.000Z',
  };

  const seedDoc3 = {
    id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d11',
    number: 'RQ-INV-2026-511',
    type: 'invoice',
    status: 'paid',
    job_status: 'confirmed',
    confirmed_at: '2026-01-12T10:00:00.000Z',
    issue_date: '2026-01-12',
    due_date: '2026-01-26',
    client_name: 'Dubai Properties LLC',
    client_phone: '+971 4 435 1100',
    client_email: 'accounts@dubaiproperties.ae',
    client_address: 'Vision Tower, Business Bay, Dubai, UAE',
    project_title: 'Home Maintenance (AC, Plumbing & General Repairs)',
    project_location: 'Business Bay, Dubai, UAE',
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
        title: 'AC Maintenance & Comprehensive Inspection',
        description: 'Complete filter sanitization, coil wash, refrigerant pressure testing and duct checks across 8 units.',
        qty: 8,
        rate: 450,
      },
      {
        title: 'Plumbing & Drain Leak Rectification',
        description: 'Inspection and replacement of heavy duty copper/PPR fittings and seal integrity test.',
        qty: 4,
        rate: 600,
      },
      {
        title: 'Interior Wall Painting & Touch-up',
        description: 'Wall preparation, minor filling, and application of two finishing coats.',
        qty: 5,
        rate: 800,
      },
      {
        title: 'Electrical Diagnostics & LED Installation',
        description: 'Distribution panel inspection and installation of recessed LED fittings.',
        qty: 18,
        rate: 77.33,
      },
    ],
    total: '11961.59',
    origin_id: null,
    created_at: '2026-01-12T09:00:00.000Z',
    updated_at: '2026-01-12T09:00:00.000Z',
  };

  const seedDoc4 = {
    id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d12',
    number: 'RQ-INV-2026-512',
    type: 'invoice',
    status: 'paid',
    job_status: 'confirmed',
    confirmed_at: '2026-01-13T10:00:00.000Z',
    issue_date: '2026-01-13',
    due_date: '2026-01-27',
    client_name: 'Al Noor Villa',
    client_phone: '+971 50 123 4567',
    client_email: 'info@alnoorvilla.ae',
    client_address: 'Villa 14, Al Safa 2, Dubai, UAE',
    project_title: 'Villa AC & Plumbing Overhaul',
    project_location: 'Al Safa 2, Dubai, UAE',
    completion: 'Completed',
    tax_rate: 5,
    advance_percent: 80,
    items: [
      {
        title: 'AC Split Unit Servicing & Coil Deep Clean',
        description: 'Preventive chemical wash and pressure balancing.',
        qty: 6,
        rate: 400,
      },
      {
        title: 'Water Heater & Plumbing Replacement',
        description: 'Supply and installation of Ariston 80L heater and brass isolation valves.',
        qty: 2,
        rate: 2966.67,
      },
    ],
    total: '8750.00',
    origin_id: null,
    created_at: '2026-01-13T10:00:00.000Z',
    updated_at: '2026-01-13T10:00:00.000Z',
  };

  const seedDoc5 = {
    id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d13',
    number: 'RQ-INV-2026-513',
    type: 'invoice',
    status: 'sent',
    job_status: 'confirmed',
    confirmed_at: '2026-01-14T10:00:00.000Z',
    issue_date: '2026-01-14',
    due_date: '2026-01-28',
    client_name: 'Emirates Facilities Co.',
    client_phone: '+971 4 882 9900',
    client_email: 'procurement@emiratesfacilities.ae',
    client_address: 'JAFZA One, Jebel Ali Free Zone, Dubai, UAE',
    project_title: 'Commercial HVAC & Duct Service',
    project_location: 'JAFZA One, Dubai, UAE',
    completion: 'Completed',
    tax_rate: 5,
    advance_percent: 80,
    items: [
      {
        title: 'Commercial Package AC Overhaul',
        description: 'Compressor overhaul and duct inspection.',
        qty: 3,
        rate: 4895.24,
      },
    ],
    total: '15420.00',
    origin_id: null,
    created_at: '2026-01-14T11:00:00.000Z',
    updated_at: '2026-01-14T11:00:00.000Z',
  };

  // Seed expenses for RQ-INV-2026-511 matching reference screenshot exactly
  const seedExpenses511 = [
    {
      id: 'e1001-511-labour',
      invoice_id: seedDoc3.id,
      invoice_number: 'RQ-INV-2026-511',
      date: '2026-01-12',
      category: 'Labour Cost',
      description: 'Technician team (2 days)',
      amount: 2800.00,
      created_at: '2026-01-12T11:00:00.000Z',
      updated_at: '2026-01-12T11:00:00.000Z',
    },
    {
      id: 'e1002-511-material',
      invoice_id: seedDoc3.id,
      invoice_number: 'RQ-INV-2026-511',
      date: '2026-01-13',
      category: 'Material Cost',
      description: 'AC parts, fittings & supplies',
      amount: 3250.00,
      created_at: '2026-01-13T09:30:00.000Z',
      updated_at: '2026-01-13T09:30:00.000Z',
    },
    {
      id: 'e1003-511-fuel',
      invoice_id: seedDoc3.id,
      invoice_number: 'RQ-INV-2026-511',
      date: '2026-01-13',
      category: 'Fuel / Petrol',
      description: 'Site visits & material delivery',
      amount: 280.00,
      created_at: '2026-01-13T16:00:00.000Z',
      updated_at: '2026-01-13T16:00:00.000Z',
    },
    {
      id: 'e1004-511-tools',
      invoice_id: seedDoc3.id,
      invoice_number: 'RQ-INV-2026-511',
      date: '2026-01-14',
      category: 'Tools / Consumables',
      description: 'Drill bits, sealant, screws, etc.',
      amount: 140.00,
      created_at: '2026-01-14T08:45:00.000Z',
      updated_at: '2026-01-14T08:45:00.000Z',
    },
    {
      id: 'e1005-511-other',
      invoice_id: seedDoc3.id,
      invoice_number: 'RQ-INV-2026-511',
      date: '2026-01-14',
      category: 'Other Expense',
      description: 'Parking, site access & misc.',
      amount: 90.00,
      created_at: '2026-01-14T17:15:00.000Z',
      updated_at: '2026-01-14T17:15:00.000Z',
    },
  ];

  // Seed expenses for RQ-INV-2026-512 (Total: 4,980.00)
  const seedExpenses512 = [
    {
      id: 'e1006-512-labour',
      invoice_id: seedDoc4.id,
      invoice_number: 'RQ-INV-2026-512',
      date: '2026-01-13',
      category: 'Labour Cost',
      description: 'Plumber & assistant team',
      amount: 2500.00,
      created_at: '2026-01-13T11:00:00.000Z',
      updated_at: '2026-01-13T11:00:00.000Z',
    },
    {
      id: 'e1007-512-material',
      invoice_id: seedDoc4.id,
      invoice_number: 'RQ-INV-2026-512',
      date: '2026-01-14',
      category: 'Material Cost',
      description: 'Pipes, valves and copper fittings',
      amount: 2100.00,
      created_at: '2026-01-14T10:00:00.000Z',
      updated_at: '2026-01-14T10:00:00.000Z',
    },
    {
      id: 'e1008-512-fuel',
      invoice_id: seedDoc4.id,
      invoice_number: 'RQ-INV-2026-512',
      date: '2026-01-14',
      category: 'Fuel / Petrol',
      description: 'Site visits',
      amount: 200.00,
      created_at: '2026-01-14T15:00:00.000Z',
      updated_at: '2026-01-14T15:00:00.000Z',
    },
    {
      id: 'e1009-512-other',
      invoice_id: seedDoc4.id,
      invoice_number: 'RQ-INV-2026-512',
      date: '2026-01-15',
      category: 'Other Expense',
      description: 'Site gate pass and misc.',
      amount: 180.00,
      created_at: '2026-01-15T16:00:00.000Z',
      updated_at: '2026-01-15T16:00:00.000Z',
    },
  ];

  // Seed expenses for RQ-INV-2026-513 (Total: 6,640.00)
  const seedExpenses513 = [
    {
      id: 'e1010-513-labour',
      invoice_id: seedDoc5.id,
      invoice_number: 'RQ-INV-2026-513',
      date: '2026-01-14',
      category: 'Labour Cost',
      description: 'HVAC senior technician & electricians',
      amount: 3400.00,
      created_at: '2026-01-14T12:00:00.000Z',
      updated_at: '2026-01-14T12:00:00.000Z',
    },
    {
      id: 'e1011-513-material',
      invoice_id: seedDoc5.id,
      invoice_number: 'RQ-INV-2026-513',
      date: '2026-01-15',
      category: 'Material Cost',
      description: 'Air filters, contactors, capacitors',
      amount: 2800.00,
      created_at: '2026-01-15T10:00:00.000Z',
      updated_at: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 'e1012-513-fuel',
      invoice_id: seedDoc5.id,
      invoice_number: 'RQ-INV-2026-513',
      date: '2026-01-15',
      category: 'Fuel / Petrol',
      description: 'Fleet transport to JAFZA',
      amount: 280.00,
      created_at: '2026-01-15T15:00:00.000Z',
      updated_at: '2026-01-15T15:00:00.000Z',
    },
    {
      id: 'e1013-513-tools',
      invoice_id: seedDoc5.id,
      invoice_number: 'RQ-INV-2026-513',
      date: '2026-01-16',
      category: 'Tools / Consumables',
      description: 'Manifold gauges & vacuum pump consumables',
      amount: 160.00,
      created_at: '2026-01-16T11:00:00.000Z',
      updated_at: '2026-01-16T11:00:00.000Z',
    },
  ];

  // Seed payment for RQ-INV-2026-511
  const seedPayment511 = {
    id: 'p1001-511-pay',
    invoice_id: seedDoc3.id,
    invoice_number: 'RQ-INV-2026-511',
    date: '2026-01-15',
    amount: 11961.59,
    method: 'Bank Transfer',
    reference: 'RAK-TRF-99214',
    created_at: '2026-01-15T12:00:00.000Z',
    updated_at: '2026-01-15T12:00:00.000Z',
  };

  const seedPayment512 = {
    id: 'p1002-512-pay',
    invoice_id: seedDoc4.id,
    invoice_number: 'RQ-INV-2026-512',
    date: '2026-01-16',
    amount: 8750.00,
    method: 'Card',
    reference: 'CARD-AUTH-8711',
    created_at: '2026-01-16T14:00:00.000Z',
    updated_at: '2026-01-16T14:00:00.000Z',
  };

  store.set(`${ROOT}settings/company.json`, JSON.stringify(seedCompany));
  store.set(`${ROOT}clients/${seedClient1.id}.json`, JSON.stringify(seedClient1));
  store.set(`${ROOT}clients/${seedClient2.id}.json`, JSON.stringify(seedClient2));
  store.set(`${ROOT}clients/${seedClient3.id}.json`, JSON.stringify(seedClient3));
  store.set(`${ROOT}clients/${seedClient4.id}.json`, JSON.stringify(seedClient4));
  store.set(`${ROOT}clients/${seedClient5.id}.json`, JSON.stringify(seedClient5));
  store.set(`${ROOT}documents/${seedDoc1.id}.json`, JSON.stringify(seedDoc1));
  store.set(`${ROOT}documents/${seedDoc2.id}.json`, JSON.stringify(seedDoc2));
  store.set(`${ROOT}documents/${seedDoc3.id}.json`, JSON.stringify(seedDoc3));
  store.set(`${ROOT}documents/${seedDoc4.id}.json`, JSON.stringify(seedDoc4));
  store.set(`${ROOT}documents/${seedDoc5.id}.json`, JSON.stringify(seedDoc5));

  for (const exp of [...seedExpenses511, ...seedExpenses512, ...seedExpenses513]) {
    store.set(`${ROOT}expenses/${exp.id}.json`, JSON.stringify(exp));
  }
  store.set(`${ROOT}payments/${seedPayment511.id}.json`, JSON.stringify(seedPayment511));
  store.set(`${ROOT}payments/${seedPayment512.id}.json`, JSON.stringify(seedPayment512));

  store.set(`${ROOT}issued-numbers/quotation/2026/510.json`, JSON.stringify({ number: 'RQ-QT-2026-510', issued_at: '2026-11-02T09:15:00.000Z' }));
  store.set(`${ROOT}issued-numbers/invoice/2026/510.json`, JSON.stringify({ number: 'RQ-INV-2026-510', issued_at: '2026-11-05T14:20:00.000Z' }));
  store.set(`${ROOT}issued-numbers/invoice/2026/511.json`, JSON.stringify({ number: 'RQ-INV-2026-511', issued_at: '2026-01-12T09:00:00.000Z' }));
  store.set(`${ROOT}issued-numbers/invoice/2026/512.json`, JSON.stringify({ number: 'RQ-INV-2026-512', issued_at: '2026-01-13T10:00:00.000Z' }));
  store.set(`${ROOT}issued-numbers/invoice/2026/513.json`, JSON.stringify({ number: 'RQ-INV-2026-513', issued_at: '2026-01-14T11:00:00.000Z' }));

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
