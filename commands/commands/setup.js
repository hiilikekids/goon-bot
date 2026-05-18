const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Force setup of bot channels and image-perms role (Owner Only)"),

    async execute(interaction, OWNER_WHITELIST) {

        // Only owners can use /setup
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only my master can use /setup.",
                ephemeral: true
            });
        }

        const guild = interaction.guild;

        // ⭐ Create image-perms role
        let imageRole = guild.roles.cache.find(r => r.name === "image-perms");
        if (!imageRole) {
            imageRole = await guild.roles.create({
                name: "image-perms",
                permissions: []
            });
        }

        // ⭐ Apply Attach Files permission to all channels
        for (const channel of guild.channels.cache.values()) {
            try {
                await channel.permissionOverwrites.edit(imageRole.id, {
                    AttachFiles: true
                });
            } catch (err) {
                console.log(`Failed to update channel ${channel.name}`);
            }
        }

        // ⭐ Create admin-logs (private)
        let adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
        if (!adminLogs) {
            adminLogs = await guild.channels.create({
                name: "admin-logs",
                type: 0,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
        }

        // ⭐ Create admin-alerts (private)
        let adminAlerts = guild.channels.cache.find(c => c.name === "admin-alerts");
        if (!adminAlerts) {
            adminAlerts = await guild.channels.create({
                name: "admin-alerts",
                type: 0,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
        }

        return interaction.reply({
            content:
                "✅ Setup complete.\n" +
                "• image-perms role created\n" +
                "• Attach Files applied to all channels\n" +
                "• admin-logs created\n" +
                "• admin-alerts created",
            ephemeral: true
        });
    }
};
