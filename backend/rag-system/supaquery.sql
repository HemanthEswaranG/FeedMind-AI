-- Enable the pgvector extension
create extension if vector;

-- Create the table
create table document_chunks (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(384) -- Matches MiniLM-L6-v2 dimensions
);

-- Create the search function
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;