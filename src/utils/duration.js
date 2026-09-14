// Parses strings like "10m", "2h", "1d", "45s", or combos like "1d12h" into ms.
const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDuration(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();
  const regex = /(\d+)\s*(s|m|h|d)/g;
  let match;
  let total = 0;
  let matched = false;

  while ((match = regex.exec(str)) !== null) {
    matched = true;
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    total += amount * UNIT_MS[unit];
  }

  if (!matched) return null;
  return total;
}

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const days = Math.floor(ms / UNIT_MS.d);
  ms -= days * UNIT_MS.d;
  const hours = Math.floor(ms / UNIT_MS.h);
  ms -= hours * UNIT_MS.h;
  const minutes = Math.floor(ms / UNIT_MS.m);
  ms -= minutes * UNIT_MS.m;
  const seconds = Math.floor(ms / UNIT_MS.s);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

module.exports = { parseDuration, formatDuration };
