const { SlashCommandBuilder } = require('discord.js');

const OWNER_WHITELIST = ["1236699374625620002"];

async function logAction(guild, message) {
    const logChannel = guild.channels.cache.find(c => c.name === "admin-logs");
    if (!logChannel) return;
    logChannel.send(message);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unquarantine')
        .setDescription('Owner only — removes quarantine role.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User to unquarantine')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guild = interaction.guild;
        const target = interaction.options.getMember('target');

        const quarantineRole = guild.roles.cache.find(
            r => r.name.toLowerCase() === "quarantine"
        );

        if (!quarantineRole) {
            return interaction.reply({
                content: "❌ Role **quarantine** not found. Run /setup first.",
                ephemeral: true
            });
        }

        // ❗ Unauthorized user → THEY get quarantined
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            await interaction.member.roles.remove(
                interaction.member.roles.cache.filter(r => r.id !== guild.id)
            );
            await interaction.member.roles.add(quarantineRole);

            await logAction(guild, `⚠️ **${interaction.user.tag}** attempted to use /unquarantine and was quarantined.`);

            return interaction.reply({
                content: "🚫 You tried to use an owner command. You have been quarantined.",
                ephemeral: false
            });
        }

        // Owner logic
        try {
            if (target.roles.cache.has(quarantineRole.id)) {
                await target.roles.remove(quarantineRole);
            }

            await logAction(guild, `🔓 **${target.user.tag}** was unquarantined by **${interaction.user.tag}**`);

            return interaction.reply({
                content: `✅ **${target.user.tag}** has been unquarantined.`,
                ephemeral: false
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: "❌ Failed to unquarantine user.",
                ephemeral: true
            });
        }
    }
};
