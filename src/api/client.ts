// Grab the VITE_API_URL that Vite injects at build time
const API_BASE = (import.meta as any).env.VITE_API_URL as string;

if (!API_BASE) {
  throw new Error("VITE_API_URL is not defined. Make sure you set it in .env");
}

// Append /api to the base URL since your endpoints expect it
const API_ENDPOINT = `${API_BASE}/api`;

class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_ENDPOINT}${endpoint}`;
    const config = {
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP error ${response.status}`,
        }));

        // Structured error with status code and message
        const error = new Error(
          errorData.message || `HTTP ${response.status}`
        ) as Error & {
          status?: number;
          data?: any;
        };
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string) {
    return this.request("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async logout() {
    return this.request("/logout", {
      method: "POST",
    });
  }

  async getCurrentUser() {
    return this.request("/user");
  }

  async getUserProfile() {
    return this.request("/users/profile");
  }

  async updateUserProfile(data: any) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request("/users/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async updateNotificationPreferences(preferences: any) {
    return this.request("/users/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
  }

  async updatePrivacySettings(settings: any) {
    return this.request("/users/privacy-settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  // AI Interactions
  async askQuestion(question: string) {
    return this.request("/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    return this.request("/voice", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // PDF Operations
  async uploadPdf(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return this.request("/upload-pdf", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async chatWithPdf(chatSessionId: number, message: string) {
    return this.request("/chat-pdf", {
      method: "POST",
      body: JSON.stringify({
        chat_session_id: chatSessionId,
        message: message,
      }),
    });
  }

  // Quiz Operations
  async getQuiz() {
    return this.request("/quiz");
  }

  async getQuizWithParams(difficulty?: string, chatSessionId?: number) {
    let url = "/quiz";
    const params = new URLSearchParams();

    if (chatSessionId) {
      params.append("chat_session_id", chatSessionId.toString());
    }
    if (difficulty) {
      params.append("difficulty", difficulty);
    }

    if (params.toString()) {
      url += "?" + params.toString();
    }

    return this.request(url);
  }

  async submitQuiz(answers: Array<{ questionId: number; isCorrect: boolean }>) {
    return this.request("/submit-quiz", {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  }

  // Dashboard
  async getDashboardData(range: string = "week") {
    return this.request(`/dashboard?range=${range}`);
  }
}

export const apiClient = new APIClient();
