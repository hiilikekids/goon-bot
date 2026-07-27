const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unowner")
        .setDescription("Remove a user from the OWNER whitelist (Owner Only)")
        .addUserOption(option =>
            option
                .setName("target")
                .setDescription("User to remove from owner")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST) {

        // ONLY MAIN OWNER CAN USE THIS
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only the **main owner** can use this command.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser("target");

        // REMOVE FROM OWNER WHITELIST
        const index = OWNER_WHITELIST.indexOf(target.id);
        if (index === -1) {
            return interaction.reply({
                content: `❌ **${target.username}** is not an owner.`,
                ephemeral: false
            });
        }

        OWNER_WHITELIST.splice(index, 1);

        return interaction.reply({
            content: `@everyone **${interaction.user.username}** has removed **${target.username}** from OWNER.`,
            allowedMentions: { parse: ["everyone"] },
            ephemeral: false
        });
    }
};
