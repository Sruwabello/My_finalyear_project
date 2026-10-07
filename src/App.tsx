import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence
} from "motion/react";
import {
  School,
  Send,
  RefreshCw,
  FileText,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  BookOpen,
  CreditCard,
  Moon,
  Sun,
  Menu,
  X,
  Layers,
  Loader2,
  Database,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Globe,
  UserCheck,
  Laptop,
  Link2,
  GraduationCap,
  Award
} from "lucide-react";
import { KBChunk, Citation, Message, RAGStatus } from "./types";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [kbChunks, setKbChunks] = useState<KBChunk[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<KBChunk | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "screening" | "fees" | "docs" | "course">("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions based on ATBU student paintpoints
  const SUGGESTIONS = [
    { text: "What documents do I need for physical screening?", icon: <FileText className="w-4 h-4" /> },
    { text: "What are the school fees for science students?", icon: <CreditCard className="w-4 h-4" /> },
    { text: "How do I generate a Remita RRR code?", icon: <Layers className="w-4 h-4" /> },
    { text: "How do I apply for hostel accommodation?", icon: <School className="w-4 h-4" /> },
  ];

  // Load theme and initial data
  useEffect(() => {
    // Theme check
    const savedTheme = localStorage.getItem("atbu-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // Fetch initial RAG status
    fetchRAGStatus();
    // Fetch all KB chunks for FAQ tab
    fetchKB();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const fetchRAGStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setRagStatus(data);
    } catch (e) {
      console.error("Failed to fetch RAG status:", e);
    }
  };

  const fetchKB = async () => {
    try {
      const res = await fetch("/api/kb");
      const data = await res.json();
      setKbChunks(data);
    } catch (e) {
      console.error("Failed to fetch knowledge base:", e);
    }
  };

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("atbu-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("atbu-theme", "light");
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  // Trigger re-indexing
  const handleReindex = async () => {
    if (ragStatus?.isInitializing) return;
    try {
      setRagStatus(prev => prev ? { ...prev, isInitializing: true } : null);
      const res = await fetch("/api/reindex", { method: "POST" });
      const data = await res.json();
      setRagStatus(data.status);
    } catch (e) {
      console.error("Failed to reindex:", e);
      fetchRAGStatus();
    }
  };

  // Submit standard prompt
  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    // Create container for assistant reply
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const newAssistantMessage: Message = {
      id: assistantMessageId,
      role: "model",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      citations: [],
    };

    setMessages((prev) => [...prev, newAssistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No stream reader available");

      let currentText = "";
      let hasFinished = false;

      while (!hasFinished) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              hasFinished = true;
              break;
            }

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "citations") {
                // Update citations
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, citations: data.citations }
                      : msg
                  )
                );
              } else if (data.text) {
                currentText += data.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, text: currentText }
                      : msg
                  )
                );
              } else if (data.error) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, text: data.error, error: true }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              text: "❌ Service unavailable. Please check your internet connection and ensure the server has a valid GEMINI_API_KEY configured in the secrets dashboard.",
              error: true
            }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
      fetchRAGStatus(); // update status in case mode flipped
    }
  };

  // Open modal for citation text
  const handleOpenCitation = (citation: Citation) => {
    const chunk = kbChunks.find((c) => c.id === citation.id);
    if (chunk) {
      setSelectedCitation(chunk);
    } else {
      // Fallback display
      setSelectedCitation({
        id: citation.id,
        category: citation.category as any,
        title: citation.title,
        content: `Detailed documentation for this section can be accessed on portal.atbu.edu.ng.`,
        metadata: {
          source: citation.source,
          session: ragStatus?.sessionYear || "2025/2026",
          keywords: []
        }
      });
    }
  };

  // Inline markdown rendering helper
  const parseInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900 dark:text-amber-400">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Markdown renderer converting text to rich HTML components
  const renderRichText = (text: string) => {
    if (!text) return null;
    const paragraphs = text.split("\n\n");
    return paragraphs.map((p, pIdx) => {
      const trimmed = p.trim();

      // Check if bullet list
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n").filter(l => l.trim().startsWith("- ") || l.trim().startsWith("* "));
        return (
          <ul key={pIdx} className="list-disc pl-5 my-2 space-y-1 text-slate-700 dark:text-slate-300">
            {items.map((item, itemIdx) => {
              const cleaned = item.replace(/^[-*]\s+/, "");
              return <li key={itemIdx}>{parseInlineBold(cleaned)}</li>;
            })}
          </ul>
        );
      }

      // Check if numbered list
      if (/^\d+\./.test(trimmed)) {
        const items = trimmed.split("\n").filter(l => /^\d+\./.test(l.trim()));
        return (
          <ol key={pIdx} className="list-decimal pl-5 my-2 space-y-1 text-slate-700 dark:text-slate-300">
            {items.map((item, itemIdx) => {
              const cleaned = item.replace(/^\d+\.\s+/, "");
              return <li key={itemIdx}>{parseInlineBold(cleaned)}</li>;
            })}
          </ol>
        );
      }

      // Format simple warning note
      if (trimmed.startsWith("WARNING:") || trimmed.startsWith("Disclaimer:")) {
        return (
          <div key={pIdx} className="p-3 my-2 bg-amber-50 border-l-4 border-amber-500 dark:bg-amber-950/20 dark:border-amber-500 rounded text-amber-900 dark:text-amber-300 text-sm font-medium">
            {parseInlineBold(trimmed)}
          </div>
        );
      }

      // General paragraph
      return (
        <p key={pIdx} className="leading-relaxed mb-2 text-slate-700 dark:text-slate-300">
          {parseInlineBold(p)}
        </p>
      );
    });
  };

  const getFilteredKB = () => {
    if (activeTab === "all") return kbChunks;
    if (activeTab === "screening") return kbChunks.filter((c) => c.category === "Admission & Screening");
    if (activeTab === "fees") return kbChunks.filter((c) => c.category === "Fees & Payments");
    if (activeTab === "docs") return kbChunks.filter((c) => c.category === "Documents Checklist");
    if (activeTab === "course") return kbChunks.filter((c) => c.category === "Course Registration & Matriculation");
    return kbChunks;
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] dark:bg-slate-950 text-slate-950 dark:text-white overflow-hidden font-sans">

      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-80 bg-atbu-navy text-white border-r border-atbu-gold/20 shrink-0">
        <div className="p-6 border-b border-atbu-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-atbu-gold rounded-lg flex items-center justify-center shadow-lg text-atbu-navy">
              <School className="w-6 h-6 text-atbu-navy" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">ATBU ASSISTANT</h1>
              <p className="text-[10px] text-atbu-gold/70 uppercase tracking-widest leading-none mt-0.5">Registration Hub</p>
            </div>
          </div>
        </div>

        {/* RAG Engine Status Section */}
        <div className="p-4 m-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-300 tracking-wider">
              <Database className="w-3.5 h-3.5 text-atbu-gold" />
              <span>RAG Vector DB</span>
            </div>
            {ragStatus?.isReady ? (
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${ragStatus.isFallbackMode ? 'bg-atbu-gold/10 text-atbu-gold border border-atbu-gold/20' : 'bg-green-400/10 text-green-400 border border-green-400/20'}`}>
                {ragStatus.isFallbackMode ? "FALLBACK TF-IDF" : "GEMINI EMBED"}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-white/10 text-slate-300 rounded-full animate-pulse">
                INITIALIZING
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[9px]">Session Year</span>
              <span className="font-semibold text-atbu-gold">{ragStatus?.sessionYear || "2025/2026"}</span>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[9px]">Index Chunks</span>
              <span className="font-semibold text-white">{ragStatus?.loadedChunks || 0} / {ragStatus?.totalChunks || 9}</span>
            </div>
          </div>

          <button
            onClick={handleReindex}
            disabled={ragStatus?.isInitializing}
            className="w-full py-2 px-3 bg-white/10 hover:bg-white/15 transition text-[11px] text-slate-100 font-semibold rounded-lg border border-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${ragStatus?.isInitializing ? 'animate-spin' : ''}`} />
            {ragStatus?.isInitializing ? "Reindexing Chunks..." : "Re-index Knowledge Base"}
          </button>
        </div>

        {/* Interactive FAQ category quick selection */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categories</div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("screening")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between ${activeTab === "screening" ? 'bg-white/10 text-white border border-white/5 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-atbu-gold" />
                <span>📋 Admission & Screening</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => setActiveTab("fees")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between ${activeTab === "fees" ? 'bg-white/10 text-white border border-white/5 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-atbu-gold" />
                <span>💰 Fees & Payments</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => setActiveTab("docs")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between ${activeTab === "docs" ? 'bg-white/10 text-white border border-white/5 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-atbu-gold" />
                <span>📁 Documents Checklist</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => setActiveTab("course")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between ${activeTab === "course" ? 'bg-white/10 text-white border border-white/5 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-atbu-gold" />
                <span>📅 Course Registration</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>
          </div>

          {/* Official ATBU Resources */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-atbu-gold" />
              <span>Official Resources</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <a
                href="http://atbu.edu.ng/"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                  Main Website
                </span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 animate-pulse" />
              </a>

              <a
                href="http://atbu.safrecords.com/"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                  Student Portal
                </span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 animate-pulse" />
              </a>

              <a
                href="http://atbu.edu.ng/#/admissions"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                  Admissions Office
                </span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </a>

              <a
                href="http://atbu.edu.ng/#/bursary"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                  Bursar's Office
                </span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </a>

              <a
                href="http://atbu.edu.ng/#/ict"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                  ICT Unit
                </span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">FAQ Quick-Trigger</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {getFilteredKB().map((chunk) => (
                <button
                  key={chunk.id}
                  onClick={() => handleSubmit(chunk.title)}
                  className="w-full text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white transition line-clamp-2 border border-white/5"
                >
                  {chunk.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info & theme toggle */}
        <div className="p-4 mt-auto border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-500 border border-white/20 flex items-center justify-center text-xs font-bold text-white">SR</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">SarkinRuwa</p>
              <p className="text-[10px] text-slate-400 truncate">ATBU Final Year Project • RAG Live</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
          </div>

          <button
            onClick={() => setIsAboutOpen(true)}
            className="w-full flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-atbu-gold transition py-2 mb-2 border-t border-white/10 pt-3"
          >
            <Info className="w-3.5 h-3.5" />
            <span>About This Project</span>
          </button>
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-semibold text-atbu-gold hover:text-atbu-gold-hover transition py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[9px] text-slate-400 leading-normal mt-2">
            ATBU Registration Assistant • Project © 2026
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR DRAWERS */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            {/* Slide-out drawer */}
            <motion.aside

              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-atbu-navy text-white z-50 flex flex-col lg:hidden border-r border-atbu-gold/20"
            >
              <div className="p-5 border-b border-atbu-gold/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-atbu-gold rounded-lg flex items-center justify-center text-atbu-navy">
                    <School className="w-5 h-5 text-atbu-navy" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm tracking-tight text-white">ATBU ASSISTANT</h1>
                    <p className="text-[10px] text-atbu-gold/70 uppercase tracking-widest leading-none mt-0.5">Registration Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded bg-white/10 hover:bg-white/15 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* RAG details on mobile */}
              <div className="p-4 m-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">RAG Vector DB</span>
                  <span className="text-[9px] bg-green-400/15 text-green-400 px-1.5 py-0.5 rounded border border-green-400/20 font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Academic Session: <strong className="text-atbu-gold">{ragStatus?.sessionYear || "2025/2026"}</strong>
                </div>
              </div>

              {/* FAQ selections on mobile */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categories</div>
                <div className="space-y-1">
                  {["all", "screening", "fees", "docs", "course"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveTab(cat as any);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition capitalize ${activeTab === cat ? 'bg-white/10 text-white border border-white/5 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      {cat === "all" ? "View All Sections" : cat}
                    </button>
                  ))}
                </div>

                {/* Official ATBU Resources (Mobile) */}
                <div className="border-t border-white/10 pt-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-atbu-gold" />
                    <span>Official Resources</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <a
                      href="http://atbu.edu.ng/"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                        Main Website
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </a>

                    <a
                      href="http://atbu.safrecords.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                        Student Portal
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/admissions"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                        Admissions Office
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/bursary"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                        Bursar's Office
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/ict"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-atbu-gold hover:text-atbu-navy transition text-[11px] text-slate-300 font-semibold border border-white/5 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5 text-atbu-gold group-hover:text-atbu-navy" />
                        ICT Unit
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </a>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">FAQ Quick-Trigger</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {getFilteredKB().map((chunk) => (
                      <button
                        key={chunk.id}
                        onClick={() => {
                          handleSubmit(chunk.title);
                          setIsSidebarOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white transition line-clamp-1 border border-white/5"
                      >
                        {chunk.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
                <button
                  onClick={() => {
                    handleReset();
                    setIsSidebarOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-atbu-gold hover:text-atbu-gold-hover font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Chat
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                >
                  {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full bg-[#F1F5F9] dark:bg-slate-950 relative overflow-hidden">

        {/* MOBILE TOP NAVIGATION HEADER */}
        <header className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-atbu-navy text-white rounded-lg flex items-center justify-center font-bold text-xs">
                AT
              </div>
              <h2 className="font-bold text-xs uppercase tracking-wider dark:text-white">ATBU Registration AI</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">RAG Live</span>
          </div>
        </header>

        {/* DESKTOP STATUS AND TOP HEADER GREETING */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold bg-atbu-navy/5 text-atbu-navy dark:bg-amber-500/10 dark:text-atbu-gold rounded-full border border-atbu-navy/10 dark:border-atbu-gold/10 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Session {ragStatus?.sessionYear || "2025/2026"} Fresh Student Portal Active</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>RAG Engine Online</span>
            </div>
            <a
              href="https://portal.atbu.edu.ng"
              target="_blank"
              referrerPolicy="no-referrer"
              className="text-xs font-bold text-atbu-navy hover:text-atbu-navy-dark dark:text-atbu-gold dark:hover:text-atbu-gold-hover flex items-center gap-1 transition"
            >
              <span>ATBU Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        {/* CHAT MESSAGES PANEL */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          <div className="max-w-3xl mx-auto h-full flex flex-col">

            {messages.length === 0 ? (
              /* EMPTY LANDING / HERO GREETING SCREEN */
              <div className="my-auto py-8 flex flex-col items-center text-center space-y-8">

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-atbu-gold/15 rounded-3xl blur-2xl transform scale-110" />
                  <div className="relative p-6 bg-gradient-to-br from-atbu-navy to-atbu-navy-dark rounded-2xl border border-atbu-gold/30 shadow-2xl max-w-sm flex flex-col items-center">
                    <div className="p-3.5 bg-atbu-gold text-atbu-navy rounded-xl mb-4 shadow-lg flex items-center justify-center">
                      <School className="w-8 h-8 text-atbu-navy" />
                    </div>
                    <div className="text-[10px] font-bold uppercase text-atbu-gold tracking-widest mb-1.5">Abubakar Tafawa Balewa University</div>
                    <h3 className="text-white font-bold text-base tracking-tight uppercase">Registration Assistant</h3>
                    <p className="text-[11px] text-slate-300 mt-1.5 max-w-[250px] leading-relaxed">
                      Your intelligent final-year defense project assistant for navigating campus clearance & fees.
                    </p>
                  </div>
                </motion.div>

                <div className="max-w-lg space-y-3">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-atbu-navy dark:text-white leading-tight">
                    Welcome to ATBU Bauchi!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                    Avoid registration pitfalls, payment scams, and long queues. This AI-powered assistant answers your clearance questions using the
                    official <strong className="text-atbu-navy dark:text-atbu-gold">ATBU Registrar Knowledge Base</strong>.
                  </p>
                </div>

                {/* SUGGESTION CHIPS */}
                <div className="w-full max-w-2xl space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Suggested Student Questions</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SUGGESTIONS.map((sug, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => handleSubmit(sug.text)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-start gap-3.5 p-4 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold hover:shadow-lg rounded-xl transition duration-200 shadow-sm"
                      >
                        <div className="p-2 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg shrink-0">
                          {sug.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{sug.text}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 self-center shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* CRUCIAL OFFICIAL RESOURCES SECTION */}
                <div className="w-full max-w-2xl space-y-3 pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-atbu-gold" />
                    <span>Official ATBU Portals & Support Links</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a
                      href="http://atbu.edu.ng/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold rounded-xl transition hover:shadow-lg shadow-sm group"
                    >
                      <div className="p-2.5 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg group-hover:bg-atbu-gold group-hover:text-atbu-navy transition">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">Main Website</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">atbu.edu.ng</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-atbu-gold transition" />
                    </a>

                    <a
                      href="http://atbu.safrecords.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold rounded-xl transition hover:shadow-lg shadow-sm group"
                    >
                      <div className="p-2.5 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg group-hover:bg-atbu-gold group-hover:text-atbu-navy transition">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">Student Portal</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">safrecords.com</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-atbu-gold transition" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/admissions"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold rounded-xl transition hover:shadow-lg shadow-sm group"
                    >
                      <div className="p-2.5 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg group-hover:bg-atbu-gold group-hover:text-atbu-navy transition">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">Admissions Office</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Entry & Screening</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-atbu-gold transition" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/bursary"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold rounded-xl transition hover:shadow-lg shadow-sm group"
                    >
                      <div className="p-2.5 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg group-hover:bg-atbu-gold group-hover:text-atbu-navy transition">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">Bursar's Office</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Fees & Remita</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-atbu-gold transition" />
                    </a>

                    <a
                      href="http://atbu.edu.ng/#/ict"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-atbu-gold dark:hover:border-atbu-gold rounded-xl sm:col-span-2 lg:col-span-1 transition hover:shadow-lg shadow-sm group"
                    >
                      <div className="p-2.5 bg-atbu-navy/5 dark:bg-slate-800 text-atbu-navy dark:text-atbu-gold rounded-lg group-hover:bg-atbu-gold group-hover:text-atbu-navy transition">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">ICT Directorate</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Technical Support</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-atbu-gold transition" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-atbu-navy/5 dark:bg-blue-950/20 border border-atbu-navy/10 rounded-lg text-xs text-atbu-navy dark:text-blue-400 max-w-md mx-auto">
                  <Sparkles className="w-4 h-4 shrink-0 text-atbu-gold" />
                  <span><strong>AI Tip:</strong> Ask me about Gubi or Yelwa campus screening, Remita receipt issues, or matriculation details!</span>
                </div>

              </div>
            ) : (
              /* CONVERSATION STREAMING */
              <div className="space-y-6 flex-1 pb-10">
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-3.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                      {/* Avatar Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${msg.role === "user" ? "bg-atbu-navy text-white font-bold text-xs" : "bg-gradient-to-br from-atbu-navy to-atbu-navy-dark border border-atbu-gold/20 text-atbu-gold"}`}>
                        {msg.role === "user" ? "U" : <School className="w-5 h-5" />}
                      </div>

                      {/* Bubble box */}
                      <div className="space-y-2">
                        <div className={`p-4.5 rounded-2xl border shadow-sm leading-relaxed ${msg.role === "user" ? "bg-atbu-navy text-white border-atbu-navy rounded-tr-none" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 rounded-tl-none"}`}>

                          {/* Rich Text response rendering */}
                          <div className="text-sm prose dark:prose-invert max-w-none break-words">
                            {msg.text ? (
                              renderRichText(msg.text)
                            ) : (
                              /* Active typing loading chunk indicator */
                              <div className="flex items-center gap-1.5 py-1">
                                <span className="w-2 h-2 bg-atbu-gold rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-atbu-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-2 h-2 bg-atbu-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                              </div>
                            )}
                          </div>

                          {/* Citations Box (Under Bot Answer) */}
                          {msg.role === "model" && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold mb-2">
                                <Database className="w-3 h-3 text-atbu-gold" />
                                <span>Verified RAG Citations ({msg.citations.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((cite) => (
                                  <button
                                    key={cite.id}
                                    onClick={() => handleOpenCitation(cite)}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-atbu-navy hover:text-white dark:bg-slate-800 dark:hover:bg-atbu-gold/20 text-[10px] text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700/50 transition duration-200 flex items-center gap-1.5 max-w-[200px]"
                                    title={`Similarity score: ${(cite.score * 100).toFixed(1)}%`}
                                  >
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{cite.title}</span>
                                    <span className="text-[9px] text-slate-400 font-normal">{(cite.score * 100).toFixed(0)}%</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Timestamp under bubble */}
                        <div className={`text-[10px] text-slate-400 px-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                          {msg.timestamp}
                        </div>

                      </div>

                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator when waiting on stream initial handshake */}
                {isGenerating && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="flex gap-3.5 max-w-[85%]">
                      <div className="w-9 h-9 rounded-xl bg-atbu-navy border border-atbu-gold/20 flex items-center justify-center text-atbu-gold shadow-md">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">
                          Querying vector database, formulating response...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM INPUT AND CONTROLS SECTION */}
        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 z-25 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(input);
              }}
              className="flex items-center gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question (e.g. O'level requirements, Remita RRR generation...)"
                  className="w-full pl-5 pr-14 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-atbu-navy dark:focus:border-atbu-gold focus:ring-1 focus:ring-atbu-navy dark:focus:ring-atbu-gold focus:outline-none rounded-xl text-sm transition duration-200 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-inner"
                  maxLength={150}
                  disabled={isGenerating}
                />

                {/* Character count limit badge */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                  {input.length}/150
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={!input.trim() || isGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3.5 bg-atbu-navy hover:bg-atbu-navy-dark dark:bg-atbu-gold dark:hover:bg-atbu-gold-hover disabled:bg-slate-200 dark:disabled:bg-slate-850 disabled:text-slate-400 dark:disabled:text-slate-600 text-white dark:text-atbu-navy font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center shrink-0"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>

            <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 text-center md:text-left leading-normal">
              <div>
                ⚠️ Answers are tailored strictly from the official ATBU Bauchi registrars database.
              </div>
              <div className="flex items-center gap-1.5">
                <span>RAG Engine:</span>
                <span className="font-bold text-atbu-navy dark:text-atbu-gold">Cosine Similarity (K=5)</span>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* DETAILED CITATION BOTTOM SHEET / MODAL WINDOW */}
      <AnimatePresence>
        {selectedCitation && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCitation(null)}
              className="fixed inset-0 bg-black/60 z-50"
            />

            {/* Center Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/25 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-atbu-navy text-atbu-gold rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5 text-atbu-gold" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-atbu-navy dark:text-atbu-gold font-bold tracking-widest">{selectedCitation.category}</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base truncate leading-snug">
                        {selectedCitation.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCitation(null)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-4.5 h-4.5 text-slate-500 hover:text-slate-800 dark:hover:text-white" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                  <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap select-text">
                    {selectedCitation.content}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Verified Document Source</span>
                      <strong className="text-atbu-navy dark:text-slate-200">{selectedCitation.metadata.source}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Academic Session Scope</span>
                      <strong className="text-atbu-navy dark:text-slate-200">Session {selectedCitation.metadata.session}</strong>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/25 flex items-center justify-between shrink-0">
                  <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Validated RAG Knowledge Chunk</span>
                  </div>
                  <button
                    onClick={() => {
                      handleSubmit(`Tell me more about ${selectedCitation.title}`);
                      setSelectedCitation(null);
                    }}
                    className="py-2 px-4 bg-atbu-navy hover:bg-atbu-navy-dark dark:bg-atbu-gold dark:hover:bg-atbu-gold-hover text-white dark:text-atbu-navy text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-1.5"
                  >
                    <span>Ask about this section</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      {/* ABOUT THIS PROJECT MODAL */}
      <AnimatePresence>
        {isAboutOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutOpen(false)}
              className="fixed inset-0 bg-black/60 z-50"
            />

            {/* Center Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/25 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-atbu-navy text-atbu-gold rounded-lg flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-5 h-5 text-atbu-gold" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-atbu-navy dark:text-atbu-gold font-bold tracking-widest">Final Year Project</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-snug">
                        About This Project
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAboutOpen(false)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-4.5 h-4.5 text-slate-500 hover:text-slate-800 dark:hover:text-white" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-5">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Project Title</span>
                    <h4 className="font-bold text-atbu-navy dark:text-atbu-gold text-sm leading-snug">
                      Design and Implementation of a Chatbot that Guides Newly Admitted Students on Their Registration Process (ATBU)
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Student</span>
                      <strong className="text-atbu-navy dark:text-slate-200">Sulaiman Bello Muhammad</strong>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">20/56618U/5</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Department</span>
                      <strong className="text-atbu-navy dark:text-slate-200">Management & Information Technology</strong>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">500 Level</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Supervisor</span>
                      <strong className="text-atbu-navy dark:text-slate-200">Dr. Hussaini Mamman</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold mb-0.5">Session</span>
                      <strong className="text-atbu-navy dark:text-slate-200">2025/2026</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                      <Award className="w-3.5 h-3.5 text-atbu-gold" />
                      Problem Statement
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      Registration at ATBU is often slowed by information scattered across portals, notice boards, and staff, long queues at administrative offices, and limited real-time support — especially during peak periods. Static FAQ pages quickly go outdated, rule-based bots can't handle varied phrasing, and general-purpose AI models risk generating inaccurate, fabricated answers. This project addresses these gaps with a Retrieval-Augmented Generation (RAG) chatbot that grounds every response in official ATBU registrar documents — delivering accurate, context-aware guidance to newly admitted students in real time.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/25 flex items-center justify-center shrink-0">
                  <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Abubakar Tafawa Balewa University (ATBU), Bauchi — {ragStatus?.sessionYear || "2025/2026"}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
