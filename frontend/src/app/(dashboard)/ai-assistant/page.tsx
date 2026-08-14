"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Mic, MicOff, Send, User, Volume2, VolumeX } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";

interface ChatMessage {
  id: number;
  role: "user" | "model";
  text: string;
}

interface ChatbotResponse {
  reply: string;
  tool_calls?: { name: string; args: Record<string, unknown> }[];
}

const SUGGESTIONS = [
  "Who is on leave today?",
  "Who is late today?",
  "Who is absent today?",
  "Show pending leave requests",
];

// The Web Speech API isn't part of the standard TS DOM lib — a minimal shim for the bits we use.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function AiAssistantPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    setVoiceSupported(
      Boolean(getSpeechRecognition()) && typeof window !== "undefined" && "speechSynthesis" in window
    );
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: ++idRef.current, role: "user", text: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await apiFetch<ChatbotResponse>("/chatbot/ask", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, history }),
      });
      setMessages((prev) => [...prev, { id: ++idRef.current, role: "model", text: res.reply }]);
      if (speakEnabled) speak(res.reply);
    } catch {
      toast.error("The assistant couldn't answer that. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function toggleListening() {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <PageHeader
        title="AI Assistant"
        description="Ask about employees, attendance, and leave — answered live from your company data"
        actions={
          voiceSupported ? (
            <Button
              type="button"
              variant={speakEnabled ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSpeakEnabled((v) => !v)}
            >
              {speakEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              {speakEnabled ? "Voice replies on" : "Voice replies off"}
            </Button>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                <Bot className="size-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Ask me anything about your team</p>
                <p className="mt-1 text-sm text-gray-400">I answer using your live attendance and leave data.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-brand-900/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      m.role === "user"
                        ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                    )}
                  >
                    {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  <div
                    className={cn(
                      "group max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                    )}
                  >
                    {m.text}
                    {m.role === "model" && voiceSupported && (
                      <button
                        type="button"
                        onClick={() => speak(m.text)}
                        className="ml-2 inline-flex opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                        aria-label="Read aloud"
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                    <Bot className="size-4" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2.5 dark:bg-gray-700">
                    <Loader2 className="size-3.5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400">Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                listening
                  ? "animate-pulse bg-danger-100 text-danger-600 dark:bg-danger-900/30"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              )}
              aria-label={listening ? "Stop listening" : "Speak your question"}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder={listening ? "Listening…" : "Ask about employees, attendance, or leave…"}
            className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <Button type="submit" size="sm" isLoading={sending} disabled={!input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
