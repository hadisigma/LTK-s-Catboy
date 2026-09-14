const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePollOptions, buildPollEmbed } = require('../src/utils/livePoll');

test('parsePollOptions handles pipe and comma separators', () => {
  assert.deepEqual(parsePollOptions('Cats|Dogs|Birds'), ['Cats', 'Dogs', 'Birds']);
  assert.deepEqual(parsePollOptions('Red, Blue, Green'), ['Red', 'Blue', 'Green']);
  assert.deepEqual(parsePollOptions('One\nTwo\nThree'), ['One', 'Two', 'Three']);
});

test('buildPollEmbed includes chart and percentages', () => {
  const poll = {
    question: 'Best color?',
    options: [
      { label: 'Red', votes: 1 },
      { label: 'Blue', votes: 3 },
    ],
  };

  const embed = buildPollEmbed(poll);

  assert.equal(embed.data.title, '📊 Live poll');
  assert.match(embed.data.description, /Best color\?/);
  assert.ok(embed.data.fields.some((field) => field.name.includes('Red')));
  assert.ok(embed.data.fields.some((field) => field.value.includes('25%')));
  assert.ok(embed.data.fields.some((field) => field.value.includes('75%')));
});
