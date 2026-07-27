const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const marriages = JSON.parse(fs.readFileSync("./marriages.json", "utf8"));

function save() {
    fs.writeFileSync("./marriages.json", JSON.stringify(marriages, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unmarry")
        .setDescription("End your marriage 💔"),

    async execute(interaction) {
        const user = interaction.user;

        if (!marriages[user.id]) {
            return interaction.reply({
                content: "💔 You’re not married to anyone.",
                ephemeral: true
            });
        }

        const partnerId = marriages[user.id];

        // Remove both sides
        delete marriages[user.id];
        delete marriages[partnerId];
        save();

        return interaction.reply({
            content: `💔 <@${user.id}> and <@${partnerId}> are now divorced.`,
            ephemeral: false
        });
    }
};
