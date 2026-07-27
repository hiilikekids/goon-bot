const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveallroles')
        .setDescription('Gives every possible role to a user (Owner Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to give all roles to')
                .setRequired(false)
        ),

    async execute(interaction, OWNER_WHITELIST) {

        // OWNER CHECK
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only my owners can use this command.",
                ephemeral: true
            });
        }

        // KEEP INTERACTION ALIVE (fixes crash)
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.editReply("❌ I can't find that user in the server.");
        }

        const botMember = interaction.guild.members.me;

        let added = 0;
        let skipped = 0;

        for (const role of interaction.guild.roles.cache.values()) {

            if (role.id === interaction.guild.id) continue;
            if (role.position >= botMember.roles.highest.position) { skipped++; continue; }
            if (role.managed) { skipped++; continue; }

            try {
                await member.roles.add(role);
                added++;
            } catch {
                skipped++;
            }
        }

        return interaction.editReply(
            `✅ **Done.**  
Given roles: **${added}**  
Skipped: **${skipped}**  
Target: <@${member.id}>`
        );
    }
};
