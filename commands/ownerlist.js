const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ownerlist")
        .setDescription("Show all users in the OWNER whitelist"),

    async execute(interaction, OWNER_WHITELIST) {

        if (OWNER_WHITELIST.length === 0) {
            return interaction.reply({
                content: "📭 There are **no owners** in the whitelist.",
                ephemeral: false
            });
        }

        const ownerTags = OWNER_WHITELIST
            .map(id => `<@${id}>`)
            .join("\n");

        return interaction.reply({
            content: `👑 **Current Owners:**\n${ownerTags}`,
            ephemeral: false
        });
    }
};
