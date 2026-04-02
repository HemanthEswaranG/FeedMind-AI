// integrationHandler.js
export async function resolveWithRAG(userQuery) {
  // 1. Turn query into a vector
  const queryEmbedding = await getEmbedding(userQuery);
  
  // 2. Perform Vector Search (Supabase RPC)
  const { data: matches } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5
  });

  const context = matches.map(m => m.content).join("\n");

  // 3. Generate Final AI Response with Context
  const response = await hf.chatCompletion({
    model: "meta-llama/Llama-3.2-3B-Instruct",
    messages: [
      { role: "system", content: "Use the provided context to answer the question." },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${userQuery}` }
    ],
    temperature: 0.1,
    max_tokens: 300
  });

  return response.choices[0].message.content;
}