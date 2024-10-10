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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  console.log(`Received message: "${message.content}"`); // Log every received message

  const msg = message.content.toLowerCase();

  // Fetch responding status
  const isRespondingDoc = await db
    .collection("settings")
    .findOne({ key: "responding" });
  const isResponding = isRespondingDoc ? isRespondingDoc.value : false;
  console.log(`Responding is ${isResponding}`); // Log the responding status

  if (isResponding) {
    // Fetch encouragement messages from the database
    const dbEncouragements = await db
      .collection("encouragements")
      .find()
      .toArray();
    const options = [
      ...starterEncouragements,
      ...dbEncouragements.map((e) => e.message),
    ];

    console.log("Encouragement options:", options); // Log available encouragement messages

    // Check if the message contains any sad words
    const hasSadWord = sadWords.some((word) => msg.includes(word));
    console.log(`Message contains sad word: ${hasSadWord}`); // Log if a sad word is detected

    if (hasSadWord) {
      if (options.length === 0) {
        console.log("No encouragement messages available to send."); // Log if no messages are available
        return;
      }

      // Select a random encouragement message
      const randomIndex = Math.floor(Math.random() * options.length);
      const response = options[randomIndex];
      console.log(`Selected encouragement message: "${response}"`); // Log the selected message

      // Attempt to send the message
      try {
        await message.channel.send(response);
        console.log("Encouragement message sent successfully."); // Confirm successful send
      } catch (error) {
        console.error("Error sending encouragement message:", error); // Log any errors during send
      }
    }
  }

  // Handle other commands (e.g., /cheer, ++new, etc.)
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
