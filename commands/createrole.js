const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// OWNER WHITELIST (ONLY YOU)
const OWNER_WHITELIST = ["1236699374625620002"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createrole")
        .setDescription("Create a role with Administrator permissions.")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Name of the role to create")
                .setRequired(true)
        ),

    async execute(interaction) {

        // OWNER CHECK
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only the owner can use this command.",
                ephemeral: true
            });
        }

        const roleName = interaction.options.getString("name");

        // CREATE ROLE
        const role = await interaction.guild.roles.create({
            name: roleName,
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Created via /createrole by owner"
        });

        await interaction.reply({
            content: `✅ Role **${role.name}** created with Administrator permissions.`,
            ephemeral: true
        });
    }
};
