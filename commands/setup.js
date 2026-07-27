// setup.js
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Force setup of bot channels and roles (Owner Only)"),

  async execute(interaction, OWNER_WHITELIST) {
    if (!OWNER_WHITELIST || !OWNER_WHITELIST.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ Only my master can use /setup.", ephemeral: true });
    }

    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: "❌ Use this in a server.", ephemeral: true });

    async function ensureRole(name, options = {}) {
      let r = guild.roles.cache.find(x => x.name === name);
      if (!r) {
        r = await guild.roles.create(Object.assign({ name }, options)).catch(() => null);
        await wait(200);
      }
      return r;
    }

    // Create roles
    const goonBotRole = await ensureRole("goon-bot", { permissions: [] });
    const whitelistRole = await ensureRole("whitelist", { permissions: [] });
    const quarantineRole = await ensureRole("quarantine", { permissions: [] });
    const headMod = await ensureRole("head mod", {
      permissions: [
        PermissionsBitField.Flags.ManageRoles,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.ViewAuditLog,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ModerateMembers
      ]
    });
    const ticketHelper = await ensureRole("ticket-helper", {
      permissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages]
    });
    const jrMod = await ensureRole("jr moderator", {
      permissions: [
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.ViewAuditLog,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ModerateMembers
      ]
    });
    const mod = await ensureRole("moderator", {
      permissions: [
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ViewAuditLog,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ModerateMembers
      ]
    });
    const trialMod = await ensureRole("trial mod", {
      permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ModerateMembers]
    });
    const staffTeam = await ensureRole("staff team", { permissions: [] });
    const memberRole = await ensureRole("member", { permissions: [] });
    const unverifiedRole = await ensureRole("unverified", { permissions: [] });
    const imageRole = await ensureRole("image-perms", { permissions: [] });

    // Safe role ordering (top -> bottom)
    try {
      if (goonBotRole && whitelistRole) { await whitelistRole.setPosition(goonBotRole.position - 1).catch(() => {}); await wait(200); }
      if (quarantineRole && whitelistRole) { await quarantineRole.setPosition(whitelistRole.position - 1).catch(() => {}); await wait(200); }
      if (headMod && quarantineRole) { await headMod.setPosition(quarantineRole.position - 1).catch(() => {}); await wait(200); }
      if (ticketHelper && headMod) { await ticketHelper.setPosition(headMod.position - 1).catch(() => {}); await wait(200); }
      if (jrMod && ticketHelper) { await jrMod.setPosition(ticketHelper.position - 1).catch(() => {}); await wait(200); }
      if (mod && jrMod) { await mod.setPosition(jrMod.position - 1).catch(() => {}); await wait(200); }
      if (trialMod && mod) { await trialMod.setPosition(mod.position - 1).catch(() => {}); await wait(200); }
      if (staffTeam && trialMod) { await staffTeam.setPosition(trialMod.position - 1).catch(() => {}); await wait(200); }
      if (memberRole && staffTeam) { await memberRole.setPosition(staffTeam.position - 1).catch(() => {}); await wait(200); }
      if (unverifiedRole && memberRole) { await unverifiedRole.setPosition(memberRole.position - 1).catch(() => {}); await wait(200); }
    } catch (err) {
      console.log("Role positioning error (safe to ignore):", err);
    }

    // Ensure Applications category
    let applicationsCategory = guild.channels.cache.find(c => c.name === "Applications" && c.type === ChannelType.GuildCategory);
    if (!applicationsCategory) {
      applicationsCategory = await guild.channels.create({ name: "Applications", type: ChannelType.GuildCategory }).catch(() => null);
      await wait(200);
    }

    // Admin channels
    let adminLogs = guild.channels.cache.find(c => c.name === "admin-logs" && c.type === ChannelType.GuildText);
    if (!adminLogs) {
      adminLogs = await guild.channels.create({
        name: "admin-logs",
        type: ChannelType.GuildText,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
      }).catch(() => null);
      await wait(200);
    }

    let adminAlerts = guild.channels.cache.find(c => c.name === "admin-alerts" && c.type === ChannelType.GuildText);
    if (!adminAlerts) {
      adminAlerts = await guild.channels.create({
        name: "admin-alerts",
        type: ChannelType.GuildText,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
      }).catch(() => null);
      await wait(200);
    }

    // Verify channel + button
    let verifyChannel = guild.channels.cache.find(c => c.name === "verify" && c.type === ChannelType.GuildText);
    if (!verifyChannel) {
      verifyChannel = await guild.channels.create({
        name: "verify",
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: unverifiedRole.id, allow: [PermissionFlagsBits.ViewChannel] },
          { id: memberRole.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: whitelistRole.id, deny: [PermissionFlagsBits.ViewChannel] }
        ]
      }).catch(() => null);
      await wait(200);
    }

    const verifyButton = new ButtonBuilder().setCustomId("verify_button").setLabel("Verify").setStyle(ButtonStyle.Success);
    const verifyRow = new ActionRowBuilder().addComponents(verifyButton);

    try {
      const fetched = await verifyChannel.messages.fetch({ limit: 5 }).catch(() => null);
      const hasVerify = fetched && fetched.some(m => m.components && m.components.length && m.components[0].components.some(c => c.customId === "verify_button"));
      if (!hasVerify) {
        await verifyChannel.send({ content: "🔐 **Click the button below to verify and gain access to the server.**", components: [verifyRow] }).catch(() => {});
        await wait(200);
      }
    } catch {}

    // Apply-trial-mod channel inside Applications
    let applyChannel = guild.channels.cache.find(c => c.name === "apply-trial-mod" && c.type === ChannelType.GuildText);
    if (!applyChannel) {
      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: staffTeam.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: trialMod.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: mod.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: jrMod.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: headMod.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: whitelistRole.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: quarantineRole.id, deny: [PermissionFlagsBits.ViewChannel] }
      ];

      applyChannel = await guild.channels.create({
        name: "apply-trial-mod",
        type: ChannelType.GuildText,
        parent: applicationsCategory ? applicationsCategory.id : undefined,
        permissionOverwrites: overwrites
      }).catch(() => null);
      await wait(200);
    }

    const ticketButton = new ButtonBuilder().setCustomId("trialmod_apply").setLabel("Apply for Trial Mod").setStyle(ButtonStyle.Primary);
    const ticketRow = new ActionRowBuilder().addComponents(ticketButton);

    try {
      const fetchedA = await applyChannel.messages.fetch({ limit: 5 }).catch(() => null);
      const hasApply = fetchedA && fetchedA.some(m => m.components && m.components.length && m.components[0].components.some(c => c.customId === "trialmod_apply"));
      if (!hasApply) {
        await applyChannel.send({ content: "📝 **Click below to apply for Trial Moderator.**", components: [ticketRow] }).catch(() => {});
        await wait(200);
      }
    } catch {}

    return interaction.reply({ content: "✅ Setup complete. Roles, channels, buttons and role order are now configured.", ephemeral: true });
  }
};
