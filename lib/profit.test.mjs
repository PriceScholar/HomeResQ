import test from 'node:test';
import assert from 'node:assert/strict';
import {
  round2,
  formatAED,
  getInvoiceRevenue,
  getTotalExpenses,
  getTotalPayments,
  calculateInvoiceProfit,
  calculateCompanyMetrics,
} from './profit.js';

test('round2 rounds accurately avoiding floating point imprecision', () => {
  assert.equal(round2(11961.590000000001), 11961.59);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(formatAED(11961.59), '11,961.59');
});

test('getInvoiceRevenue calculates VAT-exclusive subtotal and VAT correctly', () => {
  const doc = {
    tax_rate: 5,
    items: [
      { qty: 2, rate: 250 }, // 500
      { qty: 1, rate: 500 }, // 500
    ],
  };
  const rev = getInvoiceRevenue(doc);
  assert.equal(rev.subtotal, 1000);
  assert.equal(rev.vat, 50);
  assert.equal(rev.total, 1050);
});

test('calculateInvoiceProfit calculates net job profit based on VAT-exclusive revenue', () => {
  const doc = {
    id: 'inv-1',
    tax_rate: 5,
    items: [{ qty: 1, rate: 10000 }],
  };
  const expenses = [
    { invoice_id: 'inv-1', amount: 2000, category: 'Labour Cost' },
    { invoice_id: 'inv-1', amount: 1500, category: 'Material Cost' },
    { invoice_id: 'inv-1', amount: 300, category: 'Fuel / Petrol' },
    { invoice_id: 'inv-1', amount: 200, category: 'Tools / Consumables' },
    { invoice_id: 'inv-1', amount: 100, category: 'Other Expense' },
  ];
  const payments = [
    { invoice_id: 'inv-1', amount: 8000 },
  ];

  const profit = calculateInvoiceProfit(doc, expenses, payments);
  // Revenue excl VAT = 10,000
  // Total expenses = 4,100
  // Net profit = 10,000 - 4,100 = 5,900
  // Profit margin = 5,900 / 10,000 = 59%
  // Invoice total with 5% VAT = 10,500
  // Outstanding balance = 10,500 - 8,000 = 2,500
  assert.equal(profit.revenueExclVat, 10000);
  assert.equal(profit.totalExpenses, 4100);
  assert.equal(profit.netProfit, 5900);
  assert.equal(profit.profitMargin, 59);
  assert.equal(profit.invoiceTotal, 10500);
  assert.equal(profit.paymentReceived, 8000);
  assert.equal(profit.outstandingBalance, 2500);
  assert.equal(profit.isProfitable, true);
  assert.equal(profit.isLoss, false);
});

test('calculateInvoiceProfit handles losses when expenses exceed revenue', () => {
  const doc = {
    id: 'inv-2',
    tax_rate: 5,
    items: [{ qty: 1, rate: 1000 }],
  };
  const expenses = [
    { invoice_id: 'inv-2', amount: 1500, category: 'Material Cost' },
  ];
  const profit = calculateInvoiceProfit(doc, expenses, []);
  assert.equal(profit.netProfit, -500);
  assert.equal(profit.profitMargin, -50);
  assert.equal(profit.isProfitable, false);
  assert.equal(profit.isLoss, true);
});

test('calculateCompanyMetrics aggregates invoices and category distributions', () => {
  const docs = [
    {
      id: 'inv-1',
      type: 'invoice',
      status: 'paid',
      issue_date: '2026-01-15',
      tax_rate: 5,
      items: [{ qty: 1, rate: 10000 }],
    },
    {
      id: 'inv-2',
      type: 'invoice',
      status: 'sent',
      issue_date: '2026-01-20',
      tax_rate: 5,
      items: [{ qty: 1, rate: 5000 }],
    },
    {
      id: 'qt-1',
      type: 'quotation', // Quotations must NOT be included in company revenue
      status: 'accepted',
      issue_date: '2026-01-10',
      tax_rate: 5,
      items: [{ qty: 1, rate: 20000 }],
    },
  ];

  const expenses = [
    { invoice_id: 'inv-1', amount: 4000, category: 'Labour Cost', date: '2026-01-16' },
    { invoice_id: 'inv-2', amount: 2000, category: 'Material Cost', date: '2026-01-21' },
  ];

  const payments = [
    { invoice_id: 'inv-1', amount: 10500 },
  ];

  const metrics = calculateCompanyMetrics(docs, expenses, payments, 'all');
  assert.equal(metrics.totalRevenue, 15000); // 10000 + 5000
  assert.equal(metrics.totalExpenses, 6000);  // 4000 + 2000
  assert.equal(metrics.netProfit, 9000);      // 15000 - 6000
  assert.equal(metrics.profitMargin, 60);     // (9000 / 15000) * 100
  assert.equal(metrics.totalPaymentsReceived, 10500);
  assert.equal(metrics.invoiceCount, 2);
  assert.equal(metrics.categories.length, 2);
  assert.equal(metrics.categories[0].category, 'Labour Cost');
  assert.equal(metrics.categories[0].amount, 4000);
});
