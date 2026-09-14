const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('[Mod only] Create a honeypot channel to trap spam/scam bots')
    .addStringOption((opt) =>
      opt
        .setName('channel-name')
        .setDescription('Name for the honeypot channel')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    await interaction.deferReply({ ephemeral: true });

    const rawName = interaction.options.getString('channel-name');

    const channel = await interaction.guild.channels.create({
      name: rawName,
      type: ChannelType.GuildText,
      parent: null, // uncategorized
      position: 0, // pushed to the top of the uncategorized channels
      topic: 'Honeypot channel - do not post here.',
    });

    await channel.send(
      '⚠️ **This is a Honeypot Channel.**\n' +
        'Do not send messages in here - this channel exists to catch people affected by ' +
        'the MrBeast scam or similar scams/spam bots. If someone sends a message here, ' +
        'they will be **automatically kicked.**'
    );

    const honeypots = storage.load('honeypots', {});
    const guildList = honeypots[interaction.guild.id] || [];
    guildList.push(channel.id);
    honeypots[interaction.guild.id] = guildList;
    storage.save('honeypots', honeypots);

    await interaction.editReply(`✅ Honeypot channel created: ${channel}`);
  },
};
