const {
    Client,
    GatewayIntentBits,
    Collection,
    PermissionsBitField
} = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// OWNER WHITELIST (full control)
const OWNER_WHITELIST = [
    "1236699374625620002", // you
    "963992516598837339" // wiliam 
];

// ADMIN WHITELIST (bot-admins) — FIXED
const ADMIN_WHITELIST = [];
global.ADMIN_WHITELIST = ADMIN_WHITELIST;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// LOAD COMMANDS
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// AUTO-SETUP
async function ensureServerSetup(guild) {
    let imageRole = guild.roles.cache.find(r => r.name === "image-perms");
    if (!imageRole) {
        imageRole = await guild.roles.create({
            name: "image-perms",
            permissions: []
        });
    }

    for (const channel of guild.channels.cache.values()) {
        try {
            await channel.permissionOverwrites.edit(imageRole.id, {
                AttachFiles: true
            });
        } catch (err) {
            console.log(`Failed to update channel ${channel.name}`);
        }
    }

    let adminLogs = guild.channels.cache.find(c => c.name === "admin-logs");
    if (!adminLogs) {
        await guild.channels.create({
            name: "admin-logs",
            type: 0,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });
    }
}

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("bot-admin system active", { type: 4 });

    for (const guild of client.guilds.cache.values()) {
        await ensureServerSetup(guild);
    }
});

// SLASH COMMAND HANDLER
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, OWNER_WHITELIST, ADMIN_WHITELIST);
    } catch (err) {
        console.error(`Error executing ${interaction.commandName}:`, err);
        if (!interaction.replied) {
            interaction.reply({ content: "❌ Error executing command.", ephemeral: true });
        }
    }
});

// DELETE LOGGING
client.on("messageDelete", async msg => {
    if (!msg.guild) return;

    const adminLogs = msg.guild.channels.cache.find(c => c.name === "admin-logs");
    if (!adminLogs) return;

    adminLogs.send(
        `🗑️ **Message Deleted**  
**Author:** ${msg.author?.tag}  
**Channel:** ${msg.channel}  
**Content:** ${msg.content || "*No text*"}`
    );
});

// PING SYSTEM
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const isOwner = OWNER_WHITELIST.includes(message.author.id);
    const isAdmin = ADMIN_WHITELIST.includes(message.author.id);

    if (message.mentions.users.has(client.user.id)) {
        if (isOwner) return message.reply("yes master, how can I be of service @everyone else is a peasant");
        if (isAdmin) return message.reply("yes admin, what do you need");
        return message.reply("only my masters can ping me (<@1236699374625620002> <@963992516598837339> @everyone else is a peasant)");
    }
});
client.login(process.env.TOKEN);
module.exports = client;
