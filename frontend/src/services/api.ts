// FINDORA AI - Frontend API Service Client
import type { 
  Item, 
  MatchData, 
  VerificationResult, 
  RecoveryCase, 
  AnalyticsData, 
  ClaimantAnswer 
} from '../types';

const API_BASE = '/api';

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('findora_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register({ name, email, password, role = 'user', adminSecret = '' }: {
    name: string;
    email: string;
    password: string;
    role?: string;
    adminSecret?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, adminSecret })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async forgotPassword(email: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch reset code');
    return data;
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  },

  async getMe(): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
    return data;
  },

  // Items
  async getItems(filters: Record<string, string> = {}): Promise<{ items: Item[] }> {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/items?${params.toString()}`);
    return res.json();
  },

  async getItem(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async reportLost(itemData: Partial<Item>): Promise<any> {
    const res = await fetch(`${API_BASE}/items/lost`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  async reportFound(itemData: Partial<Item>): Promise<any> {
    const res = await fetch(`${API_BASE}/items/found`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  async uploadImage(file: File): Promise<{ imageUrl?: string; url?: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('findora_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/items/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  // Matches
  async getMatches(): Promise<{ matches: any[] }> {
    const res = await fetch(`${API_BASE}/matches`, { headers: getHeaders() });
    return res.json();
  },

  async getMatch(id: string): Promise<MatchData> {
    const res = await fetch(`${API_BASE}/matches/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async searchMatches(itemId: string, weights?: Record<string, number>): Promise<any> {
    const res = await fetch(`${API_BASE}/matches/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, weights })
    });
    return res.json();
  },

  // Claims & Blind Verification
  async initiateClaim(data: { foundItemId: string; lostItemId?: string | null; matchId?: string | null }): Promise<any> {
    const res = await fetch(`${API_BASE}/claims/initiate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async submitVerificationAnswers(claimId: string, answers: ClaimantAnswer[]): Promise<VerificationResult> {
    const res = await fetch(`${API_BASE}/claims/${claimId}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ answers })
    });
    return res.json();
  },

  async getClaim(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/claims/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async getClaims(): Promise<any> {
    const res = await fetch(`${API_BASE}/claims`, { headers: getHeaders() });
    return res.json();
  },

  // Admin
  async getAdminDashboard(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  async approveClaim(claimId: string, data: Record<string, any> = {}): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/claims/${claimId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async rejectClaim(claimId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/claims/${claimId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/reset-demo`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Recovery
  async getRecoveryCase(caseId: string): Promise<RecoveryCase> {
    const res = await fetch(`${API_BASE}/recovery/${caseId}`, { headers: getHeaders() });
    return res.json();
  },

  async completeHandover(caseId: string, handoverCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/recovery/${caseId}/handover`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ handoverCode })
    });
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  // Assistant
  async queryAssistant(query: string): Promise<any> {
    const res = await fetch(`${API_BASE}/assistant/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
    return res.json();
  },

  async markNotificationRead(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async markAllNotificationsRead(): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // 1-Time Code Verification & Search Closure
  async closeSearchByCode(closeCode: string, notes = ''): Promise<any> {
    const res = await fetch(`${API_BASE}/items/close-search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ closeCode, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to close search');
    return data;
  },

  async getMyReports(): Promise<any> {
    const res = await fetch(`${API_BASE}/items/my-reports`, { headers: getHeaders() });
    return res.json();
  },

  // Telegram Integration & Campus Community Hub
  async getTelegramStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/telegram/status`);
    return res.json();
  },

  async broadcastTelegramSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/telegram/broadcast-summary`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async simulateTelegramCommand(payload: { message: string; chatType?: string; username?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/telegram/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
