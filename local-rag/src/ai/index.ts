import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs";
import * as readline from "readline";

// config — override via environment variables
const config = {
  chatModel: process.env.CHAT_MODEL ?? "llama3.2:1b",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
};

// ingestion
// TODO: Currently only plain .txt files are supported. Add format-specific loaders for other file types
//       (e.g. PDFs, Markdown, DOCX). LangChain provides loaders for these out of the box via @langchain/community.
//       Each loader parses the file into a Document with pageContent and metadata before chunking.
const loadDocs = (filePath: string): Document[] => {
  const text = fs.readFileSync(filePath, "utf-8");
  return [new Document({ pageContent: text, metadata: { source: filePath } })];
};

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 400;

// TODO: The current fixed-size chunking (500 chars, 250 overlap) is a starting point but not optimal.
//       Experiment with alternatives:
//       - Sentence-based splitting: keeps sentences intact for better semantic coherence.
//       - Semantic chunking: splits based on embedding similarity between sentences (higher quality, slower).
//       - Parent-child chunking: index small chunks for precise retrieval, but pass the larger parent to the LLM for full context.
//       Retrieval quality is highly sensitive to chunk size — test with real queries when tuning.
const splitDocs = async (docs: Document[]): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  return splitter.splitDocuments(docs);
};

// TODO: MemoryVectorStore holds embeddings in-process memory — it's wiped on every restart and doesn't scale.
//       Move to a persistent vector store before going to production:
//       - ChromaDB: easy to self-host locally, good for development and small-scale use.
//       - FAISS: fast in-memory search with optional disk persistence, great for larger datasets.
//       - Pinecone / Qdrant: managed cloud options for production scale.
//       With persistence, we can skip re-embedding documents that haven't changed (see ingestDoc TODO below).
const embedChunks = async (chunks: Document[]): Promise<MemoryVectorStore> => {
  const embeddings = new OllamaEmbeddings({ model: config.embeddingModel, baseUrl: config.ollamaBaseUrl });
  return MemoryVectorStore.fromDocuments(chunks, embeddings);
};

// TODO: Every app start re-embeds all documents from scratch, which is slow and wasteful.
//       Once we have a persistent vector store, track which files have already been ingested
//       (e.g. by storing a hash of the file content). Only re-embed a file if it has changed.
//       This will also enable watching a folder and incrementally ingesting new files as they're added.
const ingestDoc = async (path: string) => {
  try {
    console.log(`\n[Ingestion] Starting: ${path}`);
    const docs = loadDocs(path);
    console.log(`[Ingestion] Loaded ${docs.length} document(s)`);
    const chunks = await splitDocs(docs);
    console.log(`[Ingestion] Split into ${chunks.length} chunks (size=${CHUNK_SIZE}, overlap=${CHUNK_OVERLAP})`);
    console.log(`[Ingestion] Embedding chunks with ${config.embeddingModel}...`);
    const store = await embedChunks(chunks);
    console.log(`[Ingestion] Done. Vector store ready.\n`);
    return store;
  } catch (e) {
    console.error("[Ingestion] Error:", e);
  }
}

// retrieval
// TODO: Pure vector (semantic) search can miss exact keyword matches (e.g. names, IDs, specific terms).
//       Improve retrieval by combining two approaches (hybrid search):
//       - Vector search: finds semantically similar chunks (what we do now).
//       - Keyword search (BM25): finds exact term matches.
//       Merge results using Reciprocal Rank Fusion (RRF) before passing to the LLM.
//       Additionally, consider adding a reranker (e.g. a cross-encoder model) as a second pass
//       to re-score the top retrieved chunks for more accurate context selection.
const buildContext = async (question: string, store: MemoryVectorStore, top_k: number = 8): Promise<string> => {
  const results = await store.similaritySearch(question, top_k);
  return results.map((d) => d.pageContent).join("\n\n");
};

// chat
// TODO: Currently the app waits for the full LLM response before printing anything, which feels slow.
//       Switch to streaming so tokens are printed as they are generated.
//       ChatOllama supports streaming via .stream() instead of .invoke().
//       This makes the UX feel much more responsive, especially for longer answers.
const askLLM = async (question: string, context: string): Promise<string> => {
  const model = new ChatOllama({
    model: config.chatModel,
    baseUrl: config.ollamaBaseUrl,
  });

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful assistant answering questions about a single document.

    Use the context below as your only knowledge source:
    - Prefer to give a direct, helpful answer using only the information in the context.
    - You may rephrase, summarize, and connect ideas, but do not invent facts that are not supported by the context.
    - If the context contains information that is even partially relevant, use it to answer as best you can.
    - Only say "I don't know based on the provided documents." if the context is clearly unrelated to the question.

    Context:
    {context}

    Question: {question}

    Answer:
  `);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ context, question });
  return response.content as string;
};

// main app
async function main() {
  const args = process.argv.slice(2);
  const flagIndex = args.findIndex((arg) => arg === "-f" || arg === "--file");
  const docPath =
    (flagIndex !== -1 && args[flagIndex + 1]) || "src/ai/data/rag.txt";
  console.log(`[Config] Using document: ${docPath}`);

  const store = await ingestDoc(docPath);
  if (!store) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const getQuestion = (prompt: string) => new Promise<string>((resolve) => rl.question(prompt, resolve));

  console.log('Chat started. Type "exit" to quit.\n');

  while (true) {
    const question = await getQuestion("You: ");
    if (question.trim() === "exit") break;

    console.log(`[Retrieval] Searching top 5 chunks...`);
    const context = await buildContext(question, store);
    console.log(`[Retrieval] Context built (${context.length} chars):\n---\n${context}\n---`);
    console.log(`[LLM] Generating response with ${config.chatModel}...`);
    const response = await askLLM(question, context);
    console.log(`\nAssistant: ${response}\n`);
  }

  rl.close();
}

main();
