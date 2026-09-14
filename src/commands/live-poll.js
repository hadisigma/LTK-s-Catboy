const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModOrHigher, denyNoPermission } = require('../utils/permissions');
const { createPoll, loadPolls, savePolls, buildPollEmbed, buildPollButtons } = require('../utils/livePoll');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('live_poll')
    .setDescription('[Mod only] Start a live poll with clickable vote buttons')
    .addStringOption((option) =>
      option.setName('question').setDescription('The poll question').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('options')
        .setDescription('Separate options with commas, pipes, or new lines (2-10 total)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isModOrHigher(interaction.member)) return denyNoPermission(interaction);

    const question = interaction.options.getString('question', true);
    const rawOptions = interaction.options.getString('options', true);

    let poll;
    try {
      poll = createPoll(question, rawOptions, interaction.guild.id, interaction.channel.id);
    } catch (err) {
      return interaction.reply({ content: err.message, ephemeral: true });
    }

    const polls = loadPolls();
    polls[poll.id] = poll;
    savePolls(polls);

    const message = await interaction.channel.send({
      embeds: [buildPollEmbed(poll)],
      components: buildPollButtons(poll),
    });

    poll.messageId = message.id;
    polls[poll.id] = poll;
    savePolls(polls);

    await interaction.reply({ content: `✅ Live poll created in ${interaction.channel}.`, ephemeral: true });
  },
};
