const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activate-anti-spam')
    .setDescription('[Mod only] Turn on automatic spam detection (10 min timeout for spammers)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const settings = storage.load('settings', {});
    const guildSettings = settings[interaction.guild.id] || {};

    if (guildSettings.antiSpam) {
      return interaction.reply({ content: 'Anti-spam is already active on this server.', ephemeral: true });
    }

    guildSettings.antiSpam = true;
    settings[interaction.guild.id] = guildSettings;
    storage.save('settings', settings);

    await interaction.reply(
      '✅ Anti-spam is now **active**. Repeated identical messages, rapid-fire messages, ' +
        'or repeated ALL-CAPS messages will get a 10 minute timeout.'
    );
  },
};
