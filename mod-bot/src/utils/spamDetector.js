// In-memory per-user tracking for the anti-spam feature. Resets on restart,
// which is fine - spam detection only needs to look at the last few seconds.
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const DUPLICATE_WINDOW_MS = 15 * 1000;
const DUPLICATE_THRESHOLD = 3; // same message 3x in a row within the window

const RATE_WINDOW_MS = 6 * 1000;
const RATE_THRESHOLD = 5; // 5 messages within 6 seconds

const CAPS_WINDOW_MS = 60 * 1000;
const CAPS_THRESHOLD = 3; // 3 "shouty" messages within 60 seconds
const CAPS_MIN_LENGTH = 8; // ignore short messages like "LOL"
const CAPS_RATIO = 0.7; // 70%+ uppercase letters counts as shouting

// userId -> { messages: [{content, at}], capsHits: [at, ...] }
const userState = new Map();

function getState(userId) {
  if (!userState.has(userId)) {
    userState.set(userId, { messages: [], capsHits: [] });
  }
  return userState.get(userId);
}

function isShouting(content) {
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length < CAPS_MIN_LENGTH) return false;
  const upper = letters.replace(/[^A-Z]/g, '');
  return upper.length / letters.length >= CAPS_RATIO;
}

/**
 * Feeds one message into the detector. Returns a reason string if it looks
 * like spam, or null if the message looks fine.
 */
function check(message) {
  const userId = message.author.id;
  const content = message.content.trim();
  const now = Date.now();
  const state = getState(userId);

  // --- duplicate message spam ---
  state.messages.push({ content: content.toLowerCase(), at: now });
  state.messages = state.messages.filter((m) => now - m.at <= RATE_WINDOW_MS + DUPLICATE_WINDOW_MS);

  const recentDuplicateWindow = state.messages.filter((m) => now - m.at <= DUPLICATE_WINDOW_MS);
  const sameAsLast = recentDuplicateWindow.filter((m) => m.content === content.toLowerCase() && content.length > 0);
  if (sameAsLast.length >= DUPLICATE_THRESHOLD) {
    state.messages = [];
    return 'sending the same message repeatedly';
  }

  // --- rapid-fire message spam ---
  const recentRateWindow = state.messages.filter((m) => now - m.at <= RATE_WINDOW_MS);
  if (recentRateWindow.length >= RATE_THRESHOLD) {
    state.messages = [];
    return 'sending messages too quickly';
  }

  // --- repeated all-caps "shouting" ---
  if (isShouting(content)) {
    state.capsHits.push(now);
    state.capsHits = state.capsHits.filter((t) => now - t <= CAPS_WINDOW_MS);
    if (state.capsHits.length >= CAPS_THRESHOLD) {
      state.capsHits = [];
      return 'repeatedly typing in all caps';
    }
  }

  return null;
}

function reset(userId) {
  userState.delete(userId);
}

module.exports = { check, reset, TIMEOUT_MS };
