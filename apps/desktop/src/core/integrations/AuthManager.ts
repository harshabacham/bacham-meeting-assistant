import { invoke } from '@tauri-apps/api/core';

export class AuthManager {
  static async setToken(pluginId: string, token: string) {
    localStorage.setItem(`auth_token_${pluginId}`, token);
    try {
      await invoke('settings_set_provider_token', { input: { provider_id: pluginId, token } });
    } catch (e) {
      console.error(`Failed to set token for ${pluginId} in backend`, e);
    }
  }

  static async getToken(pluginId: string): Promise<string | null> {
    try {
      const token = await invoke<string | null>('settings_get_provider_token', { input: { provider_id: pluginId } });
      if (token) return token;
    } catch (e) {
      console.error(`Failed to get token for ${pluginId} from backend`, e);
    }
    return localStorage.getItem(`auth_token_${pluginId}`);
  }

  static async removeToken(pluginId: string) {
    localStorage.removeItem(`auth_token_${pluginId}`);
    try {
      await invoke('settings_remove_provider_token', { input: { provider_id: pluginId } });
    } catch (e) {
      console.error(`Failed to remove token for ${pluginId} in backend`, e);
    }
  }

  static async isAuthenticated(pluginId: string): Promise<boolean> {
    const token = await this.getToken(pluginId);
    return !!token;
  }
}
