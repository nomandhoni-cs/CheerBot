const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const { MongoClient } = require("mongodb");

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// MongoDB setup
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;
let db;

// Connect to MongoDB
MongoClient.connect(mongoUri)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  })
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

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

async function updateEncouragements(encouragingMessage) {
  await db
    .collection("encouragements")
    .insertOne({ message: encouragingMessage });
}

async function deleteEncouragement(index) {
  const encouragements = await db.collection("encouragements").find().toArray();
  if (encouragements.length > index) {
    await db
      .collection("encouragements")
      .deleteOne({ _id: encouragements[index]._id });
  }
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content;

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
    const encouragingMessage = msg.split("++new ", 1)[1];
    await updateEncouragements(encouragingMessage);
    await message.channel.send("New encouraging message added.");
  }

  if (msg.startsWith("--del")) {
    const index = parseInt(msg.split("--del", 1)[1]);
    await deleteEncouragement(index);
    const encouragements = await db
      .collection("encouragements")
      .find()
      .toArray();
    await message.channel.send(
      JSON.stringify(encouragements.map((e) => e.message))
    );
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
    const value = msg.split("//responding ", 1)[1].toLowerCase() === "true";
    await db
      .collection("settings")
      .updateOne({ key: "responding" }, { $set: { value } }, { upsert: true });
    await message.channel.send(`Responding is ${value ? "on" : "off"}.`);
  }
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);

// Export the handler for Netlify Functions
exports.handler = async (event, context) => {
  // This is where you'd handle HTTP requests if needed
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Bot is running" }),
  };
};
