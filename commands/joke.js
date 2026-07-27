const { SlashCommandBuilder } = require("discord.js");
const jokes = require("../config/jokes.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Get a joke")
        .addStringOption(option =>
            option.setName("type")
                .setDescription("Choose a joke type")
                .addChoices(
                    { name: "Daily", value: "daily" },
                    { name: "Dark", value: "dark" },
                    { name: "Nerdy", value: "nerdy" },
                    { name: "Draga-themed", value: "draga" },
                    { name: "Chaotic", value: "chaotic" }
                )
        ),

    async execute(interaction) {

        const type = interaction.options.getString("type");
        const categories = ["daily", "dark", "nerdy", "draga", "chaotic"];

        // If no type chosen → random category
        const chosenType = type || categories[Math.floor(Math.random() * categories.length)];

        const selectedList = jokes[chosenType];
        const joke = selectedList[Math.floor(Math.random() * selectedList.length)];

        await interaction.reply(joke);
    }
};
