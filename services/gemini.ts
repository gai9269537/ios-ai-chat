
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelName, Message } from "../types";

const API_KEY = process.env.API_KEY || '';

export const getGeminiResponse = async (
  prompt: string,
  modelName: ModelName,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  onChunk: (chunk: string) => void
) => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `You are a helpful and polite AI assistant running the ${modelName} model. You are communicating via a mobile chat app that mimics an iPhone interface. Keep your responses concise and friendly, using formatting like bullet points or bold text when appropriate for readability on small screens.`,
      }
    });

    const streamResponse = await chat.sendMessageStream({ message: prompt });
    
    let fullText = "";
    for await (const chunk of streamResponse) {
      const text = (chunk as GenerateContentResponse).text;
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
  if (!API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const chatContent = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Please provide a concise, clear summary of the following conversation in 3-4 bullet points. Focus on the main topics discussed and any conclusions reached.\n\nCONVERSATION:\n${chatContent}`,
    config: {
      systemInstruction: "You are a professional summarizer. Provide high-quality, readable summaries for mobile users.",
    }
  });

  return response.text || "Could not generate summary.";
};
