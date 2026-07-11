import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Jimp } from "jimp";
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("GeminiBot is running");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Web server listening on port ${port}`);
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN が設定されていません。");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY が設定されていません。");
}

const geminiModel = "gemini-3-flash-preview";
const jokeCommandName = "ジョーク";
const jokePrompt =
  "日本語で短い冗談を1つだけ作ってください。この冗談は、会話の掛け合いではなく、一文にしてください。説明は不要です。";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
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
    await interaction.deferReply();

    const text = await generateGeminiText(jokePrompt);
    await interaction.editReply(text.slice(0, 2000));
  } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("エラーが発生しました。");
    } else {
      await interaction.reply("エラーが発生しました。");
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.attachments.size === 0) return;

  for (const attachment of message.attachments.values()) {
    const isImage =
      attachment.contentType?.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp)$/i.test(attachment.name ?? "");

    if (!isImage) continue;

    try {
      const response = await fetch(attachment.url);

      if (!response.ok) {
        throw new Error(`画像取得失敗: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const image = await Jimp.read(buffer);
      const width = image.bitmap.width;
      const height = image.bitmap.height;

      await message.reply(
        `${attachment.name ?? "画像"} の画像サイズは **${width} × ${height}** ピクセルです。`,
      );
    } catch (error) {
      console.error("画像処理エラー:", error);
      await message.reply("画像の読み込みに失敗しました。");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);