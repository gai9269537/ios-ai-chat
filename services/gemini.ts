
import { GoogleGenAI } from "@google/genai";
import { ModelName, Message } from "../types";

// Note: We move the API Key logic to be more dynamic to support user-provided keys if necessary
let DYNAMIC_API_KEY = process.env.API_KEY || '';

export const setGeminiApiKey = (key: string) => {
  DYNAMIC_API_KEY = key;
};

export const getGeminiResponse = async (
  prompt: string,
  modelName: ModelName,
  history: any[] = [],
  onChunk: (chunk: string) => void
) => {
  if (!DYNAMIC_API_KEY) {
    throw new Error("API Key is missing. Please set your Gemini API Key in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: DYNAMIC_API_KEY });

  try {
    const chat = (ai as any).chats.create({
      model: modelName,
      config: {
        systemInstruction: "You are a professional AI assistant. Keep responses extremely concise and helpful for mobile users. Use bullet points. Maximum 200 words.",
      }
    });

    const streamResponse = await chat.sendMessageStream({ message: prompt });

    let fullText = "";
    for await (const chunk of streamResponse) {
      // Handle potential variation in chunk structure
      const text = chunk.text || (typeof chunk.text === 'function' ? chunk.text() : "");
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const summarizeChat = async (messages: Message[], modelName: ModelName): Promise<string> => {
  if (!DYNAMIC_API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: DYNAMIC_API_KEY });

  const chatContent = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

  const response = await (ai as any).models.generateContent({
    model: modelName,
    contents: `Summarize in 3 bullet points:\n\n${chatContent}`,
    config: {
      systemInstruction: "You are a professional summarizer. Be extremely brief.",
    }
  });

  return response.text || "Could not generate summary.";
};
