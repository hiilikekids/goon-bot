const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

async function deployCommands(client) {
  const commands = [];
  const files = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

  for (const file of files) {
    const cmd = require(`../commands/${file}`);
    commands.push(cmd.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Deploying slash commands...');

    // GLOBAL commands
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log('Global commands deployed.');
  } catch (err) {
    console.error(err);
  }
}

module.exports = { deployCommands };
