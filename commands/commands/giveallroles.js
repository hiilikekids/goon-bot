const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveallroles')
        .setDescription('Gives every possible role to a user (Owner Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to give all roles to')
                .setRequired(false)
        ),

    async execute(interaction) {
        const OWNER_ID = "1236699374625620002";

        // OWNER CHECK
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: "❌ Only my owner can use this command.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id);

        // Bot role position check
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);

        let added = 0;
        let skipped = 0;

        for (const role of interaction.guild.roles.cache.values()) {
            // Skip @everyone
            if (role.id === interaction.guild.id) continue;

            // Skip roles above bot
            if (role.position >= botMember.roles.highest.position) {
                skipped++;
                continue;
            }

            try {
                await member.roles.add(role);
                added++;
            } catch {
                skipped++;
            }
        }

        return interaction.reply({
            content: `✅ **Done.**  
Given roles: **${added}**  
Skipped (bot too low): **${skipped}**  
Target: <@${member.id}>`,
            ephemeral: true
        });
    }
};
