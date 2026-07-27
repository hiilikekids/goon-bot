const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("givestrike")
        .setDescription("Give a strike to a user (Owner Only)")
        .addUserOption(option =>
            option
                .setName("target")
                .setDescription("User to give a strike to")
                .setRequired(true)
        ),

    async execute(interaction, OWNER_WHITELIST) {

        // OWNER CHECK
        if (!OWNER_WHITELIST.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Only the **Owner** can use this command.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser("target");
        const member = interaction.guild.members.cache.get(target.id);

        global.adminStrikes ??= {};
        global.adminStrikes[target.id] ??= 0;

        // ADD STRIKE
        global.adminStrikes[target.id]++;

        const strikes = global.adminStrikes[target.id];

        // DM THE USER ABOUT THE STRIKE
        try {
            await target.send(
                `⚠️ You have received **1 strike** in **${interaction.guild.name}**.\nYou now have **${strikes} strike(s)**.`
            );
        } catch (err) {
            // User has DMs closed — ignore
        }

        // NORMAL STRIKE MESSAGE
        let replyMessage = `⚠️ **Strike added!**  
**${target.tag}** now has **${strikes} strike(s)**.`;

        // AUTO PUNISH AT 3 STRIKES
        if (strikes >= 3) {
            try {
                // Timeout for 10 minutes
                await member.timeout(10 * 60 * 1000, "Reached 3 strikes");

                // DM the user about punishment
                try {
                    await target.send(
                        `⛔ You have reached **3 strikes** in **${interaction.guild.name}**.\nYou have been **timed out for 10 minutes**.`
                    );
                } catch (err) {}

                replyMessage += `\n\n⛔ **Auto‑Punish Activated:**  
**${target.tag}** has been **timed out for 10 minutes** for reaching **3 strikes**.`;

                // Reset strikes after punishment
                global.adminStrikes[target.id] = 0;

            } catch (err) {
                console.error(err);
                replyMessage += `\n\n❌ Auto‑punish failed. I may not have permission to timeout this user.`;
            }
        }

        return interaction.reply({
            content: replyMessage,
            ephemeral: false
        });
    }
};
