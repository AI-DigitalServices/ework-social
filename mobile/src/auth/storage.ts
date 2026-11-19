import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'ework.refreshToken';
const WORKSPACE_KEY = 'ework.workspaceId';

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* nothing stored */
  }
}

export async function getWorkspaceId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(WORKSPACE_KEY);
  } catch {
    return null;
  }
}

export async function saveWorkspaceId(id: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(WORKSPACE_KEY, id);
  } catch {
    /* non-critical */
  }
}

export async function clearWorkspaceId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(WORKSPACE_KEY);
  } catch {
    /* nothing stored */
  }
}
