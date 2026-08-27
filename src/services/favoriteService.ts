import { apiFetch } from './api';
import { ApiMonument, mapApiMonumentToLocal } from './monumentService';

export const getFavorites = async (
  userId: string,
  authToken?: string | null
): Promise<ApiMonument[]> => {
  const headers: any = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const result = await apiFetch(`/api/users/${userId}/favorites`, {
    headers,
  });
  return (result.data || []).map(mapApiMonumentToLocal);
};

export const addFavorite = async (
  userId: string,
  monumentId: string,
  authToken?: string | null
): Promise<string[]> => {
  const headers: any = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const result = await apiFetch(`/api/users/${userId}/favorites/${monumentId}`, {
    method: 'POST',
    headers,
  });
  // Map ObjectIds to string array
  return (result.data || []).map((id: any) => id.toString());
};

export const removeFavorite = async (
  userId: string,
  monumentId: string,
  authToken?: string | null
): Promise<string[]> => {
  const headers: any = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const result = await apiFetch(`/api/users/${userId}/favorites/${monumentId}`, {
    method: 'DELETE',
    headers,
  });
  // Map ObjectIds to string array
  return (result.data || []).map((id: any) => id.toString());
};
