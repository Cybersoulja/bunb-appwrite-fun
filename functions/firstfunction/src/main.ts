
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { Client as AppwriteClient } from 'node-appwrite';

// Initialize Discord client
const discord = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Appwrite client
const appwrite = new AppwriteClient()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

// Discord bot events
discord.once('ready', () => {
  console.log(`Logged in as ${discord.user?.tag}!`);
});

discord.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

// Appwrite function handler
export default async ({ req, res, log, error }: any) => {
  if (req.method === "GET") {
    return res.send("Bot is running!");
  }

  return res.json({
    status: "running",
    discordStatus: discord.isReady() ? "connected" : "disconnected",
  });
};

// Start Discord bot
discord.login(process.env.DISCORD_TOKEN);
