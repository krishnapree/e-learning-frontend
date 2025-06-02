// src/pages/Ask.tsx
// -----------------
// Fully balanced, revised Ask component (React + TypeScript + Vite + Tailwind).

import React, { useState } from "react";
import VoiceRecorder from "../components/VoiceRecorder";
import { apiClient } from "../api/client";

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

  // Handle text‐based question submissions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const data = await apiClient.askQuestion(question);
      setResponse(data);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Receive transcribed text from the VoiceRecorder
  const handleVoiceTranscription = (text: string) => {
    setQuestion(text);
    setInputMode("text");
  };

  // Handle PDF uploads: send file to backend and initialize chat
  const handlePdfUpload = async (file: File) => {
    setUploadingPdf(true);
    try {
      const data = await apiClient.uploadPdf(file);
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

  // Chat with the PDF: send question along with session ID
  const handlePdfChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !chatSessionId) return;

    setLoading(true);
    try {
      const data = await apiClient.chatWithPdf(chatSessionId, question);

      // Append user message and AI response to chat history
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

  // Convert AI text (markdown‐style) into HTML fragments
  const formatAIResponse = (text: string): string => {
    let formatted = text
      // **bold**
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // *italic*
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Numbered lists
      .replace(
        /^(\d+)\.\s+(.+)$/gm,
        '<div class="mb-2"><span class="font-semibold text-blue-600">$1.</span> $2</div>'
      )
      // Bullet points (- or *)
      .replace(
        /^[-*]\s+(.+)$/gm,
        '<div class="mb-2 ml-4"><span class="text-blue-600 mr-2">•</span>$1</div>'
      )
      // Headings ### and ##
      .replace(
        /^###\s+(.+)$/gm,
        '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>'
      )
      .replace(
        /^##\s+(.+)$/gm,
        '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">$1</h2>'
      )
      // Code blocks ```lang
      .replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        '<pre class="bg-gray-100 p-4 rounded-lg mt-4 mb-4 overflow-x-auto"><code class="text-sm">$2</code></pre>'
      )
      // Inline code `code`
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>'
      )
      // Convert double line breaks to paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Wrap entire string in <p> … </p>
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, "</p>")
      // Remove any empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, "")
      // Ensure spacing around headings
      .replace(/(<h[2-3][^>]*>)/g, '<div class="mt-6">$1')
      .replace(/(<\/h[2-3]>)/g, "$1</div>");

    return formatted;
  };

  // Render a code snippet block with syntax highlighting and a copy button
  const renderCodeSnippet = (code: string, language: string = "javascript") => (
    <div className="mt-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-gray-300 text-sm font-medium">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-gray-400 hover:text-white text-sm"
          >
            <i className="fas fa-copy mr-1"></i> Copy
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask AI Tutor</h1>
        <p className="text-gray-600">
          Get instant explanations and help with your questions using voice or
          text input.
        </p>
      </div>

      {/* Input Selector & Form Card */}
      <div className="card mb-8 shadow">
        <div className="card-header bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg font-medium text-gray-800">
              What would you like to learn?
            </h2>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`btn btn-sm ${
                  inputMode === "text" ? "btn-primary" : "btn-outline"
                }`}
              >
                <i className="fas fa-keyboard mr-2"></i> Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode("voice")}
                className={`btn btn-sm ${
                  inputMode === "voice" ? "btn-primary" : "btn-outline"
                }`}
              >
                <i className="fas fa-microphone mr-2"></i> Voice
              </button>
              <button
                type="button"
                onClick={() => setInputMode("pdf")}
                className={`btn btn-sm ${
                  inputMode === "pdf" ? "btn-primary" : "btn-outline"
                }`}
              >
                <i className="fas fa-file-pdf mr-2"></i> PDF
              </button>
            </div>
          </div>
        </div>

        <div className="card-content bg-white p-6">
          {/* Voice Mode */}
          {inputMode === "voice" && (
            <div className="text-center py-8">
              <VoiceRecorder
                onTranscription={handleVoiceTranscription}
                disabled={loading}
              />
            </div>
          )}

          {/* PDF Mode */}
          {inputMode === "pdf" && (
            <>
              <div className="space-y-6">
                {/* If no PDF uploaded yet, show upload button */}
                {!pdfFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <i className="fas fa-file-pdf text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload a PDF Document
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Upload a PDF to get an AI summary and chat about its
                      contents.
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                      className="hidden"
                      id="pdf-upload"
                      disabled={uploadingPdf}
                    />
                    <label
                      htmlFor="pdf-upload"
                      className={`btn btn-primary ${
                        uploadingPdf
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {uploadingPdf ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Processing PDF...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload mr-2"></i> Choose PDF
                          File
                        </>
                      )}
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum file size: 10MB
                    </p>
                  </div>
                ) : (
                  <>
                    {/* PDF Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center">
                      <i className="fas fa-file-pdf text-blue-600 text-xl mr-3"></i>
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {pdfFile.name}
                        </h4>
                        <p className="text-sm text-blue-700">
                          PDF uploaded and analyzed
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setPdfSummary("");
                          setChatSessionId(null);
                          setChatHistory([]);
                        }}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>

                    {/* Chat History */}
                    {chatHistory.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Conversation
                        </h4>
                        <div className="space-y-3">
                          {chatHistory.map((msg, index) => (
                            <div
                              key={index}
                              className={`flex ${
                                msg.type === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  msg.type === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white border border-gray-200"
                                }`}
                              >
                                {msg.type === "user" ? (
                                  <p className="text-sm whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                ) : (
                                  <div
                                    className="text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: formatAIResponse(msg.content),
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Input Form */}
                    <form
                      onSubmit={handlePdfChat}
                      className="space-y-4"
                    >
                      <div>
                        <textarea
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Ask questions about your PDF... (e.g., 'What are the main points?', 'Explain this concept in detail')"
                          className="input w-full h-24 resize-none border border-gray-300 rounded p-2"
                          disabled={loading}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => {
                            // Navigate to quiz page with PDF session
                            window.location.href = `/quiz?chat_session_id=${chatSessionId}`;
                          }}
                          className="btn btn-outline btn-sm"
                          disabled={!chatSessionId}
                        >
                          <i className="fas fa-question-circle mr-2"></i> Generate
                          Quiz
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !question.trim()}
                          className="btn btn-primary"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane mr-2"></i> Send
                              Message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          )}

          {/* Text Mode */}
          {inputMode === "text" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask your question here... (e.g., 'Explain how machine learning works', 'What is the difference between React and Vue?')"
                  className="input w-full h-32 resize-none border border-gray-300 rounded p-2"
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i> Ask AI
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* AI Response Section */}
      {response && (
        <div className="card animate-slide-up shadow">
          <div className="card-header bg-white border-b px-4 py-3">
            <h2 className="card-title flex items-center text-lg font-medium text-gray-800">
              <i className="fas fa-robot text-primary-500 mr-2"></i> AI Response
            </h2>
          </div>
          <div className="card-content bg-white p-6">
            <div className="prose max-w-none">
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatAIResponse(response.text) }}
              />
            </div>

            {response.hasCode &&
              response.codeSnippet &&
              renderCodeSnippet(response.codeSnippet, response.language)}

            {response.hasChart && response.chartData && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-4">Visual Representation</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-center">
                    Chart visualization would be displayed here based on the data
                    provided.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuestion("")}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-plus mr-2"></i> Ask Another Question
                  </button>
                </div>
                <div className="text-sm text-gray-500">Powered by Gemini Pro AI</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      {!response && !loading && (
        <div className="card shadow">
          <div className="card-header bg-white border-b px-4 py-3">
            <h3 className="card-title text-lg font-medium text-gray-800">Try asking about:</h3>
          </div>
          <div className="card-content bg-white p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Explain quantum physics in simple terms",
                "How does machine learning work?",
                "What are the differences between Python and JavaScript?",
                "How to solve quadratic equations?",
                "Explain the water cycle",
                "What is blockchain technology?",
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(example)}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <i className="fas fa-lightbulb text-warning-500 mr-2"></i>
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ask;
