const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('[Mod only] Toggle a channel in/out of the automod whitelist')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to whitelist (run again on the same channel to un-whitelist it)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const channel = interaction.options.getChannel('channel');

    const settings = storage.load('settings', {});
    const guildSettings = settings[interaction.guild.id] || {};
    const automod = guildSettings.automod || { enabled: false, logChannelId: null, whitelistedChannels: [] };
    const whitelisted = new Set(automod.whitelistedChannels || []);

    let replyText;
    if (whitelisted.has(channel.id)) {
      whitelisted.delete(channel.id);
      replyText = `✅ Removed ${channel} from the automod whitelist - the word filter is active there again.`;
    } else {
      whitelisted.add(channel.id);
      replyText = `✅ ${channel} is now **whitelisted** - automod will never delete messages or time anyone out there.`;
    }

    automod.whitelistedChannels = [...whitelisted];
    guildSettings.automod = automod;
    settings[interaction.guild.id] = guildSettings;
    storage.save('settings', settings);

    await interaction.reply(replyText);
  },
};
