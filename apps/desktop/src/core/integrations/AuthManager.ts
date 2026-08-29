import { invoke } from '@tauri-apps/api/core';

export class AuthManager {
  static async setToken(pluginId: string, token: string) {
    try {
      await invoke('settings_set_provider_token', { input: { provider_id: pluginId, token } });
    } catch (e) {
      console.error(`Failed to set token for ${pluginId} in backend`, e);
      throw new Error(`Failed to securely save token for ${pluginId}`);
    }
  }

  static async getToken(pluginId: string): Promise<string | null> {
    try {
      const token = await invoke<string | null>('settings_get_provider_token', { input: { provider_id: pluginId } });
      if (token) return token;
    } catch (e) {
      console.error(`Failed to get token for ${pluginId} from backend`, e);
    }
    return null;
  }

  static async removeToken(pluginId: string) {
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
