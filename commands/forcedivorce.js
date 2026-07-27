const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const marriages = JSON.parse(fs.readFileSync("./marriages.json", "utf8"));

function save() {
    fs.writeFileSync("./marriages.json", JSON.stringify(marriages, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forcedivorce")
        .setDescription("OWNER ONLY — force two users to divorce 💔")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("One of the married users")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST) {
        const executor = interaction.user;

        // OWNER CHECK
        if (!OWNER_WHITELIST.includes(executor.id)) {
            return interaction.reply({
                content: "❌ Only the **owner** can use this command.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");

        if (!marriages[user.id]) {
            return interaction.reply({
                content: `❌ <@${user.id}> is **not married**.`,
                ephemeral: true
            });
        }

        const partnerId = marriages[user.id];

        // Remove both sides
        delete marriages[user.id];
        delete marriages[partnerId];
        save();

        return interaction.reply({
            content: `💔 **FORCED DIVORCE**  
<@${user.id}> and <@${partnerId}> have been divorced by the owner.`,
            ephemeral: false
        });
    }
};
