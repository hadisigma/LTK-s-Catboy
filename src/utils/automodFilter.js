// Word/phrase filter for the automod feature. Uses the "leo-profanity"
// package's maintained dictionary (covers slurs and common profanity) plus a
// small list of extra insult phrases the bot owner asked for by name.
const leoProfanity = require('leo-profanity');

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Extra multi-word phrases that a single-word filter would miss.
const EXTRA_PHRASES = [
  'fuck you',
  'f u',
  'kill yourself',
  'kys',
];

function normalize(text) {
  return text
    .toLowerCase()
    // collapse common leetspeak / spacing tricks: "f.u.c.k", "f_u_c_k", "a$$hole"
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Returns a short reason string if the message content violates the filter,
 * or null if it's fine.
 */
function checkMessage(content) {
  const lower = content.toLowerCase();

  if (leoProfanity.check(lower)) {
    return 'inappropriate/offensive language';
  }

  const normalized = normalize(lower);
  for (const phrase of EXTRA_PHRASES) {
    if (normalized.includes(normalize(phrase))) {
      return 'harassment / insulting language';
    }
  }

  return null;
}

module.exports = { checkMessage, TIMEOUT_MS };
