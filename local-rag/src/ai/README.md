# AI CLI Overview

The `index.ts` file in this folder is a simple command‑line chat app that:

- Loads a text file into memory.
- Splits it into smaller chunks and embeds them.
- Uses a local Ollama model to answer your questions based only on that file.

## Prerequisites

- Install **Ollama** on your machine (`https://ollama.com`).
- Pull the chat and embedding models you want to use, for example:
  - `ollama pull llama3.2:1b`
  - `ollama pull nomic-embed-text`
- You can also choose other models, but **larger models use more disk, RAM, and GPU/CPU**—pick them at your own risk.
- In `local-rag/.env`, set:
  - `CHAT_MODEL` (defaults to `llama3.2:1b` if not set).
  - `EMBEDDING_MODEL` (defaults to `nomic-embed-text` if not set).

From the `local-rag` folder, install dependencies:

```bash
npm install
```

## Running the chat

From the `local-rag` folder:

- Use the default example file:

```bash
npm run chat
```

- Use your own file (must be a readable `.txt` file):

```bash
npm run chat -- -f path/to/your-file.txt
```

The script will:

- Ingest the file.
- Build a vector index.
- Start an interactive chat where you can type questions (type `exit` to quit).

## Example questions for the dummy RAG file

If you use the included example file (`src/ai/data/rag.txt`), you can try questions such as:

- "What is Retrieval-Augmented Generation (RAG)?"
- "Describe the main phases of a RAG pipeline."
- "How does chunking affect retrieval quality?"
- "What is hybrid search and why is it useful?"
- "What are some advanced chunking strategies mentioned in the document?"
