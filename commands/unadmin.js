const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unadmin")
        .setDescription("Remove a user from the bot admin whitelist")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to remove from bot-admin")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

        // Only owners can use this command
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only the bot owner can use /unadmin.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser("user");

        if (!ADMIN_WHITELIST.includes(target.id)) {
            return interaction.reply({
                content: `⚠️ ${target.tag} is not a bot-admin.`,
                ephemeral: true
            });
        }

        // Remove from whitelist
        const index = ADMIN_WHITELIST.indexOf(target.id);
        ADMIN_WHITELIST.splice(index, 1);

        return interaction.reply({
            content: `🗑️ **${target.tag}** has been removed from the bot-admin whitelist.`,
            ephemeral: false
        });
    }
};
