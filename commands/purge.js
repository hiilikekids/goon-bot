const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of messages from the channel.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (max 5000)')
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


        const amount = interaction.options.getInteger('amount');

        // ⭐ Max limit = 5000
        if (amount > 5000) {
            return interaction.reply({
                content: "❌ Master, I cannot purge more than **5000** messages at once.",
                ephemeral: true
            });
        }

        if (amount < 1) {
            return interaction.reply({
                content: "❌ Master, the amount must be at least **1**.",
                ephemeral: true
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);

            return interaction.reply({
                content: `🧹 yes master, I have purged **${deleted.size}** messages.`,
                ephemeral: false
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: "❌ I couldn't purge messages, master.",
                ephemeral: true
            });
        }
    }
};
