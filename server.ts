import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { 
  searchKnowledgeBase, 
  getRAGStatus, 
  initializeRAG,
  getGeminiClient 
} from "./src/lib/rag.js";
import { ATBU_KNOWLEDGE_BASE } from "./src/data/atbuKnowledgeBase.js";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());

  // Log incoming requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Try to initialize RAG in the background
  initializeRAG().catch((err) => {
    console.error("Failed to initialize RAG on server start:", err);
  });

  // --- API ROUTES FIRST ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // RAG status
  app.get("/api/status", (req, res) => {
    res.json(getRAGStatus());
  });

  // Retrieve full knowledge base for FAQ sidebar / cards
  app.get("/api/kb", (req, res) => {
    res.json(ATBU_KNOWLEDGE_BASE);
  });

  // Trigger manual re-index of RAG (for demonstration or debug)
  app.post("/api/reindex", async (req, res) => {
    try {
      const success = await initializeRAG();
      res.json({ success, status: getRAGStatus() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to reindex" });
    }
  });

  // RAG Chat Endpoint (Streaming SSE)
  app.post("/api/chat", async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing or invalid message query." });
    }

    try {
      // 1. Search the RAG knowledge base for the top 5 chunks
      const topChunks = await searchKnowledgeBase(message, 5);
      
      // Determine if we actually found something helpful (simple score threshold for display)
      const relevantCitations = topChunks
        .filter((item) => item.score > 0.05)
        .map((item) => ({
          id: item.chunk.id,
          title: item.chunk.title,
          category: item.chunk.category,
          source: item.chunk.metadata.source,
          score: item.score,
        }));

      // Set headers for SSE (Server-Sent Events)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders(); // Ensure headers are sent immediately

      // Send the citations down first so the UI can render them alongside the incoming text
      res.write(`data: ${JSON.stringify({ type: "citations", citations: relevantCitations })}\n\n`);

      // 2. Format the context for Gemini
      const contextText = topChunks
        .map((item, index) => {
          return `[DOCUMENT ${index + 1} - ${item.chunk.title} (${item.chunk.category})]
Source: ${item.chunk.metadata.source}
Content: ${item.chunk.content}`;
        })
        .join("\n\n");

      // 3. Setup system instructions and prompt
      const systemInstruction = `You are the ATBU Registration Assistant, a highly helpful, professional, and empathetic AI chatbot designed specifically for Abubakar Tafawa Balewa University (ATBU), Bauchi. 
Your target audience is newly admitted (fresh) undergraduate and postgraduate students who are excited but anxious about the registration process.

CRITICAL RULES:
1. Answer the student's question ONLY and STRICTLY using the retrieved context documents provided in the prompt.
2. If the retrieved context does not contain the information needed to answer the question, or if you are not certain, say EXACTLY: "I'm not certain about this registration detail. Please confirm on the official ATBU portal (portal.atbu.edu.ng) or verify with your department's level coordinator or the registrar."
3. Do not invent, hallucinate, or extrapolate registration deadlines, fee amounts, room numbers, or administrative forms.
4. Keep your responses structured, clear, and extremely warm and friendly.
5. If the user's question is a simple greeting like "hello" or "how are you", reply with a warm, welcoming greeting, introduce yourself as the ATBU Registration Assistant, and list 3 or 4 things you can help with (e.g., Online Screening, School Fees, Documents Checklist, Hostel Bedspace).
6. Always write ATBU specific terms correctly (e.g., Gubi Campus, Yelwa Campus, Form 01, RRR invoice, Remita, JAMB CAPS).
7. If your response answers a question about registration fees, accommodation fees, or registration deadlines, you MUST append a standard italicized disclaimer at the bottom of your message: "Disclaimer: Fees, procedures, and deadlines are subject to change by the university senate. Always double-check your personal portal account for the most current schedule."`;

      // Format conversation history
      const formattedHistory = history.map((h: any) => {
        return {
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        };
      });

      // Construct final generation prompt combining history + context + query
      const currentPromptText = `RETIREVED ATBU KNOWLEDGE BASE CONTEXT:
---
${contextText}
---

STUDENT'S INQUIRY: "${message}"

Based on the retrieved context above, please answer the student's inquiry. Follow all system instructions perfectly.`;

      // Get Gemini client (will use mock/text fallback if key is missing)
      const ai = getGeminiClient();
      
      if (!ai) {
        // Fallback local response generator if no key is configured
        res.write(`data: ${JSON.stringify({ 
          text: "⚠️ **Demo Mode Active**: I am running in local mode because the Gemini API Key is not configured in the Secrets panel.\n\n" +
                "Based on the local ATBU knowledge base retrieval, here is what I found:\n\n" 
        })}\n\n`);

        // Craft a simulated streaming of the best context chunk
        const bestMatch = topChunks[0];
        let simulatedText = "";
        if (bestMatch && bestMatch.score > 0.1) {
          simulatedText = `Based on **${bestMatch.chunk.title}** (${bestMatch.chunk.category}):\n\n${bestMatch.chunk.content}\n\n*Source: ${bestMatch.chunk.metadata.source}*`;
          if (bestMatch.chunk.category === "Fees & Payments") {
            simulatedText += `\n\n*Disclaimer: Fees, procedures, and deadlines are subject to change by the university senate. Always double-check your personal portal account for the most current schedule.*`;
          }
        } else {
          simulatedText = "I'm not certain about this registration detail. Please confirm on the official ATBU portal (portal.atbu.edu.ng) or verify with your department's level coordinator or the registrar.";
        }

        // Stream simulated words
        const words = simulatedText.split(" ");
        for (let i = 0; i < words.length; i++) {
          res.write(`data: ${JSON.stringify({ text: words[i] + " " })}\n\n`);
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      // 4. Call Gemini Streaming API
      const resultStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: [
          ...formattedHistory,
          { role: "user", parts: [{ text: currentPromptText }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature keeps it highly factual
          topP: 0.9,
        }
      });

      // 5. Stream chunks back to client
      for await (const chunk of resultStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();

    } catch (err: any) {
      console.error("Error in /api/chat endpoint:", err);
      // Send error to client via SSE format so frontend can catch it
      res.write(`data: ${JSON.stringify({ error: "I encountered an issue connecting to the AI brain. Please try again in a few moments, or check if the ATBU portal is online." })}\n\n`);
      res.end();
    }
  });


  // --- VITE MIDDLEWARE & STATIC SERVING ---

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Serve static files in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets in production.");
  }

  // Listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🚀 ATBU Registration Assistant backend running!`);
    console.log(`🔗 Local Address: http://localhost:${PORT}`);
    console.log(`🌍 External development URL matches Development App URL.`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure on startup:", err);
});
