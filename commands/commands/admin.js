const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Add a user to the bot admin whitelist")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to make bot-admin")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {
        try {
            // Only owners can use this command
            if (!OWNER_WHITELIST.includes(interaction.user.id)) {
                return interaction.reply({
                    content: "❌ Only the bot owner can use /admin.",
                    ephemeral: true
                });
            }

            const target = interaction.options.getUser("user");

            if (ADMIN_WHITELIST.includes(target.id)) {
                return interaction.reply({
                    content: `⚠️ ${target.tag} is already a bot-admin.`,
                    ephemeral: true
                });
            }

            // FIXED: push to the actual whitelist
            ADMIN_WHITELIST.push(target.id);

            return interaction.reply({
                content: `✅ **${target.tag}** has been added to the bot-admin whitelist.`,
                ephemeral: false
            });
        } catch (err) {
            console.error("Error in /admin command:", err);
            return interaction.reply({
                content: "❌ Error executing /admin command.",
                ephemeral: true
            });
        }
    }
};
