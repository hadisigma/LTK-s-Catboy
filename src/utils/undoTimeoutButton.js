const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildUndoButtonRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`undo_timeout_${userId}`)
      .setLabel('↩️ Remove Timeout (false flag)')
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = { buildUndoButtonRow };
