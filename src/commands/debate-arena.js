const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const { createArenaState, buildArenaEmbed, buildArenaButtons, loadArenas, saveArenas } = require('../utils/debateArena');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debate_arena')
    .setDescription('[Mod only] Open a split-team debate arena with live role-based teams')
    .addStringOption((option) =>
      option.setName('topic').setDescription('The debate topic to open').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const topic = interaction.options.getString('topic', true);
    const arena = createArenaState({
      topic,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      threadId: `${interaction.channel.id}-${Date.now()}`,
    });

    const arenas = loadArenas();
    arenas[arena.id] = arena;
    saveArenas(arenas);

    const message = await interaction.channel.send({
      embeds: [buildArenaEmbed(arena)],
      components: buildArenaButtons(arena),
    });

    arena.messageId = message.id;
    arenas[arena.id] = arena;
    saveArenas(arenas);

    await interaction.reply({ content: `✅ Debate arena opened for **${topic}**.`, ephemeral: true });
  },
};
