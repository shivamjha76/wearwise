import { API_BASE_URL } from "./api";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  skin_tone?: string | null;
  gender?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = "wearwise_token";
const USER_KEY = "wearwise_user";
const LEGACY_USER_ID_KEY = "wearwise_user_id";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_USER_ID_KEY, String(user.id));
  window.dispatchEvent(new Event("wearwise_auth_changed"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_ID_KEY);
  localStorage.removeItem("wearwise_recommendation");
  localStorage.removeItem("wearwise_style_preferences");
  window.dispatchEvent(new Event("wearwise_auth_changed"));
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const user: User = await res.json();
    setSession(token, user);
    return user;
  } catch {
    return null;
  }
}
