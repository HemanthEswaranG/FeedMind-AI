// controllers/aiController.js
import { InferenceClient } from "@huggingface/inference";
import { createClient } from '@supabase/supabase-js';

const hf = new InferenceClient(process.env.HF_TOKEN);
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Generates numerical embeddings for text chunks.
 */
export async function getEmbedding(text) {
  const response = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: text,
  });
  // Ensure we return a flat array
  return Array.isArray(response[0]) ? response[0] : response;
}