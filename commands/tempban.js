const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to temporarily ban')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Ban duration in minutes')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the temporary ban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const requiredRoleId = '1474765692267008114';

        // Role check
        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                content: `❌ You must have the **Head administrator** role to use this command.`,
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const guild = interaction.guild;

        // Convert minutes → milliseconds
        const durationMs = duration * 60 * 1000;

        try {
            // ⭐ DM FIRST
            try {
                await target.send(
                    `⛔ You have been temporarily banned from **${guild.name}**.\n` +
                    `Duration: ${duration} minutes\nReason: ${reason}`
                );
            } catch {
                console.log("DM failed — user has DMs disabled.");
            }

            // ⭐ THEN ban
            await guild.members.ban(target.id, { reason });

            // Confirm to admin
            await interaction.reply(
                `⛔ Temporarily banned **${target.tag}** for **${duration} minutes**.\nReason: ${reason}`
            );

            // ⭐ Auto-unban after duration
            setTimeout(async () => {
                try {
                    await guild.members.unban(target.id, "Temporary ban expired");
                    console.log(`Unbanned ${target.tag} after tempban expired.`);
                } catch (err) {
                    console.log("Unban failed:", err);
                }
            }, durationMs);

        } catch (error) {
            console.error(error);
            await interaction.reply(`❌ I couldn't tempban that user.`);
        }
    }
};
