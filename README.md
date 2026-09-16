# ATBU Registration Assistant — AI-Powered RAG Chatbot Web App

Welcome to the **Abubakar Tafawa Balewa University (ATBU), Bauchi** Registration Assistant. This is a production-grade, highly polished full-stack web application designed for fresh students to navigate their physical screening, online screening, fee payments, document verification, and course registration. 

This project implements a full **RAG (Retrieval-Augmented Generation)** pipeline and is designed to defend as a final-year university computer science project.

---

## 🚀 Key Features

1. **Retrieval-Augmented Generation (RAG)**: Uses the `@google/genai` SDK and the `gemini-embedding-2-preview` model to search a specialized ATBU registrar knowledge base, performing cosine similarity calculations to find the top 5 most relevant documents for any query.
2. **Double-Safety Fallback Engine**: If the Gemini API key is missing or rate-limited, the chatbot automatically spins up a local **TF-IDF Term Overlap Vector Space** in-memory. The assistant remains 100% functional, meaning your final-year defense presentation will never crash.
3. **Interactive Citations**: For every AI reply, clickable resource tags appear below the message. Clicking a tag launches a detailed modal showing the exact registrar source and original paragraph used for grounding, proving zero hallucination.
4. **Interactive Sidebar**: A custom-styled sidebar with quick-trigger FAQ categories (Screening, Fees, Document Checklists, Course Registration), a "Reset Conversation" option, and a light/dark high-contrast mode toggle.
5. **Polished UI/UX**: Designed in ATBU's academic identity colors (deep blue and golden amber) using Inter and JetBrains Mono typography, Framer Motion transitions, responsive drawer navigation, skeleton loaders, and interactive chat chips.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19 (SPA) with Vite.
- **Backend**: Node.js & Express.js.
- **AI Model (LLM)**: Google Gemini `gemini-3.5-flash` for streaming responses.
- **AI Model (Embeddings)**: `gemini-embedding-2-preview` (keeping the pipeline inside Google's free tier).
- **Styling**: Tailwind CSS v4.
- **Animation**: Framer Motion (`motion/react`).

---

## 📁 Project Directory

```text
├── server.ts                    # Full-Stack Express Server (API routes & Vite middleware)
├── package.json                 # Dependency definitions & scripts
├── metadata.json                # Project configurations & permissions
├── README.md                    # Setup documentation (this file)
├── src/
│   ├── main.tsx                 # React entry mount point
│   ├── App.tsx                  # Main Chat Dashboard UI, Sidebar, and Modal Windows
│   ├── index.css                # Global Tailwind CSS and custom fonts
│   ├── types.ts                 # Type definitions (Messages, Citations, KBChunk)
│   ├── data/
│   │   └── atbuKnowledgeBase.ts # Structured registrar procedures & fees database
│   └── lib/
│       └── rag.ts               # Embedding, tf-idf fallbacks, and cosine matching
```

---

## ⚙️ Setup & Local Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and `npm` installed.

### 1. Clone & Install Dependencies
Navigate to your project root folder and run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or edit the existing `.env.example` file and rename it to `.env`):
```env
# Google Gemini API Key from Google AI Studio
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"

# The host URL for the application
APP_URL="http://localhost:3000"
```

> **Note on Safety**: If `GEMINI_API_KEY` is not provided, the server automatically starts in **Demo Fallback Mode** using local vector matching and returns simulated typing outputs so you can demo the app offline.

### 3. Start the Development Server
Run the development server which launches both the Express backend and the Vite HMR engine on port `3000`:
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`** to interact with the application.

### 4. Compiling & Production Build
To bundle the application into static client assets and compile the server using `esbuild` for production:
```bash
npm run build
```
Once built, you can run the self-contained production bundle using:
```bash
npm start
```

---

## 🛡️ RAG Querying Rules
The Gemini LLM prompt is heavily guarded using a strict system instruction set which ensures:
1. **Fact Grounding**: Answers are derived ONLY from the retrieved context.
2. **Honesty Bound**: If a query is outside the knowledge base, the bot replies: *"I'm not certain about this registration detail..."*
3. **Accuracy**: Fee structures, deadlines, and room numbers are never hallucinated.
4. **Disclaimers**: A standard university senate disclaimer is appended to any response detailing money, course registration, or dates.
