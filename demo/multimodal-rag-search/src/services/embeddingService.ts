import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-embedding-2-preview";

export async function getEmbedding(content: string | { data: string; mimeType: string }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const result = await ai.models.embedContent({
    model: MODEL_NAME,
    contents: [
      typeof content === 'string' 
        ? content 
        : { inlineData: { data: content.data, mimeType: content.mimeType } }
    ],
  });

  return result.embeddings[0].values;
}
