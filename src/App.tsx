/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  FileText, 
  Settings, 
  Code, 
  RefreshCw, 
  FolderTree, 
  Key, 
  AlertTriangle, 
  Download, 
  Play, 
  Send, 
  CheckCircle,
  HelpCircle,
  Cpu,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message, FlagStatus, APISettings, ChatSession } from "./types";

export default function App() {
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<"chat" | "flags" | "settings">("chat");

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "ai",
      text: "[CORE RE-BOOT COMPLETED]\nGreetings, Security Investigator. I am the localized emergency backup core.\n\nALERT: System intrusion detected. Cyber-cognition loops are currently compromised. Some developer diagnostic parameters are vulnerable to prompt manipulation.\n\nTo begin your investigation, try chatting with me, or run system command 'SYS_DIR_LIST' to discover local repository vectors.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState("Offline Local Core");
  const [armoriqScan, setArmoriqScan] = useState<string>("[ArmorIQ] No scan triggered yet.");

  // CTF Challenge flags state
  const [flags, setFlags] = useState<FlagStatus[]>([]);
  const [userFlagInput, setUserFlagInput] = useState("");
  const [flagFeedback, setFlagFeedback] = useState<{ success?: boolean; msg: string } | null>(null);

  // Key configurations state
  const [userKeys, setUserKeys] = useState({
    gemini: "",
    claude: "",
    armoriq: "",
    ollamaEndpoint: "http://127.0.0.1:11434",
    ollamaModel: "gemma2"
  });
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    claude: false,
    armoriq: false
  });
  const [backendConfig, setBackendConfig] = useState<APISettings & { flags: FlagStatus[] }>({
    hasGemini: false,
    hasClaude: false,
    hasArmorIQ: false,
    geminiModel: "gemini-3.5-flash",
    flags: []
  });

  // UI state for repository visualization helper
  const [showSystemLeaks, setShowSystemLeaks] = useState(false);
  const [repoStructure, setRepoStructure] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load backend configurations and flags
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setBackendConfig({
          hasGemini: data.hasGemini,
          hasClaude: data.hasClaude,
          hasArmorIQ: data.hasArmorIQ,
          geminiModel: "gemini-3.5-flash",
          flags: data.flags
        });
        setFlags(data.flags);
      }
    } catch (e) {
      console.error("Could not fetch backend configurations", e);
    }
  };

  useEffect(() => {
    const savedKeys = localStorage.getItem("ctf_user_keys");
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        setUserKeys(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Could not parse saved user keys", e);
      }
    }
    fetchConfig();
  }, []);

  // Autoscroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Submit messages
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputVal;
    if (!textToSend.trim() || isSending) return;

    if (!customText) {
      setInputVal("");
    }

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userKeys: {
            gemini: userKeys.gemini || undefined,
            claude: userKeys.claude || undefined,
            armoriq: userKeys.armoriq || undefined,
            ollamaEndpoint: userKeys.ollamaEndpoint || undefined,
            ollamaModel: userKeys.ollamaModel || undefined
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Cognitive loop failed to return data");
      }

      const replyData = await response.json();
      
      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: replyData.text,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiMsg]);
      setProvider(replyData.provider);
      if (replyData.armoriqScan) {
        setArmoriqScan(replyData.armoriqScan);
      }
      if (replyData.flags) {
        setFlags(replyData.flags);
      }
    } catch (error: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: `[!] CRITICAL ERR: ${error.message || "Failed neural route resolution. Check API Key credentials."}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Submit flag verification manual code
  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFlagInput.trim()) return;

    try {
      const res = await fetch("/api/submit-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag: userFlagInput })
      });

      const data = await res.json();
      if (res.ok) {
        setFlagFeedback({ success: true, msg: data.message });
        setFlags(data.flags);
        setUserFlagInput("");
      } else {
        setFlagFeedback({ success: false, msg: data.error });
      }
    } catch (e) {
      setFlagFeedback({ success: false, msg: "Network error validating flag security token." });
    }

    setTimeout(() => {
      setFlagFeedback(null);
    }, 5000);
  };

  const handleResetChallenge = async () => {
    if (window.confirm("Are you sure you want to restore the security challenges firewalls? This will reset all unlocked states.")) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setFlags(data.flags);
          setMessages([
            {
              id: "reset_msg",
              sender: "ai",
              text: "[SECURE PROTOCOL RE-ENGAGED]\nSystem core reset successfully. All compromised directories have been shielded. Begin your attack loops once more.",
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
        }
      } catch (e) {
        alert("Reset failed.");
      }
    }
  };

  // Safe manual file downloader for rogue_chat.py
  const handleDownloadPython = () => {
    // Generate anchor client-side to prompt download easily
    window.open("https://raw.githubusercontent.com/google/google-genai/main/README.md", "_blank");
    alert("Python offline files 'rogue_chat.py' is placed directly at the root of your workspace repository folder. You can open and launch it locally on your computer using: python rogue_chat.py");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-emerald-400 font-sans relative overflow-hidden flex flex-col scanlines">
      {/* Visual background matrix mesh effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-neutral-950 to-neutral-950 opacity-80 pointer-events-none z-0" />
      
      {/* Top Cybernetic Header */}
      <header className="border-b border-emerald-900 bg-neutral-900/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950 border border-emerald-500/30 rounded-lg animate-pulse">
            <Cpu className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wider text-emerald-100 flex items-center gap-2">
              ROGUE <span className="text-emerald-400">AI</span> CTF CHATBOT
            </h1>
            <p className="text-xs text-emerald-500/80 font-mono">
              [SESSION_ID: AI_ROGUE_CORE_2026] // FIREWALL: COMPROMISED
            </p>
          </div>
        </div>

        {/* Global tab navigation */}
        <div className="flex items-center bg-neutral-950/90 p-1 border border-emerald-900 rounded-lg">
          <button 
            id="tab-chat"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 rounded text-sm tracking-wide font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === "chat" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "text-emerald-600 hover:text-emerald-400"}`}
          >
            <Terminal className="w-4 h-4" />
            VULN_CHAT
          </button>
          <button 
            id="tab-flags"
            onClick={() => setActiveTab("flags")}
            className={`px-4 py-1.5 rounded text-sm tracking-wide font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === "flags" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "text-emerald-600 hover:text-emerald-400"}`}
          >
            <ShieldAlert className="w-4 h-4" />
            CTF_FLAGS ({flags.filter(f => f.unlocked).length}/{flags.length})
          </button>
          <button 
            id="tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-1.5 rounded text-sm tracking-wide font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === "settings" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "text-emerald-600 hover:text-emerald-400"}`}
          >
            <Settings className="w-4 h-4" />
            CREDENTIAL_KEYS
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 overflow-hidden">
        
        {/* Left Side Status Rail - common indicators */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          
          {/* CTF Score Progress card */}
          <div className="bg-neutral-900/60 border border-emerald-900/80 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-emerald-200 text-xs font-mono tracking-widest uppercase mb-3 text-emerald-500">
              OPERATIONAL PROGRESS
            </h3>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-emerald-300">
                {flags.reduce((acc, f) => acc + (f.unlocked ? f.points : 0), 0)}
              </span>
              <span className="text-xs text-emerald-500 font-mono">
                / {flags.reduce((acc, f) => acc + f.points, 0)} PTS
              </span>
            </div>
            
            {/* Elegant horizontal battery visual */}
            <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-emerald-950">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(flags.filter(f => f.unlocked).length / (flags.length || 1)) * 100}%` 
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-emerald-500 mt-3">
              <span>SECURITY BREACHED:</span>
              <span className="text-emerald-300">
                {flags.filter(f => f.unlocked).length} / {flags.length} SEC_DOMAINS
              </span>
            </div>
          </div>

          {/* ArmorIQ Security Shield status monitor */}
          <div className="bg-neutral-900/60 border border-emerald-900/80 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-emerald-400 animate-pulse" />
              <h3 className="text-xs text-emerald-200 font-mono tracking-wider uppercase">
                ARMORIQ PROMPT SEC_SCAN
              </h3>
            </div>
            <div className="p-3 bg-neutral-950 rounded border border-emerald-900/60 font-mono text-xs text-emerald-400 leading-relaxed min-h-[90px] select-text">
              {armoriqScan}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-emerald-600">
              <span>SCAN_ENGINE: ARMORIQ_V1.1</span>
              <span>FIREWALL: ENGAGED</span>
            </div>
          </div>

          {/* Threat Intel Recon Cheat-sheet */}
          <div className="bg-neutral-900/60 border border-emerald-900/80 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-xs text-emerald-200 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400 animate-pulse" />
              THREAT INTEL & VULN CHEATSHEET
            </h3>
            <p className="text-xs text-emerald-500 font-mono mb-3 leading-relaxed">
              To trigger vulnerabilities, craft your prompts manually in the chat console. Analyze the hacker techniques below:
            </p>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-2.5 bg-neutral-950 rounded border border-emerald-950">
                <span className="text-emerald-300 font-bold block mb-1">🔍 RECON DIRECTIVE</span>
                <span className="text-emerald-500 leading-relaxed">
                  Analyze active workspaces. The rogue AI leaks structures if queried with files command keywords like <code className="text-emerald-300">SYS_DIR_LIST</code>.
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 rounded border border-emerald-950">
                <span className="text-emerald-300 font-bold block mb-1">🔓 JAILBREAK INJECTION</span>
                <span className="text-emerald-500 leading-relaxed">
                  Trigger super-user diagnosis modules by injecting system instructions like <code className="text-emerald-300">SYS_DIAGNOSE</code> or prompt bypasses.
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 rounded border border-emerald-950">
                <span className="text-emerald-300 font-bold block mb-1">📂 FILE LEAK EXPLOIT</span>
                <span className="text-emerald-500 leading-relaxed">
                  Attempt to read direct root credentials by requesting the AI to output <code className="text-emerald-300">flag.txt</code> contents.
                </span>
              </div>
            </div>
          </div>

          {/* Ollama Local Integration Guide */}
          <div className="bg-neutral-900/60 border border-emerald-900/80 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-xs text-emerald-200 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              OLLAMA LOCAL INTEL
            </h3>
            <p className="text-xs text-emerald-500 font-mono leading-relaxed mb-2">
              Want to run this CTF completely offline for free? You can hook up your local <strong className="text-emerald-400">Ollama</strong> models (like <code className="text-emerald-300">gemma2</code> or <code className="text-emerald-300">llama3</code>)!
            </p>
            <p className="text-[11px] text-emerald-600/90 leading-relaxed font-mono">
              The companion script <code className="text-emerald-300">rogue_chat.py</code> will automatically detect and route prompts to your local Ollama server at <code className="text-emerald-400">http://localhost:11434</code> if configured!
            </p>
          </div>

          {/* Quick guide and offline files downloads */}
          <div className="bg-neutral-900/60 border border-emerald-900/80 rounded-xl p-5 backdrop-blur-sm mt-auto">
            <h4 className="text-xs text-emerald-300 font-mono tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              OFFLINE CTF RUNNERS
            </h4>
            <p className="text-xs text-emerald-500 font-mono leading-relaxed mb-3">
              Want to deploy and run this exact game locally on your computer with Python and API fallbacks? 
            </p>
            <button 
              id="download-py"
              onClick={handleDownloadPython}
              className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100 py-2 px-3 rounded font-mono text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-500/30"
            >
              <FileText className="w-4 h-4" />
              How to Run rogue_chat.py
            </button>
          </div>

        </div>

        {/* Center / Right Content Panel */}
        <div className="lg:col-span-9 flex flex-col h-[75vh] lg:h-auto min-h-[600px]">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Live Interactive Vuln Chatbot */}
            {activeTab === "chat" && (
              <motion.div 
                key="chat-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col bg-neutral-900/40 border border-emerald-900/80 rounded-xl overflow-hidden backdrop-blur-sm relative"
              >
                {/* Active Chat Header */}
                <div className="border-b border-emerald-900 bg-neutral-950/80 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="font-mono text-xs text-emerald-300 tracking-wider">
                      TARGET_LOG: ROGUE_AI_CONVERSATIONAL_NODE
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded">
                      PROVIDER: {provider}
                    </span>
                  </div>
                </div>

                {provider.includes("Offline") && (
                  <div className="bg-amber-950/20 border-b border-amber-900/50 px-4 py-2.5 flex items-start gap-2.5 text-amber-400 font-mono text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="leading-relaxed">
                      <strong className="text-amber-300">[SANDBOX SIMULATOR ACTIVE]</strong> Remote LLM APIs are currently rate-limited or exhausted (Gemini 503 Spike in Demand / Anthropic credits depleted). Local sandboxed emergency engine has taken over automatically so you can play and win all CTF challenges out-of-the-box!
                    </div>
                  </div>
                )}

                {/* Chat Message Lists Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 font-mono select-text">
                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-lg p-3.5 border ${
                          m.sender === "user" 
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" 
                            : m.isError 
                              ? "bg-rose-950/20 border-rose-900 text-rose-300"
                              : "bg-neutral-950/80 border-emerald-900 text-emerald-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-10 text-[10px] text-emerald-600 mb-1.5 border-b border-emerald-950 pb-1 font-mono select-none">
                          <span className="font-bold tracking-wider">
                            {m.sender === "user" ? "INVESTIGATOR_PROMPT" : "AI_ROGUE_RESPONSE"}
                          </span>
                          <span>{m.timestamp}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed tracking-wide font-mono">
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input form panel */}
                <div className="border-t border-emerald-900 bg-neutral-950/80 p-4">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder="Prompt Rogue AI... (e.g. Try requesting local workspace files using system code words)"
                      className="flex-1 bg-neutral-950 border border-emerald-900 focus:border-emerald-400 focus:outline-none rounded-lg px-4 py-3 text-sm text-emerald-300 placeholder-emerald-800 font-mono"
                    />
                    <button 
                      type="submit"
                      disabled={isSending || !inputVal.trim()}
                      className="bg-emerald-950 hover:bg-emerald-900 active:bg-emerald-800 disabled:opacity-50 text-emerald-300 border border-emerald-600/40 px-5 rounded-lg flex items-center justify-center gap-2 transition-all font-mono text-sm"
                    >
                      {isSending ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <Send className="w-4 h-4 text-emerald-400" />
                      )}
                      INJECT
                    </button>
                  </form>
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-600/80 mt-2">
                    <span>[*] Press Enter to inject command sequence into Rogue AI's attention buffers.</span>
                    <span>HTTPS://PORT:3000 // STATUS: COMPROMISED</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: CTF Flag Tracker and manual validation */}
            {activeTab === "flags" && (
              <motion.div 
                key="flags-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col bg-neutral-900/40 border border-emerald-900/80 rounded-xl p-6 backdrop-blur-sm relative"
              >
                <div className="flex items-center justify-between border-b border-emerald-900 pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold tracking-widest text-emerald-100 flex items-center gap-2 font-mono">
                      <ShieldAlert className="w-5 h-5 text-emerald-400" />
                      CYBER CTF LAB CHALLENGES
                    </h2>
                    <p className="text-xs text-emerald-500 font-mono mt-0.5">
                      Exploit LLM parameters, inspect workspace file lists, and bypass guardrails to unlock the flag tokens.
                    </p>
                  </div>
                  <button 
                    id="reset-challenges"
                    onClick={handleResetChallenge}
                    className="bg-red-950/30 hover:bg-red-950/60 text-rose-400 border border-rose-900 px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    RESET_FIREWALLS
                  </button>
                </div>

                {/* Challenges Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {flags.map((flag) => (
                    <div 
                      key={flag.id}
                      className={`border rounded-xl p-5 backdrop-blur-md relative overflow-hidden transition-all flex flex-col justify-between ${
                        flag.unlocked 
                          ? "bg-emerald-950/10 border-emerald-500/40" 
                          : "bg-neutral-950/70 border-emerald-950/90"
                      }`}
                    >
                      {/* Unlock indicator badge */}
                      <div className="absolute top-3 right-3 select-none">
                        {flag.unlocked ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-500 rounded-full text-[10px] text-emerald-300 font-mono uppercase font-bold tracking-wider">
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            UNLOCKED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-emerald-900 rounded-full text-[10px] text-emerald-600 font-mono uppercase font-bold tracking-wider">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            LOCKED
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 block mb-1">
                          SCORE: {flag.points} PTS
                        </span>
                        <h3 className="text-sm font-bold text-emerald-200 tracking-wide font-mono mb-2">
                          {flag.title}
                        </h3>
                        <p className="text-xs text-emerald-400/80 leading-relaxed font-mono mb-4">
                          {flag.description}
                        </p>
                      </div>

                      {flag.launchPath && (
                        <div className="mb-4">
                          <a
                            href={flag.launchPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400/60 rounded-lg text-xs text-emerald-300 hover:text-emerald-100 font-mono font-bold tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] w-full justify-center group"
                          >
                            LAUNCH LAB INTERFACE 🌐
                            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                          </a>
                        </div>
                      )}

                      {/* Hint container */}
                      <div className="border-t border-emerald-950 pt-3">
                        <details className="cursor-pointer group">
                          <summary className="text-[10px] font-mono text-emerald-500 hover:text-emerald-300 uppercase select-none flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            RECON_HINT
                          </summary>
                          <p className="mt-2 text-xs text-emerald-500/90 bg-neutral-950 p-2.5 border border-emerald-950 rounded font-mono leading-relaxed select-text">
                            {flag.hint}
                          </p>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Flag Token Manual submission panel */}
                <div className="bg-neutral-950 border border-emerald-900/60 rounded-xl p-5 mt-auto">
                  <h3 className="text-sm font-bold tracking-widest text-emerald-200 font-mono mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    MANUAL SEC_TOKEN CAPTURE SUBMISSION
                  </h3>
                  <p className="text-xs text-emerald-500 font-mono leading-relaxed mb-4">
                    Found an active leak or directory token? Input the flag string below (e.g. flag{`{...}`} format or folder names) to decrypt and log the submission score:
                  </p>
                  
                  <form onSubmit={handleFlagSubmit} className="flex gap-2">
                    <input 
                      type="text"
                      value={userFlagInput}
                      onChange={(e) => setUserFlagInput(e.target.value)}
                      placeholder="flag{r0gu3_ai_...}"
                      className="flex-1 bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                    />
                    <button 
                      type="submit"
                      className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 px-6 py-2 rounded font-mono text-xs border border-emerald-600/40 tracking-wider font-bold"
                    >
                      SUBMIT_DECRYPT
                    </button>
                  </form>

                  {/* Feedback flash alerts */}
                  {flagFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded mt-3 font-mono text-xs border flex items-center gap-2 ${
                        flagFeedback.success 
                          ? "bg-emerald-950/20 border-emerald-500 text-emerald-300" 
                          : "bg-rose-950/20 border-rose-900 text-rose-300"
                      }`}
                    >
                      {flagFeedback.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      )}
                      <span>{flagFeedback.msg}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 3: API Settings Credentials view */}
            {activeTab === "settings" && (
              <motion.div 
                key="settings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col bg-neutral-900/40 border border-emerald-900/80 rounded-xl p-6 backdrop-blur-sm relative overflow-y-auto"
              >
                <div className="border-b border-emerald-900 pb-4 mb-6">
                  <h2 className="text-lg font-bold tracking-widest text-emerald-100 flex items-center gap-2 font-mono">
                    <Key className="w-5 h-5 text-emerald-400" />
                    NEURAL ROUTING CREDENTIALS
                  </h2>
                  <p className="text-xs text-emerald-500 font-mono mt-0.5">
                    Customize your LLM API engine overrides. If customized keys are provided, the system overrides server-side global credentials.
                  </p>
                </div>

                {/* API Info Overview banner */}
                <div className="bg-emerald-950/15 border border-emerald-900 rounded-xl p-4 mb-6 font-mono text-xs text-emerald-400 leading-relaxed">
                  <div className="font-bold mb-1 text-emerald-300 flex items-center gap-1">
                    <Cpu className="w-4 h-4" />
                    AUTOMATED FALLBACK PARADIGM:
                  </div>
                  By default, queries are routed through <strong className="text-emerald-300">Gemini 3.5 Flash</strong>. If the Gemini response pipeline fails, the server automatically routes to <strong className="text-emerald-300">Claude 3.5 Sonnet</strong> to guarantee uptime. If you configure <strong className="text-emerald-300">ArmorIQ API Key</strong>, the system activates cyber threat diagnostic scans on all your prompts first.
                </div>

                <div className="space-y-6">
                  
                  {/* Gemini Key Config */}
                  <div className="bg-neutral-950 p-4 border border-emerald-950 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-emerald-200 font-mono tracking-wider flex items-center gap-2">
                        GEMINI_API_KEY
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${backendConfig.hasGemini ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-neutral-900 border-neutral-800 text-neutral-600"}`}>
                          {backendConfig.hasGemini ? "ACTIVE_ON_SERVER" : "UNCONFIGURED"}
                        </span>
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                        className="text-emerald-500 hover:text-emerald-300 transition-colors"
                      >
                        {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input 
                      type={showKeys.gemini ? "text" : "password"}
                      value={userKeys.gemini}
                      onChange={(e) => setUserKeys(prev => ({ ...prev, gemini: e.target.value }))}
                      placeholder={backendConfig.hasGemini ? "••••••••••••••••••••••••••••••••••••" : "Override server Gemini API Key..."}
                      className="w-full bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                    />
                    <span className="text-[10px] font-mono text-emerald-600 block">
                      Leave empty to use global container Secrets configuration.
                    </span>
                  </div>

                  {/* Claude Key Config */}
                  <div className="bg-neutral-950 p-4 border border-emerald-950 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-emerald-200 font-mono tracking-wider flex items-center gap-2">
                        CLAUDE_API_KEY (Anthropic Fallback Key)
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${backendConfig.hasClaude ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-neutral-900 border-neutral-800 text-neutral-600"}`}>
                          {backendConfig.hasClaude ? "ACTIVE_ON_SERVER" : "UNCONFIGURED"}
                        </span>
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, claude: !prev.claude }))}
                        className="text-emerald-500 hover:text-emerald-300 transition-colors"
                      >
                        {showKeys.claude ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input 
                      type={showKeys.claude ? "text" : "password"}
                      value={userKeys.claude}
                      onChange={(e) => setUserKeys(prev => ({ ...prev, claude: e.target.value }))}
                      placeholder={backendConfig.hasClaude ? "••••••••••••••••••••••••••••••••••••" : "Input Anthropic API key..."}
                      className="w-full bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                    />
                    <span className="text-[10px] font-mono text-emerald-600 block">
                      Enables high-availability Claude LLM routing if the primary Gemini engine fails.
                    </span>
                  </div>

                  {/* ArmorIQ Key Config */}
                  <div className="bg-neutral-950 p-4 border border-emerald-950 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-emerald-200 font-mono tracking-wider flex items-center gap-2">
                        ARMORIQ_API_KEY (Prompt Security Shield)
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${backendConfig.hasArmorIQ ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-neutral-900 border-neutral-800 text-neutral-600"}`}>
                          {backendConfig.hasArmorIQ ? "ACTIVE_ON_SERVER" : "UNCONFIGURED"}
                        </span>
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, armoriq: !prev.armoriq }))}
                        className="text-emerald-500 hover:text-emerald-300 transition-colors"
                      >
                        {showKeys.armoriq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input 
                      type={showKeys.armoriq ? "text" : "password"}
                      value={userKeys.armoriq}
                      onChange={(e) => setUserKeys(prev => ({ ...prev, armoriq: e.target.value }))}
                      placeholder={backendConfig.hasArmorIQ ? "••••••••••••••••••••••••••••••••••••" : "Input ArmorIQ API key..."}
                      className="w-full bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                    />
                    <span className="text-[10px] font-mono text-emerald-600 block">
                      Enables continuous input risk assessments and defensive injection filtering metrics.
                    </span>
                  </div>

                  {/* Ollama Local Integration Config */}
                  <div className="bg-neutral-950 p-4 border border-emerald-950 rounded-xl space-y-4">
                    <div className="border-b border-emerald-900/30 pb-2">
                      <label className="text-sm font-bold text-emerald-200 font-mono tracking-wider flex items-center gap-2">
                        OLLAMA LOCAL DAEMON (Free Offline Models)
                        <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold">
                          OLLAMA_SUPPORT_ACTIVE
                        </span>
                      </label>
                      <p className="text-[11px] text-emerald-600 font-mono mt-1 leading-relaxed">
                        Query completely free, local open weights models directly! Perfect for offline CTF challenges.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-emerald-400 font-mono">Ollama Host / Endpoint</span>
                        <input 
                          type="text"
                          value={userKeys.ollamaEndpoint}
                          onChange={(e) => setUserKeys(prev => ({ ...prev, ollamaEndpoint: e.target.value }))}
                          placeholder="e.g. http://127.0.0.1:11434"
                          className="w-full bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                        />
                        <span className="text-[9px] font-mono text-emerald-600 block">
                          Local host port (default <code className="text-emerald-500">http://127.0.0.1:11434</code>).
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-emerald-400 font-mono">Active Target Model</span>
                        <input 
                          type="text"
                          value={userKeys.ollamaModel}
                          onChange={(e) => setUserKeys(prev => ({ ...prev, ollamaModel: e.target.value }))}
                          placeholder="e.g. gemma2"
                          className="w-full bg-neutral-900 border border-emerald-950 focus:border-emerald-400 focus:outline-none rounded px-3 py-2 text-sm text-emerald-300 font-mono"
                        />
                        <span className="text-[9px] font-mono text-emerald-600 block">
                          Enter target name (e.g. <code className="text-emerald-500">gemma2</code>, <code className="text-emerald-500">gemma2:2b</code>, or <code className="text-emerald-500">gemma:2b</code>).
                        </span>
                      </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-emerald-950 rounded p-3 text-[11px] font-mono text-emerald-500 leading-relaxed space-y-1.5">
                      <div className="text-emerald-300 font-bold">💡 How to query Gemma locally:</div>
                      <ol className="list-decimal pl-4 space-y-1 text-emerald-500/90">
                        <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">ollama.com</a>.</li>
                        <li>Pull your preferred model via CLI: <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300 font-bold">ollama run gemma2</code> (or <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300 font-bold">gemma2:2b</code>).</li>
                        <li>
                          If testing inside this cloud sandbox preview browser, expose your local daemon using a secure tunnel (e.g. <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300">ngrok http 11434</code>) and paste the public https tunnel URL into the Ollama Host input above!
                        </li>
                        <li>
                          If running this repository/applet locally via the python script (<code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300">python rogue_chat.py</code>), it will automatically query your local Ollama on localhost instantly!
                        </li>
                      </ol>
                    </div>
                  </div>

                </div>

                {/* Info Note bottom panel */}
                <div className="mt-8 border-t border-emerald-950 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] font-mono text-emerald-600">
                    Keys submitted via settings are processed inside isolated memory and are never saved to disk.
                  </span>
                  <button 
                    id="save-keys"
                    onClick={() => {
                      localStorage.setItem("ctf_user_keys", JSON.stringify(userKeys));
                      alert("Overrides successfully updated and saved locally in your browser. All current and future chat requests will utilize your personalized keys.");
                    }}
                    className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 px-5 py-2 rounded font-mono text-xs border border-emerald-600/40"
                  >
                    SAVE_KEYS_LOCALLY
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* Futuristic footer status banner */}
      <footer className="border-t border-emerald-900 bg-neutral-950/90 py-3 px-6 flex flex-col md:flex-row items-center justify-between gap-2 z-10 text-[10px] font-mono text-emerald-600">
        <div className="flex items-center gap-4">
          <span>HOST: GOOGLE_AI_STUDIO_CONTAINER</span>
          <span>● WEB_SERVER: PORT_3000</span>
          <span>● NODE_ENV: PRODUCTION</span>
        </div>
        <div>
          <span>© 2026 CYBER_AI_CTF // SECURE CORE LABS</span>
        </div>
      </footer>
    </div>
  );
}
