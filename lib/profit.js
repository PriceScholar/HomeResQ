// Financial calculation engine for RESQHOME Office
// Handles decimal-safe arithmetic, VAT calculations, profit, and dashboard aggregations.

export const EXPENSE_CATEGORIES = [
  'Labour Cost',
  'Material Cost',
  'Fuel / Petrol',
  'Tools / Consumables',
  'Transportation',
  'Equipment Rental',
  'Subcontractor Payments',
  'Parking / Toll Charges',
  'Other Expense',
];

/**
 * Rounds a number to 2 decimal places to avoid float errors.
 */
export function round2(num) {
  const n = Number(num) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Format AED currency with 2 decimal places and thousands separators.
 */
export function formatAED(num) {
  const n = round2(num);
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse an invoice and return VAT-inclusive and VAT-exclusive revenue amounts.
 * Revenue excluding VAT is the base on which job profit is calculated.
 */
export function getInvoiceRevenue(doc) {
  if (!doc) return { total: 0, subtotal: 0, vat: 0, taxRate: 5 };
  
  // If items exist, subtotal is the sum of items
  let subtotal = 0;
  if (Array.isArray(doc.items) && doc.items.length > 0) {
    for (const item of doc.items) {
      subtotal += (Number(item.qty) || 0) * (Number(item.rate) || 0);
    }
    subtotal = round2(subtotal);
  } else if (doc.subtotal) {
    subtotal = round2(doc.subtotal);
  }

  const taxRate = Number(doc.tax_rate ?? 5);
  const vat = round2(subtotal * (taxRate / 100));
  const total = round2(doc.total ? Number(doc.total) : subtotal + vat);

  // If subtotal wasn't derived from items, derive vat-exclusive from total
  const revenueExclVat = subtotal > 0 ? subtotal : round2(total / (1 + taxRate / 100));

  return {
    total,
    subtotal: revenueExclVat,
    vat: round2(total - revenueExclVat),
    taxRate,
  };
}

/**
 * Calculate total expenses for an invoice.
 */
export function getTotalExpenses(expensesList, invoiceId) {
  if (!Array.isArray(expensesList)) return 0;
  const filtered = invoiceId ? expensesList.filter(e => e.invoice_id === invoiceId) : expensesList;
  const sum = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  return round2(sum);
}

/**
 * Calculate total payments received for an invoice.
 */
export function getTotalPayments(paymentsList, invoiceId) {
  if (!Array.isArray(paymentsList)) return 0;
  const filtered = invoiceId ? paymentsList.filter(p => p.invoice_id === invoiceId) : paymentsList;
  const sum = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  return round2(sum);
}

/**
 * Calculate invoice profit summary metrics.
 * Net Job Profit = Revenue Excluding VAT - Total Expenses
 * Profit Margin = (Net Job Profit / Revenue Excluding VAT) * 100
 */
export function calculateInvoiceProfit(doc, expensesList = [], paymentsList = []) {
  const rev = getInvoiceRevenue(doc);
  const totalExpenses = getTotalExpenses(expensesList, doc?.id);
  const totalPayments = getTotalPayments(paymentsList, doc?.id);

  // Operating/Job profit based on revenue excluding VAT
  const netProfit = round2(rev.subtotal - totalExpenses);
  const profitMargin = rev.subtotal > 0 ? round2((netProfit / rev.subtotal) * 100) : 0;
  const outstandingBalance = round2(Math.max(0, rev.total - totalPayments));

  return {
    invoiceTotal: rev.total,
    revenueExclVat: rev.subtotal,
    vatAmount: rev.vat,
    totalExpenses,
    netProfit,
    profitMargin,
    paymentReceived: totalPayments,
    outstandingBalance,
    isProfitable: netProfit > 0,
    isLoss: netProfit < 0,
  };
}

/**
 * Aggregate company-wide metrics across confirmed, non-cancelled invoices.
 */
export function calculateCompanyMetrics(documents = [], expenses = [], payments = [], periodFilter = 'all') {
  // Only invoices that are not cancelled
  const invoices = documents.filter(d => d.type === 'invoice' && d.status !== 'cancelled');

  // Filter invoices by period if needed (e.g. '2026-01' or year '2026')
  const filteredInvoices = invoices.filter(doc => {
    if (periodFilter === 'all') return true;
    const dateStr = String(doc.issue_date || doc.created_at || '');
    if (periodFilter.length === 7) {
      // YYYY-MM
      return dateStr.startsWith(periodFilter);
    }
    if (periodFilter.length === 4) {
      // YYYY
      return dateStr.startsWith(periodFilter);
    }
    return true;
  });

  const invoiceIds = new Set(filteredInvoices.map(d => d.id));

  // Expenses linked to the filtered invoices
  const filteredExpenses = expenses.filter(e => invoiceIds.has(e.invoice_id));
  const filteredPayments = payments.filter(p => invoiceIds.has(p.invoice_id));

  let totalRevenueExclVat = 0;
  let totalInvoiceTotal = 0;
  let totalPaymentsReceived = 0;

  const invoiceSummaries = filteredInvoices.map(doc => {
    const profit = calculateInvoiceProfit(doc, filteredExpenses, filteredPayments);
    totalRevenueExclVat += profit.revenueExclVat;
    totalInvoiceTotal += profit.invoiceTotal;
    totalPaymentsReceived += profit.paymentReceived;
    return {
      doc,
      ...profit,
    };
  });

  totalRevenueExclVat = round2(totalRevenueExclVat);
  totalInvoiceTotal = round2(totalInvoiceTotal);
  totalPaymentsReceived = round2(totalPaymentsReceived);

  const totalExpenses = round2(filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0));
  const netProfit = round2(totalRevenueExclVat - totalExpenses);
  const profitMargin = totalRevenueExclVat > 0 ? round2((netProfit / totalRevenueExclVat) * 100) : 0;
  const outstandingBalance = round2(Math.max(0, totalInvoiceTotal - totalPaymentsReceived));

  // Category breakdown
  const categoryMap = {};
  for (const exp of filteredExpenses) {
    const cat = exp.category || 'Other Expense';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(exp.amount) || 0);
  }
  const categoryList = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      percentage: totalExpenses > 0 ? round2((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly breakdown for bar chart (last 6 months or all months in scope)
  const monthMap = {};
  for (const doc of filteredInvoices) {
    const m = (doc.issue_date || '').slice(0, 7); // YYYY-MM
    if (!m || m.length < 7) continue;
    if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
    const rev = getInvoiceRevenue(doc);
    monthMap[m].revenue += rev.subtotal;
  }
  for (const exp of filteredExpenses) {
    // Allocate expense to linked invoice month
    const doc = filteredInvoices.find(d => d.id === exp.invoice_id);
    const m = (doc?.issue_date || exp.date || '').slice(0, 7);
    if (!m || m.length < 7) continue;
    if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
    monthMap[m].expenses += Number(exp.amount) || 0;
  }

  const monthlyList = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      revenue: round2(data.revenue),
      expenses: round2(data.expenses),
      profit: round2(data.revenue - data.expenses),
    }));

  return {
    totalRevenue: totalRevenueExclVat,
    totalInvoiceTotal,
    totalExpenses,
    netProfit,
    profitMargin,
    totalPaymentsReceived,
    outstandingBalance,
    invoiceCount: filteredInvoices.length,
    expenseCount: filteredExpenses.length,
    invoiceSummaries,
    categories: categoryList,
    monthly: monthlyList,
  };
}
