// Very small JSON-file "database". Good enough for a single-server-ish bot.
// NOTE: on some free hosts the disk resets on every redeploy/restart - see
// README.md ("A note on data persistence") for details.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return fallback;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[storage] Failed to read ${name}.json, using fallback.`, err);
    return fallback;
  }
}

function save(name, data) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { load, save };
