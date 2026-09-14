# Mod Bot

A Discord moderation bot with: honeypot channels, role-hierarchy-based
"mod only" permission checks, anti-spam auto-timeout, a word-filter automod,
and button-based giveaways.

## 1. Create the bot in Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy it. This goes in `.env` as `DISCORD_TOKEN` (never share it anywhere else).
3. Still on the **Bot** tab, turn on these two **Privileged Gateway Intents**:
   - **Server Members Intent**
   - **Message Content Intent**
   (Both are required — Server Members for role/kick/timeout actions, Message Content for `-$help`, honeypot, anti-spam and automod, since those all read message text.)
4. **General Information** tab → copy the **Application ID**, this is `CLIENT_ID` in `.env`.
5. **OAuth2 → URL Generator**: check `bot` and `applications.commands` scopes. Under **Bot Permissions**, check at least: `Kick Members`, `Moderate Members`, `Manage Roles`, `Manage Nicknames`, `Manage Channels`, `Send Messages`, `Read Message History`. Open the generated URL to invite the bot to your server.
6. In your server: **Server Settings → Roles**, drag the bot's own role **above** every role it needs to manage (e.g. above `ADMIN`, `Moderator`, etc., but below `OWNER`/`CO-OWNER` is fine). Discord bots can't give out or act on roles positioned above their own role.

## 2. Configure

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` (your server ID — with it set, slash commands appear instantly in that one server; without it, they register globally, which can take up to ~1 hour the first time).

`ADMIN_ROLE_NAME` is already set to `ADMIN` to match your role list — every command checks "does this member have the ADMIN role, or a role positioned above ADMIN (Moderator, CO-OWNER HAND, CO-OWNER, OWNER)?". If you rename that role later, update this value too.

## 3. Install & run (locally, to test)

```bash
npm install
npm run deploy   # registers the slash commands
npm start        # starts the bot
```

If it logs `✅ Logged in as YourBot#1234`, it's working. Try `/honeypot`, `/giverole`, etc. in Discord.

## Commands

All of these require the `ADMIN` role or higher (see above):

| Command | What it does |
|---|---|
| `/honeypot [channel-name]` | Creates an uncategorized channel with a warning message. Anyone who types in it gets kicked automatically. |
| `/giverole [person] [role]` | Gives the chosen role to the chosen member. |
| `/nickname [username] [nickname]` | Changes what name a member is displayed with. |
| `/activate-anti-spam` | Turns on spam detection: repeated identical messages, rapid-fire messages, or repeated ALL-CAPS messages → 10 min timeout. |
| `/giveaway-create [duration] [title] [description] [winners] [required-role]` | Posts a giveaway with an "Enter" button; winners are picked automatically when time runs out. |
| `/automod-activate [log-channel]` | Turns on a word filter (profanity/insults). Violations get deleted, the author timed out 10 min, and it's logged to the channel you pick. |
| `/whitelist [channel]` | Toggles a channel in/out of the automod whitelist - run it once to exempt a channel (nothing gets deleted/timed out there), run it again on the same channel to remove the exemption. |
| `-$help` | Lists all of the above. |

**Note on `/giveaway-create`:** your original spec listed both a `time` and a `duration-until-finished` parameter — since those describe the same thing (when the giveaway ends), I merged them into one `duration` option (e.g. `10m`, `1h`, `2d`, `1d12h`). Let me know if you actually meant something else by `time` (like a delayed start) and I'll add it back as a separate option.

## A note on data persistence

The bot stores honeypot channels, anti-spam/automod settings, and active giveaways in small JSON files under `/data`. This works great as long as the host keeps your files between restarts. **Some free hosts wipe the disk on every redeploy** — if that happens to you, those settings/giveaways would reset and you'd need to re-run the setup commands. If that becomes a problem, the fix is swapping `src/utils/storage.js` for a real database (e.g. a free MongoDB Atlas cluster or a Postgres instance) — ask me and I can do that.

## 4. Free 24/7 hosting (so it doesn't need to run on your PC)

A few genuinely free-tier options, roughly from "most reliable" to "easiest to set up":

- **Oracle Cloud "Always Free" VM** — a real ARM-based virtual machine that never sleeps and stays free indefinitely. Best uptime of the free options, but setup is the most involved (you're managing a Linux server: SSH in, install Node.js, run the bot with `pm2` or a `systemd` service so it restarts automatically). Worth it if you want something that will actually stay up long-term.
- **Fly.io** — free small VMs, works for a lightweight bot like this one. Requires a credit card on file even for the free allowance (no charge if you stay within it).
- **Railway** — very easy Git-based deploys, but its free tier is a small monthly credit rather than unlimited — a bot this size typically fits, but keep an eye on usage.
- **Render** — has a free tier for background workers; note free web services on Render sleep after inactivity, so if you use Render pick the "Background Worker" service type (not "Web Service") so it isn't put to sleep for having no incoming HTTP traffic.

Beyond these well-known providers, there are also several small dedicated "free Discord bot hosting" sites. I'd treat those with some caution since you're handing your bot token to a third party you may not be able to verify — if you go that route, use a host with a real reputation/reviews, and reset your bot token immediately if you ever stop using them.

Whichever you pick, the deployment steps are basically:
1. Push this folder to a GitHub repo (or upload it directly, depending on the host).
2. Set `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `ADMIN_ROLE_NAME` as environment variables in the host's dashboard (don't upload your `.env` file itself if the repo is public).
3. Set the start command to `npm install && npm run deploy && npm start` (or run `npm run deploy` once separately — you only need to re-run it when you change a command's options).

## Security reminder

Treat `DISCORD_TOKEN` like a password: anyone with it fully controls your bot. Don't post it in chat, screenshots, or a public GitHub repo. If it ever leaks, reset it immediately in the Developer Portal (Bot → Reset Token) and update it wherever you've deployed.
