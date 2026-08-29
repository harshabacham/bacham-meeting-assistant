export interface BachamPlugin {
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    icon?: string;
    category: 'Calendar' | 'Notes' | 'Storage' | 'Developer' | 'Communication' | 'Tasks' | 'AI Providers';
    permissions: string[];
    author: string;
    setupGuide?: {
      url?: string;
      urlLabel?: string;
      steps: string[];
    };
  };
  auth?: {
    type: 'oauth2' | 'api_key' | 'none';
    fields?: {
      id: string;
      label: string;
      placeholder?: string;
      type?: 'text' | 'password';
    }[];
    authenticate?: (credentials?: any) => Promise<void>;
    disconnect?: () => Promise<void>;
    isConnected: () => Promise<boolean>;
  };
  actions?: {
    sync?: () => Promise<{status: 'success' | 'error', message?: string}>;
    export?: (data: any) => Promise<{status: 'success' | 'error', message?: string}>;
  };
  components?: {
    SettingsCard?: React.FC<{plugin: BachamPlugin}>;
    SettingsPanel?: React.FC<{plugin: BachamPlugin}>;
  };
}
