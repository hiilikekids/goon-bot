const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const marriages = JSON.parse(fs.readFileSync("./marriages.json", "utf8"));

function save() {
    fs.writeFileSync("./marriages.json", JSON.stringify(marriages, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("marry")
        .setDescription("Propose marriage to another user 💍")
        .addUserOption(option =>
            option
                .setName("partner")
                .setDescription("The user you want to marry")
                .setRequired(true)
        ),

    async execute(interaction) {
        const proposer = interaction.user;
        const partner = interaction.options.getUser("partner");

        // Already married?
        if (marriages[proposer.id]) {
            return interaction.reply({
                content: `💔 You’re already married to <@${marriages[proposer.id]}>.`,
                ephemeral: true
            });
        }

        if (marriages[partner.id]) {
            return interaction.reply({
                content: `💔 <@${partner.id}> is already married to <@${marriages[partner.id]}>.`,
                ephemeral: true
            });
        }

        if (partner.id === proposer.id) {
            return interaction.reply({
                content: "😅 You can’t marry yourself.",
                ephemeral: true
            });
        }

        // Save marriage
        marriages[proposer.id] = partner.id;
        marriages[partner.id] = proposer.id;
        save();

        return interaction.reply({
            content: `💞 <@${proposer.id}> and <@${partner.id}> are now married! 🎉`,
            ephemeral: false
        });
    }
};
