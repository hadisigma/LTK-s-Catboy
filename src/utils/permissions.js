const { PermissionFlagsBits } = require('discord.js');

const ADMIN_ROLE_NAME = (process.env.ADMIN_ROLE_NAME || 'ADMIN').toLowerCase();

/**
 * Returns true if the member counts as "mod or higher":
 *  - has the Administrator permission, OR
 *  - their highest role sits at or above the configured admin role
 *    (e.g. "ADMIN") in the server's role list.
 *
 * This mirrors a role hierarchy like:
 *   OWNER > CO-OWNER > CO-OWNER HAND > Moderator > ADMIN > everyone else
 * without hardcoding every role name - it just needs ONE role (ADMIN_ROLE_NAME)
 * to exist and be positioned correctly in Server Settings -> Roles.
 */
function isModOrHigher(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const adminRole = member.guild.roles.cache.find(
    (r) => r.name.toLowerCase() === ADMIN_ROLE_NAME
  );

  // If we can't find the configured role at all, fail safe: only real
  // Discord Administrators can use mod-only commands.
  if (!adminRole) return false;

  return member.roles.highest.position >= adminRole.position;
}

/**
 * Replies with an ephemeral "no permission" message. Returns nothing - just
 * call `return` right after calling this in a command handler.
 */
async function denyNoPermission(interaction) {
  await interaction.reply({
    content: `You need the **${process.env.ADMIN_ROLE_NAME || 'ADMIN'}** role (or higher) to use this command.`,
    ephemeral: true,
  });
}

module.exports = { isModOrHigher, denyNoPermission, ADMIN_ROLE_NAME };
