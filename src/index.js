
import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;
dotenv.config();

app.get("/", (req, res) => {
  res.send("GeminiBot is running");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Web server listening on port ${port}`);
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN が .env に設定されていません。");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY が .env に設定されていません。");
}

const geminiModel = "gemini-3-flash-preview";
const jokeCommandName = "ジョーク";
const jokePrompt =
  "日本語で短い冗談を1つだけ作ってください。この冗談は、会話の掛け合いではなく、一文にしてください。説明は不要です。";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function generateGeminiText(prompt) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
  });

  return response.text ?? "返答を生成できませんでした。";
}

client.once(Events.ClientReady, async (readyClient) => {
  await readyClient.application.commands.set([
    {
      name: jokeCommandName,
      description: "短い冗談を返します",
    },
  ]);

  console.log(`${readyClient.user.tag} としてログインしました`);
  console.log(`/${jokeCommandName} コマンドを登録しました`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== jokeCommandName) return;

  try {
    await interaction.deferReply(); // 応答を遅延させることで、処理中であることを示す

    const text = await generateGeminiText(jokePrompt);
    await interaction.editReply(text.slice(0, 2000)); // 応答を編集して返す。Discordのメッセージは2000文字までなので超えた場合は切り捨てる。
  } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("エラーが発生しました。");
    } else {
      await interaction.reply("エラーが発生しました。");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
    