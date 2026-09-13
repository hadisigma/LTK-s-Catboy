const { EmbedBuilder } = require('discord.js');
const { ADMIN_ROLE_NAME } = require('./utils/permissions');

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('📖 Mod Bot - Command List')
    .setDescription(`All commands below require the **${ADMIN_ROLE_NAME}** role or higher.`)
    .setColor(0x5865f2)
    .addFields(
      {
        name: '/honeypot [channel-name]',
        value: 'Creates an uncategorized "trap" channel. Anyone who posts in it gets kicked instantly.',
      },
      {
        name: '/giverole [person] [role]',
        value: 'Gives the chosen role to the chosen member.',
      },
      {
        name: '/activate-anti-spam',
        value: 'Turns on automatic spam detection (repeated messages, rapid messages, repeated ALL CAPS) - 10 min timeout.',
      },
      {
        name: '/giveaway-create [duration] [title] [description] [winners] [required-role]',
        value: 'Starts a giveaway with an "Enter" button. Winners are picked automatically when it ends.',
      },
      {
        name: '/automod-activate [log-channel]',
        value: 'Turns on the word filter. Offensive/insulting messages get deleted, the author timed out 10 min, and it gets logged.',
      },
      {
        name: '$help',
        value: 'Shows this list.',
      }
    )
    .setFooter({ text: `Mod-only means: ${ADMIN_ROLE_NAME} role or any role above it in Server Settings -> Roles.` });
}

module.exports = { buildHelpEmbed };
