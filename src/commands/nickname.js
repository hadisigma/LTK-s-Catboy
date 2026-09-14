const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('[Mod only] Change the name a member is displayed with')
    .addUserOption((opt) =>
      opt.setName('username').setDescription('Member to rename').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('nickname')
        .setDescription('New display name')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(32)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const targetUser = interaction.options.getUser('username');
    const nickname = interaction.options.getString('nickname');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
    }

    if (!targetMember.manageable) {
      return interaction.reply({
        content: `I can't change ${targetMember}'s nickname - their highest role sits at/above my own role, or they're the server owner.`,
        ephemeral: true,
      });
    }

    const oldName = targetMember.displayName;

    try {
      await targetMember.setNickname(nickname, `Changed by ${interaction.user.tag}`);
      await interaction.reply(`✅ Changed ${targetMember}'s display name from **${oldName}** to **${nickname}**.`);
    } catch (err) {
      console.error('[nickname] failed:', err);
      await interaction.reply({ content: `Something went wrong changing that nickname: ${err.message}`, ephemeral: true });
    }
  },
};
