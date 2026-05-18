const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nukeall')
        .setDescription('Delete all channels except the one this command is used in.'),

    async execute(interaction) {

        // ⭐ ONLY IBRAHIM CAN USE THIS
        if (interaction.user.id !== "1236699374625620002") {
            return interaction.reply({
                content: "❌ You are not my master.",
                ephemeral: true
            });
        }

        const safeChannel = interaction.channel;
        const guild = interaction.guild;

        await interaction.deferReply({ ephemeral: true });

        try {
            guild.channels.cache.forEach(channel => {
                if (channel.id !== safeChannel.id) {
                    channel.delete("Nuke all command executed");
                }
            });

            await safeChannel.send("am i a good boy master 👉👈");

            await interaction.editReply("Nuke completed.");

        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Failed to nuke all channels.");
        }
    }
};
