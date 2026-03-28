const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { DM_MESSAGES } = require('../config/messages');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const requiredRoleId = '1474765692267008114';

        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                content: `❌ You must have the **Head administrator** role to use this command.`,
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        // ⭐ If no reason → use your custom permban message
        const dmMessage = reason
            ? `You have been banned from **${interaction.guild.name}**.\nReason: ${reason}`
            : DM_MESSAGES.permban;

        try {
            // ⭐ DM FIRST
            try {
                await target.send(dmMessage);
            } catch {
                console.log("DM failed — user has DMs disabled.");
            }

            // ⭐ THEN ban
            await interaction.guild.members.ban(target.id, { reason: reason || "No reason provided" });

            // Reply to admin
            await interaction.reply(
                `🔨 Banned **${target.tag}**.${reason ? ` Reason: ${reason}` : ""}`
            );

        } catch (error) {
            console.error(error);
            await interaction.reply(`❌ I couldn't ban that user.`);
        }
    }
};
