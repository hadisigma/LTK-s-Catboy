require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

const storage = require('./utils/storage');
const { isModOrHigher } = require('./utils/permissions');
const spamDetector = require('./utils/spamDetector');
const automodFilter = require('./utils/automodFilter');
const giveawayManager = require('./utils/giveawayManager');
const { buildHelpEmbed } = require('./help');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// --- load slash commands ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  giveawayManager.startScheduler(client);
});

// --- slash commands + giveaway buttons ---
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[command:${interaction.commandName}] error:`, err);
      const payload = { content: 'Something went wrong running that command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('giveaway_enter_')) {
    const id = interaction.customId.replace('giveaway_enter_', '');
    const giveaways = giveawayManager.loadGiveaways();
    const giveaway = giveaways[id];

    if (!giveaway) {
      return interaction.reply({ content: 'This giveaway no longer exists.', ephemeral: true });
    }
    if (giveaway.ended) {
      return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
    }
    if (giveaway.requiredRoleId && !interaction.member.roles.cache.has(giveaway.requiredRoleId)) {
      return interaction.reply({
        content: `You need the <@&${giveaway.requiredRoleId}> role to enter this giveaway.`,
        ephemeral: true,
      });
    }
    if (giveaway.entries.includes(interaction.user.id)) {
      return interaction.reply({ content: "You're already entered. Good luck! 🍀", ephemeral: true });
    }

    giveaway.entries.push(interaction.user.id);
    giveaways[id] = giveaway;
    giveawayManager.saveGiveaways(giveaways);

    await interaction.reply({ content: "You're in! Good luck! 🎉", ephemeral: true });

    try {
      await interaction.message.edit({
        embeds: [giveawayManager.buildEmbed(giveaway)],
        components: [giveawayManager.buildRow(giveaway)],
      });
    } catch (err) {
      console.error('[giveaway] failed to update entry count:', err);
    }
  }
});

// --- message-based features: -$help, honeypot, automod, anti-spam ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // -$help (mod only)
  if (message.content.trim() === '-$help') {
    if (!isModOrHigher(message.member)) {
      return message.reply({ content: 'You need mod permissions to use this.' }).catch(() => {});
    }
    return message.reply({ embeds: [buildHelpEmbed()] }).catch(() => {});
  }

  // Honeypot channel check
  const honeypots = storage.load('honeypots', {});
  const guildHoneypots = honeypots[message.guild.id] || [];
  if (guildHoneypots.includes(message.channel.id)) {
    await message.delete().catch(() => {});
    const me = await message.guild.members.fetchMe();
    if (message.member?.kickable && me.permissions.has(PermissionFlagsBits.KickMembers)) {
      await message.member.kick('Posted in honeypot channel').catch((err) => {
        console.error('[honeypot] kick failed:', err);
      });
    }
    return;
  }

  const settings = storage.load('settings', {});
  const guildSettings = settings[message.guild.id] || {};

  // Automod word filter
  if (guildSettings.automod?.enabled) {
    const reason = automodFilter.checkMessage(message.content);
    if (reason) {
      const originalContent = message.content; // captured before delete, for the log
      await message.delete().catch(() => {});

      const member =
        message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));

      // Only ever report what actually happened - never claim a timeout that
      // didn't go through (e.g. Discord blocks timing out Administrators, or
      // anyone whose role sits at/above the bot's own role).
      let actionResult;
      if (!member) {
        actionResult = '⚠️ Could not fetch this member - no action taken.';
      } else if (!member.moderatable) {
        actionResult =
          "⚠️ **Could NOT time them out.** Discord blocks this - they likely have Administrator " +
          "permissions themselves, or their highest role sits at/above the bot's own role.";
      } else {
        try {
          await member.timeout(automodFilter.TIMEOUT_MS, reason);
          actionResult = '✅ Timed out for 10 minutes.';
        } catch (err) {
          console.error('[automod] timeout failed:', err);
          actionResult = `⚠️ **Timeout attempt failed:** ${err.message}`;
        }
      }

      const logChannel = await message.guild.channels
        .fetch(guildSettings.automod.logChannelId)
        .catch(() => null);

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🚫 Automod action')
          .setColor(0xed4245)
          .addFields(
            { name: 'User', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            {
              name: 'Message (exact text)',
              value: originalContent ? `\`\`\`${originalContent.slice(0, 1000)}\`\`\`` : '*(no text content)*',
            },
            { name: 'Action', value: actionResult }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
      }
      return;
    }
  }

  // Anti-spam
  if (guildSettings.antiSpam) {
    const reason = spamDetector.check(message);
    if (reason) {
      const originalContent = message.content;
      spamDetector.reset(message.author.id);

      const member =
        message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
      const quote = originalContent ? `\n> ${originalContent.slice(0, 300)}` : '';

      if (!member) return;

      if (!member.moderatable) {
        message.channel
          .send({
            content:
              `⚠️ ${message.author} was flagged for ${reason}, but could **NOT** be timed out ` +
              `(Discord blocks this for Administrators or roles at/above the bot's own role).${quote}`,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
        return;
      }

      try {
        await member.timeout(spamDetector.TIMEOUT_MS, reason);
        message.channel
          .send({
            content: `⏱️ ${member} was timed out for 10 minutes for ${reason}.${quote}`,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      } catch (err) {
        console.error('[anti-spam] timeout failed:', err);
        message.channel
          .send({
            content: `⚠️ Tried to time out ${member} for ${reason}, but it failed: ${err.message}${quote}`,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
