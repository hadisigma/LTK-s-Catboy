const test = require('node:test');
const assert = require('node:assert/strict');

const { buildArenaEmbed, createArenaState } = require('../src/utils/debateArena');

test('createArenaState creates two teams with role metadata', () => {
  const arena = createArenaState({
    topic: 'AI ethics',
    guildId: 'guild-1',
    channelId: 'channel-1',
    threadId: 'thread-1',
  });

  assert.equal(arena.topic, 'AI ethics');
  assert.equal(arena.teams.length, 2);
  assert.deepEqual(arena.teams.map((team) => team.name), ['Team A', 'Team B']);
  assert.ok(arena.roleIds.teamA);
  assert.ok(arena.roleIds.teamB);
});

test('buildArenaEmbed includes tug-of-war meter and counts', () => {
  const arena = {
    topic: 'Cats vs dogs',
    teams: [
      { name: 'Team A', members: ['u1', 'u2', 'u3'], color: 0x3498db },
      { name: 'Team B', members: ['u4'], color: 0xff4d4d },
    ],
  };

  const embed = buildArenaEmbed(arena);

  assert.equal(embed.data.title, '⚔️ Debate Arena');
  assert.match(embed.data.description, /Cats vs dogs/);
  assert.ok(embed.data.fields.some((field) => field.name.includes('Team A')));
  assert.ok(embed.data.fields.some((field) => field.value.includes('75%')));
  assert.ok(embed.data.fields.some((field) => field.value.includes('25%')));
});
