const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user (Owner/Admin Only)")
        .addStringOption(option =>
            option.setName("userid")
                .setDescription("ID of the user to unban")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

        const userId = interaction.options.getString("userid");

        // OWNER or ADMIN only
        if (
            !OWNER_WHITELIST.includes(interaction.user.id) &&
            !ADMIN_WHITELIST.includes(interaction.user.id)
        ) {
            return interaction.reply({
                content: "❌ You are not allowed to use /unban.",
                ephemeral: true
            });
        }

        try {
            await interaction.guild.members.unban(userId);
        } catch (err) {
            return interaction.reply({
                content: "❌ That user is not banned or the ID is invalid.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `♻️ User with ID **${userId}** has been unbanned.`,
            ephemeral: false
        });
    }
};
