import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat('en-IN');

export const inr = (n, decimals = false) => (n === null || n === undefined || Number.isNaN(n) ? '—' : (decimals ? inrFmt2 : inrFmt).format(n));
export const num = (n) => (n === null || n === undefined ? '—' : numFmt.format(Math.round(n)));

/** Compact rupees for axes: ₹1.2L, ₹3.4Cr, ₹12K */
export function inrCompact(n) {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return `${sign}₹${Math.round(a)}`;
}

export const pct = (n, digits = 1, signed = true) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `${signed && n > 0 ? '+' : ''}${Number(n).toFixed(digits)}%`;

export const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const monthLabel = (m) => new Date(`${m}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
export const timeLabel = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const symbolLabel = (s) => (s || '').replace('.NS', '').replace('^', '');

/** Price in the instrument's own currency. Yahoo quotes LSE stocks in pence (GBp). */
export function money(n, currency = 'INR', digits) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (currency === 'GBp' || currency === 'GBX') return `${Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 })}p`;
  if (!currency) return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const d = digits ?? (Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 1 ? 2 : 4);
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  } catch {
    return `${Number(n).toFixed(d)} ${currency}`;
  }
}

export const ago = (iso) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
