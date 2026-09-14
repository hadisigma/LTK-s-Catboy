const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod-activate')
    .setDescription('[Mod only] Turn on the word-filter automod (10 min timeout + logging)')
    .addChannelOption((opt) =>
      opt
        .setName('log-channel')
        .setDescription('Channel where mutes get logged')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const logChannel = interaction.options.getChannel('log-channel');

    const settings = storage.load('settings', {});
    const guildSettings = settings[interaction.guild.id] || {};
    guildSettings.automod = { enabled: true, logChannelId: logChannel.id };
    settings[interaction.guild.id] = guildSettings;
    storage.save('settings', settings);

    await interaction.reply(
      `✅ Automod is now **active**. Offensive/insulting messages will be removed, ` +
        `the author timed out for 10 minutes, and it'll be logged in ${logChannel}.`
    );
  },
};
