const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('./storage');

const POLL_STORAGE_KEY = 'live-polls';
const BAR_CHARS = '█';
const EMPTY_BAR_CHARS = '░';

function parsePollOptions(rawOptions) {
  if (!rawOptions || typeof rawOptions !== 'string') return [];

  return rawOptions
    .split(/\r?\n|\||,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function buildPollEmbed(poll) {
  const totalVotes = poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
  const fields = poll.options.map((option, index) => {
    const percent = totalVotes === 0 ? 0 : Math.round(((option.votes || 0) / totalVotes) * 100);
    const filledBars = Math.max(1, Math.round(percent / 5));
    const bar = `${BAR_CHARS.repeat(filledBars)}${EMPTY_BAR_CHARS.repeat(20 - filledBars)}`;
    return {
      name: `${index + 1}. ${option.label}`,
      value: `${bar} ${percent}% (${option.votes || 0} vote${(option.votes || 0) === 1 ? '' : 's'})`,
      inline: false,
    };
  });

  const footer = totalVotes === 0 ? 'No votes yet—be the first to cast one!' : `${totalVotes} vote${totalVotes === 1 ? '' : 's'} total`;

  return new EmbedBuilder()
    .setTitle('📊 Live poll')
    .setDescription(`**${poll.question}**`)
    .setColor(0x5865f2)
    .addFields(fields)
    .setFooter({ text: footer });
}

function buildPollButtons(poll) {
  const buttons = poll.options.map((option, index) =>
    new ButtonBuilder()
      .setCustomId(`live_poll_vote_${poll.id}_${index}`)
      .setLabel(option.label)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(getOptionEmoji(index))
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return rows;
}

function getOptionEmoji(index) {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return emojis[index] || '🔹';
}

function loadPolls() {
  return storage.load(POLL_STORAGE_KEY, {});
}

function savePolls(polls) {
  storage.save(POLL_STORAGE_KEY, polls);
}

function createPoll(question, rawOptions, guildId, channelId) {
  const normalizedOptions = parsePollOptions(rawOptions);
  if (normalizedOptions.length < 2 || normalizedOptions.length > 10) {
    throw new Error('A live poll needs between 2 and 10 options.');
  }

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    guildId,
    channelId,
    question: question.trim(),
    options: normalizedOptions.map((label) => ({ label, votes: 0 })),
    voters: {},
    createdAt: Date.now(),
  };
}

function recordVote(poll, userId, optionIndex) {
  const previousVote = poll.voters[userId];

  if (previousVote === optionIndex) {
    return {
      changed: false,
      poll,
      message: `You already voted for **${poll.options[optionIndex].label}**.`,
    };
  }

  if (typeof previousVote === 'number' && previousVote >= 0 && previousVote < poll.options.length) {
    poll.options[previousVote].votes = Math.max(0, (poll.options[previousVote].votes || 0) - 1);
  }

  poll.options[optionIndex].votes = (poll.options[optionIndex].votes || 0) + 1;
  poll.voters[userId] = optionIndex;

  return {
    changed: true,
    poll,
    message: `✅ Your vote for **${poll.options[optionIndex].label}** was recorded.`,
  };
}

module.exports = {
  parsePollOptions,
  buildPollEmbed,
  buildPollButtons,
  createPoll,
  loadPolls,
  savePolls,
  recordVote,
};
