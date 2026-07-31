// One-time backfill: computes an explicit MoneyType for every existing
// transaction, using the exact same classification rules the old app.js
// used to *guess* a bucket at render time (isTicketCostRow, moneyBucket,
// etc., from the v3.0-and-earlier app). Run once against the historical
// ledger so future code can read t.MoneyType directly instead of
// re-guessing from free text on every render.
//
// Usage: node scripts/backfill-money-type.mjs
// Reads:  data/public-ledger.json
// Writes: data/public-ledger.json (adds MoneyType, bumps meta.format to V3)
//         scripts/output/money-type-column.txt (paste-ready for the live
//         OneDrive Transactions table)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const ledgerPath = path.join(repoRoot, 'data', 'public-ledger.json');
const outDir = path.join(repoRoot, 'scripts', 'output');

// ---- ported verbatim (logic only) from the pre-rebuild app.js ----
function rowTotal(t) { return Number(t.TotalAmount || 0); }
function isParkingRow(t) {
  return String(t.AssetType || '').toLowerCase().includes('parking') || /parking/.test(rowText(t));
}
function isTicketRow(t) {
  return String(t.AssetType || '').toLowerCase().includes('ticket') && !isParkingRow(t);
}
function rowText(t) {
  return [t.AssetType, t.Category, t.TransactionType, t.Description, t.Game].join(' ').toLowerCase();
}
function categoryText(t) { return String(t.Category || '').toLowerCase(); }
function typeText(t) { return String(t.TransactionType || '').toLowerCase(); }
function isSaleOrResaleText(text) { return /(^|\s)sale($|\s)|resale/.test(text); }
function isSharedOpportunityRow(t) {
  const alloc = String(t.AllocationType || '').toLowerCase();
  return alloc.includes('dennis joel kyle split') || alloc.includes('shared opportunity');
}
function isMemberFundingRow(t) {
  const total = rowTotal(t);
  if (total <= 0) return false;
  const text = rowText(t);
  return /opening balance|prior year transfer|top.?off|donation|credit|member payment|manual top/.test(text);
}
function isTrueTicketSaleRow(t) {
  const cat = categoryText(t);
  const typ = typeText(t);
  if (!isTicketRow(t)) return false;
  if (isMemberFundingRow(t)) return false;
  if (/parking|travel|airfare|fee|tax|opening|top.?off|donation|credit|adjust|transfer|member payment/.test(cat + ' ' + typ)) return false;
  if (/resale|(^|\s)sale($|\s)/.test(cat)) return true;
  if (/purchase/.test(cat) && !/resale|(^|\s)sale($|\s)/.test(cat)) return false;
  return /ticket sale|resale/.test(typ) && !/purchase/.test(cat);
}
function isParkingMoneyRow(t) {
  if (!isParkingRow(t)) return false;
  const cat = categoryText(t);
  const typ = typeText(t);
  const text = rowText(t);
  if (isMemberFundingRow(t)) return false;
  if (/resale|(^|\s)sale($|\s)/.test(cat) && /parking/.test(text)) return true;
  if (/purchase|cost|fee|tax|travel|expense|reimbursement|payment/.test(cat + ' ' + typ)) return false;
  return /parking/.test(text) && isSaleOrResaleText(cat + ' ' + typ + ' ' + text);
}
function isTicketCostRow(t) {
  if (!isTicketRow(t)) return false;
  if (isMemberFundingRow(t)) return false;
  const cat = categoryText(t);
  const typ = typeText(t);
  const text = rowText(t);
  if (/parking|travel|airfare/.test(text)) return false;
  if (/resale/.test(cat) || (/(^|\s)sale($|\s)/.test(cat) && !/purchase/.test(cat))) return false;
  return /purchase|future season ticket|postseason purchase|other game purchase|season purchase|upgrade|fees?\/taxes?|fee|tax/.test(cat + ' ' + typ + ' ' + text);
}
function isParkingCostRow(t) {
  if (!isParkingRow(t)) return false;
  if (isMemberFundingRow(t)) return false;
  const cat = categoryText(t);
  const typ = typeText(t);
  const text = rowText(t);
  if (/resale/.test(cat) || (/(^|\s)sale($|\s)/.test(cat) && !/purchase/.test(cat))) return false;
  return /future parking|postseason parking|parking purchase|season purchase|parking|pass|purchase|cost|fee/.test(cat + ' ' + typ + ' ' + text);
}
function isOtherCostRow(t) {
  if (isTicketCostRow(t) || isParkingCostRow(t)) return false;
  const cat = categoryText(t);
  const typ = typeText(t);
  const text = rowText(t);
  if (isMemberFundingRow(t) || isTrueTicketSaleRow(t) || isParkingMoneyRow(t)) return false;
  if (rowTotal(t) < 0) return true;
  return /travel|airfare|fee|tax|expense|cost|purchase/.test(cat + ' ' + typ + ' ' + text);
}
function moneyBucket(t) {
  if (isSharedOpportunityRow(t)) return 'Shared Opportunity';
  if (isMemberFundingRow(t)) return 'Member / Fund Money';
  if (isTrueTicketSaleRow(t)) return 'Ticket Sales / Resales';
  if (isParkingMoneyRow(t)) return 'Parking Sales / Resales';
  if (isTicketCostRow(t)) return 'Ticket Costs';
  if (isParkingCostRow(t)) return 'Parking Costs';
  if (isOtherCostRow(t)) return 'Other Costs';
  const total = rowTotal(t);
  if (total > 0) return 'Other Money In';
  if (total < 0) return 'Other Costs';
  return 'No Money Impact';
}
// ---- end ported logic ----

const BUCKET_TO_MONEY_TYPE = {
  'Shared Opportunity': 'SharedOpportunity',
  'Member / Fund Money': 'MemberFunding',
  'Ticket Sales / Resales': 'TicketSale',
  'Parking Sales / Resales': 'ParkingSale',
  'Ticket Costs': 'TicketCost',
  'Parking Costs': 'ParkingCost',
  'Other Costs': 'OtherCost',
  // No clean 8th bucket in the new enum for these two edge cases; fold them
  // into MemberFunding (closest conceptual match: money in that isn't a
  // ticket/parking sale) rather than inventing a rarely-used category.
  'Other Money In': 'MemberFunding',
  'No Money Impact': 'MemberFunding',
};

const raw = readFileSync(ledgerPath, 'utf-8');
const ledger = JSON.parse(raw);
const transactions = ledger.transactions || [];

const bucketCounts = {};
const foldedRows = [];
for (const t of transactions) {
  const bucket = moneyBucket(t);
  bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
  const moneyType = BUCKET_TO_MONEY_TYPE[bucket];
  t.MoneyType = moneyType;
  if (bucket === 'Other Money In' || bucket === 'No Money Impact') {
    foldedRows.push({ TxnID: t.TxnID, bucket, TotalAmount: t.TotalAmount, Description: t.Description || t.Game });
  }
}

if (!ledger.columns.includes('MoneyType')) ledger.columns.push('MoneyType');
ledger.meta.format = 'HTCC_PUBLIC_LEDGER_SNAPSHOT_V3';
ledger.meta.notice = 'Read-only member dashboard snapshot. Public if hosted on public GitHub Pages. MoneyType backfilled ' + new Date().toISOString() + '.';

writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');

const columnLines = ['TxnID\tMoneyType', ...transactions.map(t => `${t.TxnID}\t${t.MoneyType}`)];
writeFileSync(path.join(outDir, 'money-type-column.txt'), columnLines.join('\n') + '\n');

console.log('Bucket distribution (old classifier, before renaming to MoneyType):');
for (const [bucket, count] of Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${bucket}  ->  ${BUCKET_TO_MONEY_TYPE[bucket]}`);
}
if (foldedRows.length) {
  console.log('\nRows folded into MemberFunding from an ambiguous bucket (review these):');
  foldedRows.forEach(r => console.log(`  ${r.TxnID}  [${r.bucket}]  ${r.TotalAmount}  ${r.Description}`));
}
console.log(`\nWrote ${transactions.length} rows with MoneyType to ${path.relative(repoRoot, ledgerPath)}`);
console.log(`Wrote paste-ready column to ${path.relative(repoRoot, path.join(outDir, 'money-type-column.txt'))}`);
