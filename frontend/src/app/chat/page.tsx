"use client";
import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { getMe, getUniversities, sendMessage } from "@/lib/api";
import type { User, University, ChatMessage } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) { router.push("/auth/login"); return; }
    getMe()
      .then(({ data }) => {
        setUser(data);
        return getUniversities();
      })
      .then(({ data }) => {
        setUniversities(data);
        if (data.length === 1) setSelectedSlug(data[0].slug);
      })
      .catch(() => router.push("/auth/login"));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedSlug) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { data } = await sendMessage({
        university_slug: selectedSlug,
        message: question,
        session_id: sessionId,
      });
      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      toast.error("Failed to get response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Cookies.remove("access_token");
    router.push("/auth/login");
  }

  const selectedUniversity = universities.find((u) => u.slug === selectedSlug);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-primary-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-bold text-lg">CampusAI</h1>
            {selectedUniversity && (
              <p className="text-primary-200 text-xs">{selectedUniversity.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {universities.length > 1 && (
            <select
              value={selectedSlug}
              onChange={(e) => { setSelectedSlug(e.target.value); setMessages([]); }}
              className="bg-primary-800 text-white text-sm rounded-lg px-3 py-1.5 border border-primary-500"
            >
              <option value="">Select university…</option>
              {universities.map((u) => (
                <option key={u.slug} value={u.slug}>{u.name}</option>
              ))}
            </select>
          )}
          <div className="text-right">
            <p className="text-sm font-medium">{user?.full_name}</p>
            <button onClick={handleLogout} className="text-xs text-primary-200 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-5xl mb-4">🤖</p>
            <p className="text-lg font-medium">Ask anything about {selectedUniversity?.name || "your university"}</p>
            <p className="text-sm mt-2">I only answer from official content — no hallucinations.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              <ReactMarkdown className="prose prose-sm max-w-none">
                {msg.content}
              </ReactMarkdown>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sources</p>
                  {msg.sources.map((s, j) => (
                    <a
                      key={j}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-primary-600 hover:underline truncate"
                    >
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-5 py-3">
              <span className="text-gray-400 animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="border-t bg-white px-4 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedSlug || loading}
            placeholder={selectedSlug ? "Ask a question…" : "Select a university first"}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || !selectedSlug || loading}
            className="btn-primary px-6"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
