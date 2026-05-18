const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetstrikes')
        .setDescription('Reset a user’s strikes (owner only)')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('User to reset strikes for')
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
        global.adminStrikes[target.id] = 0;

        return interaction.reply({
            content: `🔄 I have reset all strikes for **${target.tag}**, master.`,
            ephemeral: false
        });
    }
};
