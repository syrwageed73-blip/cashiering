import { AppStatePayload, UserProfile } from './types';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function getAccessToken(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  if (!data.session?.access_token) {
    throw new Error('No authenticated Supabase session found.');
  }

  return data.session.access_token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error || 'API request failed.';
    throw new Error(message);
  }

  return body as T;
}

export async function fetchAppState(): Promise<AppStatePayload | null> {
  const response = await apiRequest<{ data: AppStatePayload | null }>('/state');
  return response.data;
}

export async function fetchCurrentUserProfile(): Promise<UserProfile> {
  const response = await apiRequest<{ data: UserProfile }>('/me');
  return response.data;
}

export async function saveAppState(state: AppStatePayload): Promise<AppStatePayload> {
  const response = await apiRequest<{ data: AppStatePayload }>('/state', {
    method: 'PUT',
    body: JSON.stringify(state),
  });

  return response.data;
}
