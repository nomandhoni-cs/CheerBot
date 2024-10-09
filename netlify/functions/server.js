// src/index.js
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const { MongoClient } = require("mongodb");

// MongoDB setup
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;
let db;

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Define keywords and responses
const sadWords = [
  "sad",
  "depressed",
  "unhappy",
  "angry",
  "miserable",
  "depressing",
  "valo nei",
  "ajke amar mon valo nei",
  "vallage na",
  "valo lage na",
  "valo hoilo na",
  "kije kori",
];

const starterEncouragements = [
  "Cheer up!",
  "Hang in there.",
  "You are a great person!",
];

// Fetch a random quote
async function getQuote() {
  try {
    const response = await axios.get("https://zenquotes.io/api/random");
    const quote = `${response.data[0].q} -${response.data[0].a}`;
    return quote;
  } catch (error) {
    console.error("Error fetching quote:", error);
    return "Failed to fetch a quote.";
  }
}

// Update encouragements in DB
async function updateEncouragements(encouragingMessage) {
  await db
    .collection("encouragements")
    .insertOne({ message: encouragingMessage });
}

// Delete encouragement by index
async function deleteEncouragement(index) {
  const encouragements = await db.collection("encouragements").find().toArray();
  if (encouragements.length > index) {
    await db
      .collection("encouragements")
      .deleteOne({ _id: encouragements[index]._id });
  }
}

// Handle incoming messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg.startsWith("/cheer")) {
    const quote = await getQuote();
    await message.channel.send(quote);
  }

  const isResponding = await db
    .collection("settings")
    .findOne({ key: "responding" });
  if (isResponding && isResponding.value) {
    const dbEncouragements = await db
      .collection("encouragements")
      .find()
      .toArray();
    const options = [
      ...starterEncouragements,
      ...dbEncouragements.map((e) => e.message),
    ];

    if (sadWords.some((word) => msg.includes(word))) {
      await message.channel.send(
        options[Math.floor(Math.random() * options.length)]
      );
    }
  }

  if (msg.startsWith("++new")) {
    const encouragingMessage = msg.split("++new ", 2)[1];
    if (encouragingMessage) {
      await updateEncouragements(encouragingMessage);
      await message.channel.send("New encouraging message added.");
    } else {
      await message.channel.send("Please provide a message to add.");
    }
  }

  if (msg.startsWith("--del")) {
    const index = parseInt(msg.split("--del", 2)[1]);
    if (!isNaN(index)) {
      await deleteEncouragement(index);
      const encouragements = await db
        .collection("encouragements")
        .find()
        .toArray();
      await message.channel.send(
        JSON.stringify(encouragements.map((e) => e.message))
      );
    } else {
      await message.channel.send("Please provide a valid index to delete.");
    }
  }

  if (msg.startsWith("//list")) {
    const encouragements = await db
      .collection("encouragements")
      .find()
      .toArray();
    await message.channel.send(
      JSON.stringify(encouragements.map((e) => e.message))
    );
  }

  if (msg.startsWith("//responding")) {
    const value = msg.split("//responding ", 2)[1]?.toLowerCase() === "true";
    await db
      .collection("settings")
      .updateOne({ key: "responding" }, { $set: { value } }, { upsert: true });
    await message.channel.send(`Responding is ${value ? "on" : "off"}.`);
  }
});

// Connect to MongoDB and start the bot
async function startBot() {
  try {
    const mongoClient = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoClient.connect();
    console.log("Connected to MongoDB");
    db = mongoClient.db(dbName);

    client.once("ready", () => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("Failed to connect to MongoDB or Discord:", err);
    process.exit(1); // Exit if connection fails
  }
}

startBot();
