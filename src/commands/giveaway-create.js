const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const { parseDuration, formatDuration } = require('../utils/duration');
const { loadGiveaways, saveGiveaways, buildEmbed, buildRow } = require('../utils/giveawayManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway-create')
    .setDescription('[Mod only] Start a giveaway')
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('How long the giveaway runs, e.g. 10m, 1h, 2d')
        .setRequired(true)
    )
    .addStringOption((opt) => opt.setName('title').setDescription('Giveaway title').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('description').setDescription('Giveaway description').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1)
    )
    .addRoleOption((opt) =>
      opt
        .setName('required-role')
        .setDescription('Only members with this role can enter (optional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const durationStr = interaction.options.getString('duration');
    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs <= 0) {
      return interaction.reply({
        content: 'Could not understand that duration. Try something like `10m`, `1h`, `2d`, or `1d12h`.',
        ephemeral: true,
      });
    }

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const winnersCount = interaction.options.getInteger('winners');
    const requiredRole = interaction.options.getRole('required-role');

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const giveaway = {
      id,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      messageId: null,
      title,
      description,
      winnersCount,
      requiredRoleId: requiredRole ? requiredRole.id : null,
      endsAt: Date.now() + durationMs,
      entries: [],
      ended: false,
      winners: [],
    };

    await interaction.reply({ content: `Starting giveaway, ends in ${formatDuration(durationMs)}...`, ephemeral: true });

    const message = await interaction.channel.send({
      embeds: [buildEmbed(giveaway)],
      components: [buildRow(giveaway)],
    });

    giveaway.messageId = message.id;
    const giveaways = loadGiveaways();
    giveaways[id] = giveaway;
    saveGiveaways(giveaways);
  },
};
