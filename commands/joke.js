const { SlashCommandBuilder } = require("discord.js");
const jokes = require("../config/JOKES.js"); // adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Get a joke")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("Choose a joke type")
                .addChoices(
                    { name: "Daily", value: "daily" },
                    { name: "Dark", value: "dark" },
                    { name: "Nerdy", value: "nerdy" },
                    { name: "Draga‑themed", value: "draga" }
                )
        ),

    async execute(interaction) {
        const type = interaction.options.getString("type");

        const categories = ["daily", "dark", "nerdy", "draga"];
        const chosenType = type || categories[Math.floor(Math.random() * categories.length)];

        const selectedList = jokes[chosenType];
        const joke = selectedList[Math.floor(Math.random() * selectedList.length)];

        await interaction.reply(joke);
    }
};
