const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giverole')
    .setDescription('[Mod only] Give a role to a member')
    .addUserOption((opt) =>
      opt.setName('person').setDescription('Member to give the role to').setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role to give').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const targetUser = interaction.options.getUser('person');
    const role = interaction.options.getRole('role');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
    }

    const me = await interaction.guild.members.fetchMe();
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({
        content: `I can't assign **${role.name}** - it's positioned at or above my own highest role. Move my bot role above it in Server Settings -> Roles.`,
        ephemeral: true,
      });
    }

    if (targetMember.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${targetMember} already has **${role.name}**.`, ephemeral: true });
    }

    try {
      await targetMember.roles.add(role);
      await interaction.reply(`✅ Gave ${targetMember} the **${role.name}** role.`);
    } catch (err) {
      console.error('[giverole] failed:', err);
      await interaction.reply({ content: 'Something went wrong giving that role.', ephemeral: true });
    }
  },
};
