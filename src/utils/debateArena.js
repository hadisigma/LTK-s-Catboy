const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('./storage');

const ARENA_STORAGE_KEY = 'debate-arenas';

function createArenaState({ topic, guildId, channelId, threadId }) {
  const teamAColor = 0x3498db;
  const teamBColor = 0xff4d4d;

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    topic: String(topic || 'Untitled topic').trim(),
    guildId,
    channelId,
    threadId,
    roleIds: {
      teamA: `debate-team-a-${threadId}`,
      teamB: `debate-team-b-${threadId}`,
    },
    teams: [
      {
        name: 'Team A',
        members: [],
        color: teamAColor,
      },
      {
        name: 'Team B',
        members: [],
        color: teamBColor,
      },
    ],
    voters: {},
    createdAt: Date.now(),
  };
}

function getArenaStats(arena) {
  const total = arena.teams.reduce((sum, team) => sum + team.members.length, 0) || 1;
  const aCount = arena.teams[0].members.length;
  const bCount = arena.teams[1].members.length;
  const aPercent = Math.round((aCount / total) * 100);
  const bPercent = 100 - aPercent;

  return { total, aCount, bCount, aPercent, bPercent };
}

function buildArenaEmbed(arena) {
  const { aCount, bCount, aPercent, bPercent } = getArenaStats(arena);
  const total = Math.max(aCount + bCount, 1);
  const barLength = 20;
  const aBars = Math.max(1, Math.round((aCount / total) * barLength));
  const bBars = Math.max(1, Math.round((bCount / total) * barLength));
  const meter = `${'█'.repeat(aBars)}${'░'.repeat(Math.max(0, barLength - aBars))}`;

  return new EmbedBuilder()
    .setTitle('⚔️ Debate Arena')
    .setDescription(`**${arena.topic}**\n\n${meter}  ${aPercent}% : ${bPercent}%`)
    .setColor(0x5865f2)
    .addFields(
      {
        name: 'Team A',
        value: `**${aCount}** members\n${arena.teams[0].members.slice(0, 5).map((id) => `<@${id}>`).join(', ') || 'No members yet'}`,
        inline: true,
      },
      {
        name: 'Team B',
        value: `**${bCount}** members\n${arena.teams[1].members.slice(0, 5).map((id) => `<@${id}>`).join(', ') || 'No members yet'}`,
        inline: true,
      },
      {
        name: 'Tug-of-war meter',
        value: `Team A: **${aPercent}%**\nTeam B: **${bPercent}%**`,
        inline: false,
      }
    )
    .setFooter({ text: 'Click a side to join the debate and get your temporary color role.' });
}

function buildArenaButtons(arena, closed = false) {
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`debate_arena_join_${arena.id}_0`)
        .setLabel(closed ? 'Arena closed' : 'Team A')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔵')
        .setDisabled(closed),
      new ButtonBuilder()
        .setCustomId(`debate_arena_join_${arena.id}_1`)
        .setLabel(closed ? 'Arena closed' : 'Team B')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴')
        .setDisabled(closed)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`debate_arena_close_${arena.id}`)
        .setLabel('Close Arena')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed)
    ),
  ];

  return rows;
}

function loadArenas() {
  return storage.load(ARENA_STORAGE_KEY, {});
}

function saveArenas(arenas) {
  storage.save(ARENA_STORAGE_KEY, arenas);
}

function joinArena(arena, userId, sideIndex) {
  const targetTeam = arena.teams[sideIndex];
  const previousSide = arena.voters[userId];

  if (arena.closed) {
    return { changed: false, message: 'This debate arena is closed.' };
  }

  if (!targetTeam) return { changed: false, message: 'That side is not available.' };

  if (previousSide === sideIndex) {
    return { changed: false, message: `You already joined **${targetTeam.name}**.` };
  }

  if (typeof previousSide === 'number') {
    const currentTeam = arena.teams[previousSide];
    if (currentTeam) {
      currentTeam.members = currentTeam.members.filter((id) => id !== userId);
    }
  }

  if (!targetTeam.members.includes(userId)) {
    targetTeam.members.push(userId);
  }

  arena.voters[userId] = sideIndex;

  return {
    changed: true,
    message: `✅ You joined **${targetTeam.name}**.`,
  };
}

async function closeArena(guild, arena) {
  arena.closed = true;

  for (const [teamKey, roleId] of Object.entries(arena.roleIds)) {
    const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
    if (!role) continue;

    for (const userId of arena.teams[teamKey === 'teamA' ? 0 : 1].members) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.roles.remove(role).catch(() => {});
      }
    }
  }

  return arena;
}

module.exports = {
  createArenaState,
  buildArenaEmbed,
  buildArenaButtons,
  loadArenas,
  saveArenas,
  joinArena,
  closeArena,
};
