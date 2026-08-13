import { pluginManager } from './PluginManager';

export class SyncEngine {
  static async syncAll() {
    const plugins = pluginManager.getPlugins();
    for (const plugin of plugins) {
      if (plugin.actions?.sync) {
        console.log(`[SyncEngine] Syncing ${plugin.manifest.name}...`);
        try {
          await plugin.actions.sync();
        } catch (e) {
          console.error(`[SyncEngine] Sync failed for ${plugin.manifest.name}`, e);
        }
      }
    }
  }
}
