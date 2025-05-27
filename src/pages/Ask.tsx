import React, { useState } from 'react'
import VoiceRecorder from '../components/VoiceRecorder'

interface AIResponse {
  text: string
  hasChart?: boolean
  chartData?: any[]
  hasCode?: boolean
  codeSnippet?: string
  language?: string
}

const Ask: React.FC = () => {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [useVoice, setUseVoice] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ question }),
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const data = await res.json()
      setResponse(data)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to get AI response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceTranscription = (text: string) => {
    setQuestion(text)
    setUseVoice(false)
  }

  const renderCodeSnippet = (code: string, language: string = 'javascript') => (
    <div className="mt-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-gray-300 text-sm font-medium">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-gray-400 hover:text-white text-sm"
          >
            <i className="fas fa-copy mr-1"></i>
            Copy
          </button>
        </div>
        <pre className="p-4 text-green-400 text-sm overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask AI Tutor</h1>
        <p className="text-gray-600">
          Get instant explanations and help with your questions using voice or text input.
        </p>
      </div>

      {/* Input Section */}
      <div className="card mb-8">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">What would you like to learn?</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setUseVoice(!useVoice)}
                className={`btn btn-sm ${useVoice ? 'btn-primary' : 'btn-outline'}`}
              >
                <i className="fas fa-microphone mr-2"></i>
                Voice
              </button>
              <button
                onClick={() => setUseVoice(false)}
                className={`btn btn-sm ${!useVoice ? 'btn-primary' : 'btn-outline'}`}
              >
                <i className="fas fa-keyboard mr-2"></i>
                Text
              </button>
            </div>
          </div>
        </div>

        <div className="card-content">
          {useVoice ? (
            <div className="text-center py-8">
              <VoiceRecorder 
                onTranscription={handleVoiceTranscription} 
                disabled={loading}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask your question here... (e.g., 'Explain how machine learning works', 'What is the difference between React and Vue?')"
                  className="input w-full h-32 resize-none"
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
                      <i className="fas fa-paper-plane mr-2"></i>
                      Ask AI
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Response Section */}
      {response && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <i className="fas fa-robot text-primary-500 mr-2"></i>
              AI Response
            </h2>
          </div>
          <div className="card-content">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {response.text}
              </div>

              {response.hasCode && response.codeSnippet && (
                renderCodeSnippet(response.codeSnippet, response.language)
              )}

              {response.hasChart && response.chartData && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Visual Representation</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-center">
                      Chart visualization would be displayed here based on the data provided.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuestion('')}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Ask Another Question
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Powered by Gemini Pro AI
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      {!response && !loading && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-lg">Try asking about:</h3>
          </div>
          <div className="card-content">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Explain quantum physics in simple terms',
                'How does machine learning work?',
                'What are the differences between Python and JavaScript?',
                'How to solve quadratic equations?',
                'Explain the water cycle',
                'What is blockchain technology?'
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
  )
}

export default Ask
