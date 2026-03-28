const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
});

// ⭐ MESSAGE EVENT — Auto-Mod + Ban System ⭐
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const { swearWords, slurWords } = require("./badwords");

    // ========== INSTANT BAN FOR SLURS ==========
    if (slurWords.some(word => message.content.toLowerCase().includes(word))) {

        // DM the user
        try {
            await message.author.send(
                `You have been banned from ${message.guild.name} for using prohibited language.`
            );
        } catch (err) {
            console.log("DM failed — user has DMs closed.");
        }

        // Ban the user
        try {
            await message.guild.members.ban(message.author.id, {
                reason: "Used slur / homophobic / racist language"
            });
        } catch (err) {
            console.log("Ban failed:", err);
        }

        // Log it
        const logChannel = message.guild.channels.cache.get("1477323213934432306");
        if (logChannel) {
            logChannel.send(
                `🚫 **User Banned**  
**User:** ${message.author.tag}  
**Reason:** Slur / homophobic / racist language  
**Message:** "${message.content}"`
            );
        }

        return;
    }
});

client.login(process.env.TOKEN);
