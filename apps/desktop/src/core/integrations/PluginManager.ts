import { BachamPlugin } from './types';

class PluginManager {
  private plugins: Map<string, BachamPlugin> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Use Vite's glob import to automatically discover all plugins synchronously
    const pluginModules = import.meta.glob('../../plugins/*/index.{ts,tsx}', { eager: true });
    
    for (const path in pluginModules) {
      try {
        const mod: any = pluginModules[path];
        if (mod.default && mod.default.manifest) {
          const plugin = mod.default as BachamPlugin;
          this.plugins.set(plugin.manifest.id, plugin);
          console.log(`[PluginManager] Loaded plugin: ${plugin.manifest.name}`);
        }
      } catch (err) {
        console.error(`[PluginManager] Failed to load plugin at ${path}`, err);
      }
    }
  }

  getPlugins(): BachamPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): BachamPlugin | undefined {
    return this.plugins.get(id);
  }
}

export const pluginManager = new PluginManager();
