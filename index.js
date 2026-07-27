// index.js
const {
  Client,
  GatewayIntentBits,
  Collection,
  PermissionsBitField,
  Partials,
  AuditLogEvent,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// OPENAI AI MODERATION
const OpenAI = require("openai");
const ai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
async function aiCheckMessage(text) {
  try {
    const result = await ai.moderations.create({ model: "omni-moderation-latest", input: text });
    return result.results[0];
  } catch (err) { console.log("AI moderation error:", err); return null; }
}

// OWNERS + ADMINS
const OWNER_WHITELIST = [process.env.OWNER_ID];
const ADMIN_WHITELIST = [];
global.ADMIN_WHITELIST = ADMIN_WHITELIST;

// small wait helper
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Ticket persistence files
const TICKET_COUNTER_FILE = path.join(__dirname, "ticketCounter.json");
const APPLY_COOLDOWN_FILE = path.join(__dirname, "applyCooldowns.json");
if (!fs.existsSync(TICKET_COUNTER_FILE)) fs.writeFileSync(TICKET_COUNTER_FILE, JSON.stringify({ last: 0 }, null, 2));
if (!fs.existsSync(APPLY_COOLDOWN_FILE)) fs.writeFileSync(APPLY_COOLDOWN_FILE, JSON.stringify({}, null, 2));

// In-memory active tickets map (userId -> channelId)
const activeTickets = new Map();

// Ticket helpers
function readTicketCounter() { try { return JSON.parse(fs.readFileSync(TICKET_COUNTER_FILE, "utf8")); } catch { return { last: 0 }; } }
function writeTicketCounter(obj) { try { fs.writeFileSync(TICKET_COUNTER_FILE, JSON.stringify(obj, null, 2)); } catch (e) { console.log("ticketCounter write error:", e); } }
function getNextTicketNumber() { const data = readTicketCounter(); data.last = (data.last || 0) + 1; writeTicketCounter(data); return data.last; }
function formatTicketName(num) { return `ticket-${String(num).padStart(3, "0")}`; }

const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
function readCooldowns() { try { return JSON.parse(fs.readFileSync(APPLY_COOLDOWN_FILE, "utf8")); } catch { return {}; } }
function writeCooldowns(obj) { try { fs.writeFileSync(APPLY_COOLDOWN_FILE, JSON.stringify(obj, null, 2)); } catch (e) { console.log("applyCooldowns write error:", e); } }
function isOnCooldown(userId) { const data = readCooldowns(); const ts = data[userId]; if (!ts) return false; if (Date.now() > ts) { delete data[userId]; writeCooldowns(data); return false; } return true; }
function setCooldown(userId) { const data = readCooldowns(); data[userId] = Date.now() + COOLDOWN_MS; writeCooldowns(data); }

// CLIENT
const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// LOAD COMMANDS
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  try { const command = require(`./commands/${file}`); client.commands.set(command.data.name, command); } catch (err) { console.error(`❌ Failed to load command ${file}:`, err); }
}

// TIME PARSER
function parseTime(input) {
  const match = input.match(/(\d+)([a-zA-Z]+)/);
  if (!match) return null;
  const value = parseInt(match[1]); const unit = match[2].toLowerCase();
  const multipliers = { s:1000, m:60000, h:3600000, d:86400000, w:604800000, mo:2592000000, y:31536000000 };
  return multipliers[unit] ? value * multipliers[unit] : null;
}

// AUTO-SETUP MINIMUM
async function ensureServerSetup(guild) {
  let adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
  if (!adminLogs) {
    await guild.channels.create({ name: "admin-logs", type: ChannelType.GuildText, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }] }).catch(() => {});
  }
  let quarantineRole = guild.roles.cache.find(r => r.name === "quarantine");
  if (!quarantineRole) {
    await guild.roles.create({ name: "quarantine", permissions: [] }).catch(() => {});
  }
}

// READY
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try { if (process.env.BOT_NAME) { await client.user.setUsername(process.env.BOT_NAME); console.log(`✅ Bot username updated to ${process.env.BOT_NAME}`); } } catch (err) { console.error("⚠️ Failed to change username:", err); }
  client.user.setActivity("bot-admin system active", { type: 4 });
  for (const guild of client.guilds.cache.values()) { await ensureServerSetup(guild); }
});

// SLASH COMMANDS
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try { await command.execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST); } catch (err) { console.error(`❌ Error executing ${interaction.commandName}:`, err); if (!interaction.replied) interaction.reply({ content: "❌ Command failed internally.", ephemeral: true }).catch(() => {}); }
});

// DELETE LOGGING
client.on("messageDelete", async msg => {
  if (!msg.guild) return;
  const adminLogs = msg.guild.channels.cache.find(c => c.name === "admin-logs");
  if (!adminLogs) return;
  adminLogs.send(`🗑️ **Message Deleted**\n**Author:** ${msg.author?.tag}\n**Channel:** ${msg.channel}\n**Content:** ${msg.content || "*No text*"}`).catch(() => {});
});

// AI MOD COOLDOWN
let lastModerationTime = 0;
const moderationCooldown = 500;

// MESSAGE HANDLER
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guild = message.guild;
  const quarantineRole = guild.roles.cache.find(r => r.name === "quarantine");
  const isOwner = OWNER_WHITELIST.includes(message.author.id);
  const isAdmin = ADMIN_WHITELIST.includes(message.author.id);

  // AI AUTOMOD
  const now = Date.now();
  if (now - lastModerationTime >= moderationCooldown) {
    lastModerationTime = now;
    const result = await aiCheckMessage(message.content);
    if (result && result.flagged) {
      await message.delete().catch(() => {});
      const adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
      if (adminLogs) adminLogs.send(`⚠️ **AI Auto-Mod Triggered**\nUser: **${message.author.tag}**\nCategories: ${Object.keys(result.categories).filter(c => result.categories[c]).join(", ")}`).catch(() => {});
      if (quarantineRole) {
        await message.member.roles.remove(message.member.roles.cache.filter(r => r.id !== guild.id)).catch(() => {});
        await message.member.roles.add(quarantineRole).catch(() => {});
      }
      return;
    }
  }

  // COMMAND ABUSE → QUARANTINE
  if (message.content.startsWith("/") && !isOwner) {
    if (quarantineRole) {
      await message.member.roles.remove(message.member.roles.cache.filter(r => r.id !== guild.id)).catch(() => {});
      await message.member.roles.add(quarantineRole).catch(() => {});
    }
    const adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
    if (adminLogs) adminLogs.send(`⚠️ **${message.author.tag}** attempted to use a command and was quarantined.`).catch(() => {});
    return message.reply("🚫 You are not allowed to use commands. You have been quarantined.").catch(() => {});
  }

  // REPLY-BASED TIMEOUT
  if (message.reference && message.mentions.users.has(client.user.id)) {
    if (!isOwner && !isAdmin) return;
    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
    if (!repliedMessage) return message.reply("❌ I can't fetch the message you replied to.").catch(() => {});
    const target = repliedMessage.member;
    if (!target) return message.reply("❌ That user is not in the server.").catch(() => {});
    const content = message.content.replace(`<@${client.user.id}>`, "").trim();
    const timeInput = content.split(" ")[0];
    if (!timeInput) return message.reply("❌ You must include a time (e.g. `10m`, `3h`, `2d`).").catch(() => {});
    const duration = parseTime(timeInput);
    if (!duration) return message.reply("❌ Invalid time format.").catch(() => {});
    if (duration > 2419200000) return message.reply("❌ Max timeout is **28 days**.").catch(() => {});
    try { await target.timeout(duration, `Timeout by ${message.author.tag}`); return message.reply(`🔨 Muted **${target.user.tag}** for **${timeInput}**`).catch(() => {}); } catch (err) { console.error(err); return message.reply("❌ Failed to timeout user.").catch(() => {}); }
  }

  // NORMAL PING
  if (message.mentions.users.has(client.user.id)) {
    if (isOwner) return message.reply({ content: "yes master, how can I be of service", allowedMentions: { repliedUser: false } }).catch(() => {});
    if (isAdmin) return message.reply({ content: "yes admin, what do you need", allowedMentions: { repliedUser: false } }).catch(() => {});
    return message.reply({ content: "only my owners and admins can ping me loser imagine not bieng admin or owner.", allowedMentions: { repliedUser: false } }).catch(() => {});
  }
});

// ===== INSTANT VERIFY + TICKETS (buttons) =====

// Give new members the unverified role on join
client.on("guildMemberAdd", async member => {
  try {
    const guild = member.guild;
    const unverifiedRole = guild.roles.cache.find(r => r.name === "unverified");
    if (!unverifiedRole) return;
    if (!member.roles.cache.has(unverifiedRole.id)) await member.roles.add(unverifiedRole).catch(() => {});
  } catch (err) { console.log("guildMemberAdd handler error:", err); }
});

// Button interactions: verify, apply, accept, deny, close
client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isButton()) return;

    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return interaction.reply({ content: "This action must be used in the server.", ephemeral: true }).catch(() => {});

    // Resolve roles and channels
    const whitelistRole = guild.roles.cache.find(r => r.name === "whitelist");
    const memberRole = guild.roles.cache.find(r => r.name === "member");
    const unverifiedRole = guild.roles.cache.find(r => r.name === "unverified");
    const quarantineRole = guild.roles.cache.find(r => r.name === "quarantine");
    const ticketHelper = guild.roles.cache.find(r => r.name === "ticket-helper");
    const staffTeam = guild.roles.cache.find(r => r.name === "staff team");
    const trialMod = guild.roles.cache.find(r => r.name === "trial mod");
    const mod = guild.roles.cache.find(r => r.name === "moderator");
    const jrMod = guild.roles.cache.find(r => r.name === "jr moderator");
    const headMod = guild.roles.cache.find(r => r.name === "head mod");
    const adminLogs = guild.channels.cache.find(c => c.name === "admin-logs" && c.type === ChannelType.GuildText);

    // VERIFY
    if (interaction.customId === "verify_button") {
      if (whitelistRole && member.roles.cache.has(whitelistRole.id)) return interaction.reply({ content: "✅ You are already whitelisted.", ephemeral: true }).catch(() => {});
      if (memberRole && member.roles.cache.has(memberRole.id)) return interaction.reply({ content: "✅ You are already verified.", ephemeral: true }).catch(() => {});
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) await member.roles.remove(unverifiedRole.id).catch(() => {});
      if (memberRole) await member.roles.add(memberRole.id).catch(() => {});
      return interaction.reply({ content: "🎉 You are now verified and have full access.", ephemeral: true }).catch(() => {});
    }

    // APPLY FOR TRIAL MOD (create ticket)
    if (interaction.customId === "trialmod_apply") {
      if (quarantineRole && member.roles.cache.has(quarantineRole.id)) return interaction.reply({ content: "❌ You are quarantined and cannot open applications.", ephemeral: true }).catch(() => {});
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) return interaction.reply({ content: "❌ Please verify first.", ephemeral: true }).catch(() => {});
      if (isOnCooldown(member.id)) return interaction.reply({ content: "❌ You are on cooldown and cannot apply again yet. Try later.", ephemeral: true }).catch(() => {});
      if (activeTickets.has(member.id)) return interaction.reply({ content: `❌ You already have an open application: <#${activeTickets.get(member.id)}>`, ephemeral: true }).catch(() => {});

      // Ensure Applications category
      let applicationsCategory = guild.channels.cache.find(c => c.name === "Applications" && c.type === ChannelType.GuildCategory);
      if (!applicationsCategory) { applicationsCategory = await guild.channels.create({ name: "Applications", type: ChannelType.GuildCategory }).catch(() => null); await wait(200); }

      // Ticket numbering
      const ticketNum = getNextTicketNumber();
      const ticketBase = formatTicketName(ticketNum);
      const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 10) || "user";
      const channelName = `${ticketBase}-${safeName}`;

      // Permission overwrites
      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ];
      if (ticketHelper) overwrites.push({ id: ticketHelper.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (staffTeam) overwrites.push({ id: staffTeam.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (trialMod) overwrites.push({ id: trialMod.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (mod) overwrites.push({ id: mod.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (jrMod) overwrites.push({ id: jrMod.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (headMod) overwrites.push({ id: headMod.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (whitelistRole) overwrites.push({ id: whitelistRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

      const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: applicationsCategory ? applicationsCategory.id : undefined, permissionOverwrites: overwrites }).catch(err => { console.log("ticket channel create error:", err); return null; });
      if (!channel) return interaction.reply({ content: "❌ Could not create ticket channel. Try again later.", ephemeral: true }).catch(() => {});

      // Mark active ticket
      activeTickets.set(member.id, channel.id);

      // Buttons: Accept, Deny, Close
      const acceptButton = new ButtonBuilder().setCustomId("accept_ticket").setLabel("Accept Ticket").setStyle(ButtonStyle.Success);
      const denyButton = new ButtonBuilder().setCustomId("deny_ticket").setLabel("Deny Ticket").setStyle(ButtonStyle.Danger);
      const closeButton = new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Secondary);
      const actionRow = new ActionRowBuilder().addComponents(acceptButton, denyButton, closeButton);

      // Header + questions
      if (ticketHelper) await channel.send(`<@&${ticketHelper.id}> New application **${ticketBase}** opened by <@${member.id}>.`).catch(() => {});
      else await channel.send(`New application **${ticketBase}** opened by <@${member.id}>.`).catch(() => {});

      await channel.send({
        content:
          `📝 **Application ID:** **${ticketBase}**\n\n` +
          `1️⃣ Why do you want to be Trial Mod?\n` +
          `2️⃣ How active are you daily?\n` +
          `3️⃣ Have you moderated before?\n` +
          `4️⃣ Why should we trust you?\n` +
          `5️⃣ What would you do if someone breaks rules?\n\n` +
          `Staff: use **Accept Ticket** to grant Trial Mod, **Deny Ticket** to reject and block reapply for 2 weeks. Close when done.`,
        components: [actionRow]
      }).catch(() => {});

      await interaction.reply({ content: `📩 Your application channel has been created: ${channel}`, ephemeral: true }).catch(() => {});
      return;
    }

    // ACCEPT TICKET
    if (interaction.customId === "accept_ticket") {
      const allowed = ["ticket-helper", "staff team", "jr moderator", "moderator", "head mod", "whitelist"];
      const isStaff = interaction.member.roles.cache.some(r => allowed.includes(r.name));
      if (!isStaff) return interaction.reply({ content: "❌ You don't have permission to accept this ticket.", ephemeral: true }).catch(() => {});
      const channel = interaction.channel;
      const applicantId = channel.permissionOverwrites.cache.find(po => po.type === "member" && po.allow?.has?.(PermissionFlagsBits.ViewChannel))?.id;
      const applicant = applicantId ? await guild.members.fetch(applicantId).catch(() => null) : null;
      const trialRole = guild.roles.cache.find(r => r.name === "trial mod");
      if (trialRole && applicant && !applicant.roles.cache.has(trialRole.id)) await applicant.roles.add(trialRole.id).catch(() => {});
      if (adminLogs) adminLogs.send(`✅ Application accepted in ${channel.name} by ${interaction.user.tag}`).catch(() => {});
      if (applicant) applicant.send(`🎉 Your application (${channel.name}) was accepted by ${interaction.user.tag}. You have been given the Trial Mod role.`).catch(() => {});
      if (applicant) activeTickets.delete(applicant.id);
      await interaction.reply({ content: "✅ Applicant accepted. Closing ticket...", ephemeral: true }).catch(() => {});
      await wait(300);
      await channel.delete().catch(() => {});
      return;
    }

    // DENY TICKET
    if (interaction.customId === "deny_ticket") {
      const allowed = ["ticket-helper", "staff team", "jr moderator", "moderator", "head mod", "whitelist"];
      const isStaff = interaction.member.roles.cache.some(r => allowed.includes(r.name));
      if (!isStaff) return interaction.reply({ content: "❌ You don't have permission to deny this ticket.", ephemeral: true }).catch(() => {});
      const channel = interaction.channel;
      const applicantId = channel.permissionOverwrites.cache.find(po => po.type === "member" && po.allow?.has?.(PermissionFlagsBits.ViewChannel))?.id;
      const applicant = applicantId ? await guild.members.fetch(applicantId).catch(() => null) : null;
      if (applicant) { setCooldown(applicant.id); activeTickets.delete(applicant.id); applicant.send(`❌ Your application (${channel.name}) was denied by ${interaction.user.tag}. You cannot reapply for 2 weeks.`).catch(() => {}); }
      if (adminLogs) adminLogs.send(`❌ Application denied in ${channel.name} by ${interaction.user.tag}`).catch(() => {});
      await interaction.reply({ content: "❌ Applicant denied. Closing ticket and applying 2-week cooldown.", ephemeral: true }).catch(() => {});
      await wait(300);
      await channel.delete().catch(() => {});
      return;
    }

    // CLOSE TICKET (manual)
    if (interaction.customId === "close_ticket") {
      const channel = interaction.channel;
      const allowedRoles = ["ticket-helper", "staff team", "trial mod", "moderator", "jr moderator", "head mod", "whitelist"];
      const hasPermission = interaction.member.roles.cache.some(r => allowedRoles.includes(r.name));
      if (!hasPermission) return interaction.reply({ content: "❌ You don't have permission to close this ticket.", ephemeral: true }).catch(() => {});
      const applicantId = channel.permissionOverwrites.cache.find(po => po.type === "member" && po.allow?.has?.(PermissionFlagsBits.ViewChannel))?.id;
      if (applicantId) activeTickets.delete(applicantId);
      if (adminLogs) adminLogs.send(`📁 Ticket closed by ${interaction.user.tag} (${channel.name})`).catch(() => {});
      await interaction.reply({ content: "🗑️ Closing ticket...", ephemeral: true }).catch(() => {});
      await wait(300);
      await channel.delete().catch(err => { console.log("Failed to delete ticket channel:", err); });
      return;
    }

  } catch (err) {
    console.log("interactionCreate handler error:", err);
    try { if (interaction && !interaction.replied) await interaction.reply({ content: "An error occurred while processing that action.", ephemeral: true }).catch(() => {}); } catch {}
  }
});

// WHITELIST PROTECTION
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const guild = newMember.guild;
  const whitelistRole = guild.roles.cache.find(r => r.name === "whitelist");
  const quarantineRole = guild.roles.cache.find(r => r.name === "quarantine");
  const adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
  if (!whitelistRole || !quarantineRole || !adminLogs) return;
  const hadWhitelist = oldMember.roles.cache.has(whitelistRole.id);
  const hasWhitelist = newMember.roles.cache.has(whitelistRole.id);
  if (!hadWhitelist && hasWhitelist) {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first?.();
    if (!entry) return;
    const executor = entry.executor;
    if (!executor) return;
    if (OWNER_WHITELIST.includes(executor.id)) return;
    const executorMember = await guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;
    await newMember.roles.remove(whitelistRole.id).catch(() => {});
    await executorMember.roles.add(quarantineRole.id).catch(() => {});
    adminLogs.send(`⚠️ Unauthorized whitelist grant.\nTarget: ${newMember.user.tag}\nExecutor: ${executor.tag} → QUARANTINED`).catch(() => {});
  }
});

// QUARANTINE ANTI-TAMPER
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const guild = newMember.guild;
  const quarantineRole = guild.roles.cache.find(r => r.name === "quarantine");
  const whitelistRole = guild.roles.cache.find(r => r.name === "whitelist");
  const adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
  if (!quarantineRole || !adminLogs) return;
  const hadQuarantine = oldMember.roles.cache.has(quarantineRole.id);
  const hasQuarantine = newMember.roles.cache.has(quarantineRole.id);
  if (hadQuarantine && !hasQuarantine) {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first?.();
    if (!entry) return;
    const executor = entry.executor;
    const executorMember = await guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;
    if (OWNER_WHITELIST.includes(executor.id)) return;
    if (whitelistRole && executorMember.roles.cache.has(whitelistRole.id)) return;
    await executorMember.roles.add(quarantineRole.id).catch(() => {});
    await newMember.roles.add(quarantineRole.id).catch(() => {});
    adminLogs.send(`🚨 Unauthorized quarantine removal.\nTarget: ${newMember.user.tag}\nExecutor: ${executor.tag} → QUARANTINED`).catch(() => {});
  }
});

client.login(process.env.TOKEN);
module.exports = client;
