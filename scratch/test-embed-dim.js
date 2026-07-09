const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const { embed } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

const google = createGoogleGenerativeAI({ apiKey });

async function main() {
  try {
    const res = await embed({
      model: google.textEmbeddingModel('gemini-embedding-2', {
        outputDimensionality: 768,
      }),
      value: "test",
    });
    console.log("gemini-embedding-2 (768) dimensions:", res.embedding.length);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
