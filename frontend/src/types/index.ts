// Findora Vault - TypeScript Interfaces & Types

export type UserRole = 'student' | 'verification_officer' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  timestamp?: string;
  createdAt?: string;
}

export interface AuthContextType {
  currentUser: User | null;
  token: string;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOfficer: boolean;
  isStudent: boolean;
  role: string;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => void;
  personas?: User[];
  switchPersona?: (id: string) => Promise<void>;
}

export interface Item {
  id: string;
  title: string;
  type: 'LOST' | 'FOUND' | string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  building?: string;
  floor?: number | string;
  location: string;
  event_time?: string;
  description?: string;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_tag?: string;
  status?: string;
  condition?: string;
  created_at?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface MatchScoreBreakdown {
  visual_score: number;
  text_score: number;
  location_score: number;
  time_score: number;
  category_score: number;
  attribute_score: number;
  final_score: number;
  lost_title?: string;
  found_title?: string;
  id: string;
  explanation?: {
    why?: string;
    evidence?: string[];
    uncertainty?: string[];
  };
}

export interface MatchData {
  id: string;
  match: MatchScoreBreakdown;
  lost_item: Item;
  found_item: Item;
}

export interface VerificationQuestion {
  id: string;
  question_key: string;
  prompt: string;
}

export interface ClaimantAnswer {
  question_id: string;
  question_key: string;
  claimant_answer: string;
}

export interface VerificationResult {
  ownership_confidence: number;
  risk?: {
    risk_score: number;
    risk_level: string;
  };
  sticker_match?: boolean;
  damage_match?: boolean;
  unique_attr_match?: boolean;
  [key: string]: any;
}

export interface TimelineStep {
  title: string;
  actor: string;
  completed: boolean;
  timestamp?: string;
}

export interface RecoveryCase {
  id: string;
  handover_code: string;
  pickup_location: string;
  claimant_name?: string;
  claimant_email?: string;
  status: string;
  timeline: TimelineStep[];
  [key: string]: any;
}

export interface Hotspot {
  building: string;
  lostCount: number;
  foundCount: number;
  rate: number;
  latitude?: number;
  longitude?: number;
}

export interface AnalyticsSummary {
  mostLostCategory: string;
  mostCommonLocation: string;
  peakLossWindow: string;
  recoveryRate: string | number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  hotspots: Hotspot[];
  hourlyTrends: Array<{ hour: string; losses: number }>;
  categoryDistribution?: Array<{ name: string; value: number }>;
  stats?: Record<string, any>;
}
