const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user, optionally for a temporary duration.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Temporary kick duration in minutes (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const requiredRoleId = '1474765692267008114'; // Head administrator

        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                content: `❌ You must have the **Head administrator** role to use this command.`,
                ephemeral: true
            });
        }

        const target = interaction.options.getMember('target');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // DM the user before kicking
        try {
            await target.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}${minutes ? `\nDuration: ${minutes} minutes` : ''}`);
        } catch (err) {
            console.log('Could not DM user.');
        }

        // If no duration → simple kick
        if (!minutes) {
            try {
                await target.kick(reason);

                return interaction.reply({
                    content: `👢 **${target.user.tag}** has been kicked.\nReason: ${reason}`,
                    ephemeral: false
                });
            } catch (error) {
                console.error(error);
                return interaction.reply({
                    content: `❌ I couldn't kick that user.`,
                    ephemeral: true
                });
            }
        }

        // If duration is provided → temp kick (kick + timed ban)
        const durationMs = minutes * 60 * 1000;

        try {
            // Kick the user
            await target.kick(reason);

            // Ban them so they can't rejoin until timer ends
            await interaction.guild.members.ban(target.id, { reason: `Temp kick for ${minutes} minutes` });

            interaction.reply({
                content: `⏳ **${target.user.tag}** has been temporarily kicked for **${minutes} minutes**.\nReason: ${reason}`,
                ephemeral: false
            });

            // Unban after duration
            setTimeout(async () => {
                try {
                    await interaction.guild.members.unban(target.id, 'Temp kick expired');
                } catch (err) {
                    console.log('Failed to unban after temp kick.');
                }
            }, durationMs);

        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: `❌ I couldn't temp-kick that user.`,
                ephemeral: true
            });
        }
    }
};
