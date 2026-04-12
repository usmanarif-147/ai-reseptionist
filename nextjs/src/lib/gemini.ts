import { GoogleGenAI } from '@google/genai'

export function createGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}
