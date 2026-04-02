// utils/textExtractor.js
import pdfParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function processDocument(buffer) {
  // 1. Extract raw text from PDF
  const data = await pdfParse(buffer);
  const text = data.text.replace(/\n\n+/g, "\n").trim();

  // 2. Split text into manageable chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  return await splitter.splitText(text);
}

// services/ingestor.js
export async function ingestDocument(fileBuffer, fileName) {
  const chunks = await processDocument(fileBuffer);

  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    
    await supabase.from("document_chunks").insert({
      content: chunk,
      embedding: embedding,
      metadata: { source: fileName }
    });
  }
}