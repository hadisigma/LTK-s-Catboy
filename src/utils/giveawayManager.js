const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../utils/storage');

function loadGiveaways() {
  return storage.load('giveaways', {});
}

function saveGiveaways(data) {
  storage.save('giveaways', data);
}

function buildEmbed(giveaway) {
  const ended = giveaway.ended;
  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${giveaway.title}`)
    .setDescription(giveaway.description)
    .setColor(ended ? 0x808080 : 0x57f287)
    .addFields(
      { name: 'Winners', value: String(giveaway.winnersCount), inline: true },
      {
        name: 'Required role',
        value: giveaway.requiredRoleId ? `<@&${giveaway.requiredRoleId}>` : 'None - anyone can enter',
        inline: true,
      },
      {
        name: ended ? 'Ended' : 'Ends',
        value: `<t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
        inline: true,
      },
      { name: 'Entries', value: String(giveaway.entries.length), inline: true }
    );

  if (ended) {
    embed.addFields({
      name: 'Winner(s)',
      value: giveaway.winners && giveaway.winners.length ? giveaway.winners.map((id) => `<@${id}>`).join(', ') : 'No valid entries.',
    });
  }

  return embed;
}

function buildRow(giveaway) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${giveaway.id}`)
      .setLabel('🎉 Enter Giveaway')
      .setStyle(ButtonStyle.Success)
      .setDisabled(giveaway.ended)
  );
  return row;
}

function pickWinners(entries, count) {
  const pool = [...entries];
  const winners = [];
  while (pool.length && winners.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

async function endGiveaway(client, id) {
  const giveaways = loadGiveaways();
  const giveaway = giveaways[id];
  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;
  giveaway.winners = pickWinners(giveaway.entries, giveaway.winnersCount);
  giveaways[id] = giveaway;
  saveGiveaways(giveaways);

  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    await message.edit({ embeds: [buildEmbed(giveaway)], components: [buildRow(giveaway)] });

    const winnerText = giveaway.winners.length
      ? giveaway.winners.map((id) => `<@${id}>`).join(', ')
      : 'No one entered, so no winner could be picked.';
    await channel.send(`🎉 Giveaway for **${giveaway.title}** has ended! Winner(s): ${winnerText}`);
  } catch (err) {
    console.error(`[giveaway] Failed to finalize giveaway ${id}:`, err);
  }
}

// Call once on bot startup, then every ~30s. Ends any giveaway whose time is
// up, including ones that expired while the bot was offline/restarting.
function startScheduler(client) {
  const tick = async () => {
    const giveaways = loadGiveaways();
    const now = Date.now();
    for (const id of Object.keys(giveaways)) {
      const g = giveaways[id];
      if (!g.ended && g.endsAt <= now) {
        await endGiveaway(client, id);
      }
    }
  };
  tick();
  setInterval(tick, 30 * 1000);
}

module.exports = { loadGiveaways, saveGiveaways, buildEmbed, buildRow, endGiveaway, startScheduler };
