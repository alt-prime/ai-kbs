const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const ai = new GoogleGenAI({ apiKey });

async function main() {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'test',
    });
    console.log("Success:", response.embeddings[0].values.slice(0, 5));
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
