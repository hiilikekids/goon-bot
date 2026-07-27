const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("owner")
        .setDescription("Add a user to the OWNER whitelist (Owner Only)")
        .addUserOption(option =>
            option
                .setName("target")
                .setDescription("User to make owner")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST) {

        // ONLY YOU CAN USE THIS
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only the **main owner** can use this command.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser("target");

        // ADD TO OWNER WHITELIST
        if (!OWNER_WHITELIST.includes(target.id)) {
            OWNER_WHITELIST.push(target.id);
        }

        // PUBLIC ANNOUNCEMENT
        return interaction.reply({
            content: `@everyone **${interaction.user.username}** has given **${target.username}** OWNER.`,
            allowedMentions: { parse: ["everyone"] },
            ephemeral: false
        });
    }
};
