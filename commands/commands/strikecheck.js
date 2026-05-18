const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strikecheck')
        .setDescription('Check how many strikes a user has (admin only)')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('User to check')
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

if (
    !OWNER_WHITELIST.includes(interaction.user.id) &&
    !ADMIN_WHITELIST.includes(interaction.user.id)
) {
    return interaction.reply({
        content: "❌ You are not allowed to use this command.",
        ephemeral: true
    });
}

        const target = interaction.options.getUser('target');

        global.adminStrikes ??= {};
        const strikes = global.adminStrikes[target.id] ?? 0;

        return interaction.reply({
            content: `📊 **${target.tag}** currently has **${strikes} strike(s)**.`,
            ephemeral: false
        });
    }
};
