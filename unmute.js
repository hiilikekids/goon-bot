const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout (mute) from a user.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to unmute')
                .setRequired(true)
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

        try {
            await target.timeout(null);

            await interaction.reply({
                content: `🔊 **${target.user.tag}** has been unmuted.`,
                ephemeral: false
            });
        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: `❌ I couldn't unmute that user. My role might be below theirs.`,
                ephemeral: true
            });
        }
    }
};
