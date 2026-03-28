const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout (mute) a user for a chosen duration.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('How many minutes to mute the user')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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

        const duration = minutes * 60 * 1000;

        try {
            await target.timeout(duration, reason);

            await interaction.reply({
                content: `🔇 **${target.user.tag}** has been muted for **${minutes} minutes**.\nReason: ${reason}`,
                ephemeral: false
            });
        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: `❌ I couldn't mute that user. My role might be below theirs.`,
                ephemeral: true
            });
        }
    }
};
