const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)
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

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || "No reason provided";

        // DM the user
        try {
            await target.send(
                `⚠️ You have been warned in **${interaction.guild.name}**.\nReason: ${reason}`
            );
        } catch {
            console.log("DM failed — user has DMs off.");
        }

        // Reply to whoever used the command (owner or admin)
        return interaction.reply({
            content: `⚠️ **${target.tag}** has been warned.\nReason: ${reason}`,
            ephemeral: false
        });
    }
};
