const API_BASE = '/api'

class APIClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const config = {
      credentials: 'include' as RequestCredentials,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: 'An error occurred' 
      }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  async logout() {
    return this.request('/logout', {
      method: 'POST',
    })
  }

  async getCurrentUser() {
    return this.request('/user')
  }

  // AI Interactions
  async askQuestion(question: string) {
    return this.request('/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  }

  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.wav')
    
    return this.request('/voice', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  // Quiz
  async getQuiz() {
    return this.request('/quiz')
  }

  async submitQuiz(answers: Array<{ questionId: number; isCorrect: boolean }>) {
    return this.request('/submit-quiz', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
  }

  // Dashboard
  async getDashboardData(range: string = 'week') {
    return this.request(`/dashboard?range=${range}`)
  }

  // Subscription
  async getSubscriptionPlans() {
    return this.request('/subscription/plans')
  }

  async getSubscriptionStatus() {
    return this.request('/subscription/status')
  }

  async createCheckoutSession(planId: string) {
    return this.request('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    })
  }

  async getCustomerPortal() {
    return this.request('/subscription/portal', {
      method: 'POST',
    })
  }
}

export const apiClient = new APIClient()
