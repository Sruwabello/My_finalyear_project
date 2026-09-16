import { GoogleGenAI } from "@google/genai";
import { ATBU_KNOWLEDGE_BASE, KBChunk, ATBU_SESSION_YEAR } from "../data/atbuKnowledgeBase.js";

// Structure to hold embedded chunks
export interface EmbeddedChunk {
  chunk: KBChunk;
  vector: number[];
}

let aiClient: GoogleGenAI | null = null;
let embeddedChunksCache: EmbeddedChunk[] = [];
let isRAGInitializing = false;
let isRAGReady = false;
let isFallbackMode = false;

// Initialize GoogleGenAI client lazily to avoid startup crashes if key is missing
export function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI client:", e);
      }
    }
  }
  return aiClient;
}

/**
 * Normalizes a vector (makes its length = 1) for fast cosine similarity via dot product.
 */
function normalize(vec: number[]): number[] {
  const sq = vec.reduce((sum, val) => sum + val * val, 0);
  if (sq === 0) return vec;
  const length = Math.sqrt(sq);
  return vec.map((val) => val / length);
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * In-memory fallback token overlap vector generator.
 * This runs if Gemini embedding fails or is unconfigured, ensuring the app is always functional.
 */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", 
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cant", "cannot", 
  "co", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", 
  "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", 
  "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", 
  "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", 
  "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", 
  "our", "ours", "ourselves", "out", "over", "own", "same", "shant", "she", "shed", "shell", "shes", "should", 
  "shouldnt", "so", "some", "such", "than", "that", "thats", "the", "their", "theirs", "them", "themselves", 
  "then", "there", "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", 
  "to", "too", "under", "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", 
  "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", 
  "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
]);

// Build a vocabulary of unique terms from the knowledge base for the fallback space
let fallbackVocabulary: string[] = [];

function buildFallbackVocabulary() {
  if (fallbackVocabulary.length > 0) return;
  const terms = new Set<string>();
  ATBU_KNOWLEDGE_BASE.forEach((chunk) => {
    // Add keywords directly with high weight
    chunk.metadata.keywords.forEach((kw) => terms.add(kw.toLowerCase()));
    
    // Add words from content and title
    const text = `${chunk.title} ${chunk.content}`.toLowerCase();
    const words = text.match(/[a-z0-9]+/g) || [];
    words.forEach((w) => {
      if (w.length > 2 && !STOP_WORDS.has(w)) {
        terms.add(w);
      }
    });
  });
  fallbackVocabulary = Array.from(terms);
}

/**
 * Generates a fallback TF-IDF style vector based on the fallback vocabulary.
 */
function generateFallbackVector(text: string): number[] {
  buildFallbackVocabulary();
  const vector = new Array(fallbackVocabulary.length).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  
  // Count term frequencies
  const tf: Record<string, number> = {};
  words.forEach((w) => {
    tf[w] = (tf[w] || 0) + 1;
  });

  fallbackVocabulary.forEach((term, index) => {
    if (tf[term]) {
      // Add more weight if the term appears multiple times
      // and apply a simple logarithmic weight
      vector[index] = 1 + Math.log(tf[term]);
    }
  });

  return normalize(vector);
}

/**
 * Initializes the RAG database, embedding all chunks in the knowledge base.
 */
export async function initializeRAG(): Promise<boolean> {
  if (isRAGReady) return true;
  if (isRAGInitializing) return false;

  isRAGInitializing = true;
  console.log("Initializing ATBU Registration Assistant RAG Database...");

  const client = getGeminiClient();
  if (!client) {
    console.warn("No Gemini API Key found or client failed. Falling back to TF-IDF vector space.");
    initializeFallbackRAG();
    return true;
  }

  try {
    const embedded: EmbeddedChunk[] = [];
    for (const chunk of ATBU_KNOWLEDGE_BASE) {
      console.log(`Embedding chunk: ${chunk.title}...`);
      const response = await client.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: `${chunk.category} - ${chunk.title}: ${chunk.content}`,
      });

      const res = response as any;
      const values = res.embedding?.values || res.embeddings?.[0]?.values;
      if (values) {
        embedded.push({
          chunk,
          vector: values,
        });
      } else {
        throw new Error(`Invalid embedding response for: ${chunk.title}`);
      }
    }

    embeddedChunksCache = embedded;
    isFallbackMode = false;
    isRAGReady = true;
    isRAGInitializing = false;
    console.log("RAG Database successfully initialized with Gemini embeddings!");
    return true;
  } catch (error) {
    console.error("Error creating Gemini embeddings, falling back to local TF-IDF matching:", error);
    initializeFallbackRAG();
    return true;
  }
}

function initializeFallbackRAG() {
  buildFallbackVocabulary();
  embeddedChunksCache = ATBU_KNOWLEDGE_BASE.map((chunk) => {
    const textToEmbed = `${chunk.category} ${chunk.title} ${chunk.content} ${chunk.metadata.keywords.join(" ")}`;
    return {
      chunk,
      vector: generateFallbackVector(textToEmbed),
    };
  });
  isFallbackMode = true;
  isRAGReady = true;
  isRAGInitializing = false;
  console.log("RAG Database successfully initialized in Fallback TF-IDF Mode!");
}

/**
 * Searches the knowledge base for relevant chunks.
 */
export async function searchKnowledgeBase(
  query: string,
  topK = 5
): Promise<{ chunk: KBChunk; score: number }[]> {
  if (!isRAGReady) {
    await initializeRAG();
  }

  let queryVector: number[];

  if (isFallbackMode || !getGeminiClient()) {
    queryVector = generateFallbackVector(query);
  } else {
    try {
      const client = getGeminiClient();
      if (!client) throw new Error("Client unavailable");
      
      const response = await client.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: query,
      });

      const res = response as any;
      const values = res.embedding?.values || res.embeddings?.[0]?.values;
      if (values) {
        queryVector = values;
      } else {
        throw new Error("Invalid query embedding response");
      }
    } catch (e) {
      console.warn("Failed to generate query embedding from Gemini. Using fallback cosine matching.");
      queryVector = generateFallbackVector(query);
      
      // Temporarily use fallback vectors for matching if we have cache, otherwise rebuild
      if (embeddedChunksCache.length > 0 && embeddedChunksCache[0].vector.length !== queryVector.length) {
        console.warn("Re-indexing cache to fallback space.");
        initializeFallbackRAG();
      }
    }
  }

  // Calculate scores
  const results = embeddedChunksCache.map((item) => {
    const score = cosineSimilarity(queryVector, item.vector);
    return {
      chunk: item.chunk,
      score,
    };
  });

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Return top K chunks
  return results.slice(0, topK);
}

/**
 * Returns RAG engine configuration and readiness state
 */
export function getRAGStatus() {
  return {
    isReady: isRAGReady,
    isInitializing: isRAGInitializing,
    isFallbackMode,
    totalChunks: ATBU_KNOWLEDGE_BASE.length,
    loadedChunks: embeddedChunksCache.length,
    sessionYear: ATBU_SESSION_YEAR,
  };
}
