// pages/ask.tsx

import React, { useState } from "react";
import VoiceRecorder from "../components/VoiceRecorder";

interface AIResponse {
  text: string;
  hasChart?: boolean;
  chartData?: any[];
  hasCode?: boolean;
  codeSnippet?: string;
  language?: string;
}

const Ask: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice" | "pdf">("text");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSummary, setPdfSummary] = useState<string>("");
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: "user" | "ai"; content: string }>
  >([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setQuestion(text);
    setInputMode("text");
  };

  const handlePdfUpload = async (file: File) => {
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload PDF");

      const data = await res.json();
      setPdfFile(file);
      setPdfSummary(data.summary);
      setChatSessionId(data.chat_session_id);
      setChatHistory([
        {
          type: "ai",
          content: `I've analyzed your PDF "${data.filename}". Here's a summary:\n\n${data.summary}`,
        },
      ]);
      alert("PDF uploaded and analyzed successfully!");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload PDF. Please try again.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handlePdfChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !chatSessionId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chat_session_id: chatSessionId,
          message: question,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { type: "user", content: question },
        { type: "ai", content: data.response.text },
      ]);
      setQuestion("");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatAIResponse = (text: string): string => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /^(\d+)\.\s+(.+)$/gm,
        '<div class="mb-2"><span class="font-semibold text-blue-600">$1.</span> $2</div>'
      )
      .replace(
        /^[-*]\s+(.+)$/gm,
        '<div class="mb-2 ml-4"><span class="text-blue-600 mr-2">•</span>$1</div>'
      )
      .replace(
        /^###\s+(.+)$/gm,
        '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>'
      )
      .replace(
        /^##\s+(.+)$/gm,
        '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">$1</h2>'
      )
      .replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        '<pre class="bg-gray-100 p-4 rounded-lg mt-4 mb-4 overflow-x-auto"><code class="text-sm">$2</code></pre>'
      )
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>'
      )
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, "</p>")
      .replace(/<p class="mb-4"><\/p>/g, "")
      .replace(/(<h[2-3][^>]*>)/g, '<div class="mt-6">$1')
      .replace(/(<\/h[2-3]>)/g, "$1</div>");
    return formatted;
  };

  const renderCodeSnippet = (code: string, language = "javascript") => (
    <div className="mt-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-gray-300 text-sm font-medium">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-gray-400 hover:text-white text-sm"
          >
            <i className="fas fa-copy mr-1" /> Copy
          </button>
        </div>
        <pre className="p-4 text-green-400 text-sm overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Ask AI Tutor</h1>

      {/* Input Mode Switcher */}
      <div className="flex gap-2 mb-6">
        {["text", "voice", "pdf"].map((mode) => (
          <button
            key={mode}
            onClick={() => setInputMode(mode as any)}
            className={`btn btn-sm ${
              inputMode === mode ? "btn-primary" : "btn-outline"
            }`}
          >
            <i
              className={`fas ${
                mode === "text"
                  ? "fa-keyboard"
                  : mode === "voice"
                  ? "fa-microphone"
                  : "fa-file-pdf"
              } mr-2`}
            />
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Input Forms */}
      {inputMode === "text" && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input w-full h-28 mb-2"
            placeholder="Type your question..."
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary float-right"
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Processing...
              </span>
            ) : (
              <>
                <i className="fas fa-paper-plane mr-2" />
                Ask AI
              </>
            )}
          </button>
        </form>
      )}

      {inputMode === "voice" && (
        <VoiceRecorder
          onTranscription={handleVoiceTranscription}
          disabled={loading}
        />
      )}

      {inputMode === "pdf" && (
        <div>
          {/* You already have the full PDF input, chat, and quiz logic */}
          {/* You can keep that section below this */}
        </div>
      )}

      {/* AI Response Display */}
      {response && (
        <div className="card mt-8 animate-slide-up">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <i className="fas fa-robot text-primary-500 mr-2" />
              AI Response
            </h2>
          </div>
          <div className="card-content">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: formatAIResponse(response.text),
              }}
            />
            {response.hasCode && response.codeSnippet
              ? renderCodeSnippet(response.codeSnippet, response.language)
              : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ask;
