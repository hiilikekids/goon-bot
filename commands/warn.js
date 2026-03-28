const { SlashCommandBuilder } = require('discord.js');
const checkRole = require('../utils/checkRole');
const { DM_MESSAGES } = require('../config/messages');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Record a warning for a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)
        ),

    async execute(interaction) {
        const HEAD_ADMIN_ROLE = "1474765692267008114";

        if (!checkRole(interaction.member, HEAD_ADMIN_ROLE)) {
            return interaction.reply({
                content: "You must be a **Head administrator** to use this command.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        // DM using messages.js
        try {
            await user.send(`${DM_MESSAGES.warn}\nReason: ${reason}`);
        } catch (err) {
            console.log("DM failed — user has DMs closed.");
        }

        await interaction.reply({
            content: `Warning recorded for **${user.tag}**.\nReason: ${reason}`,
            ephemeral: true
        });
    }
};
