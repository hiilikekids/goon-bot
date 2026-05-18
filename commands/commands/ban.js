const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user (Owner/Admin Only)")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for ban")
                .setRequired(false)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "No reason provided";

        // OWNER or ADMIN only
        if (
            !OWNER_WHITELIST.includes(interaction.user.id) &&
            !ADMIN_WHITELIST.includes(interaction.user.id)
        ) {
            return interaction.reply({
                content: "❌ You are not allowed to use /ban.",
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "❌ That user is not in the server.",
                ephemeral: true
            });
        }

        await member.ban({ reason });

        return interaction.reply({
            content: `🔨 **${user.tag}** has been banned.\nReason: ${reason}`,
            ephemeral: false
        });
    }
};
