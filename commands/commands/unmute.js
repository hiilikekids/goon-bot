const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout (mute) from a user.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to unmute')
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

        // ⭐ OWNER or ADMIN only
        if (
            !OWNER_WHITELIST.includes(interaction.user.id) &&
            !ADMIN_WHITELIST.includes(interaction.user.id)
        ) {
            return interaction.reply({
                content: "❌ You are not allowed to use this command.",
                ephemeral: true
            });
        }

        const target = interaction.options.getMember('target');

        try {
            await target.timeout(null); // removes timeout instantly

            return interaction.reply({
                content: `🔊 **${target.user.tag}** has been unmuted.`,
                ephemeral: false
            });

        } catch (error) {
            console.error(error);

            return interaction.reply({
                content: `❌ I couldn't unmute that user.`,
                ephemeral: true
            });
        }
    }
};
