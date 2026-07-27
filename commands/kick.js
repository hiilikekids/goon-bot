const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a user (Owner/Admin Only)")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to kick")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST) {

        const user = interaction.options.getUser("user");

        // OWNER or ADMIN only
        if (
            !OWNER_WHITELIST.includes(interaction.user.id) &&
            !ADMIN_WHITELIST.includes(interaction.user.id)
        ) {
            return interaction.reply({
                content: "❌ You are not allowed to use /kick.",
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "❌ That user is not in the server.",
                ephemeral: true
            });
        }

        // DM the user (chaotic but safe)
        try {
            await user.send(
                `👢 You’ve been kicked from **${interaction.guild.name}**.\n` +
                `Reason: A moderator decided it was time for you to take a break.`
            );
        } catch {
            console.log("DM failed — user probably has DMs off.");
        }

        // Kick them
        await member.kick();

        return interaction.reply({
            content: `👢 **${user.tag}** has been kicked.`,
            ephemeral: false
        });
    }
};
