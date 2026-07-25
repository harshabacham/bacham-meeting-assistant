import { useState, useEffect } from 'react';
import { TauriClient, ProviderConfig, SaveProviderConfigPayload } from '@/infrastructure/tauri-client';
import { Loader2, Key, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/components';

export function ProviderSettings() {
    const [configs, setConfigs] = useState<ProviderConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await TauriClient.listProviders();
            setConfigs(data);
        } catch (e) {
            console.error("Failed to load provider configs", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    const handleSave = async (provider: string, enabled: boolean) => {
        setSaving(provider);
        const config = configs.find(c => c.provider === provider);
        const apiKey = apiKeys[provider];

        const payload: SaveProviderConfigPayload = {
            provider,
            enabled,
            defaultModel: config?.defaultModel,
            apiKey: apiKey?.trim() ? apiKey.trim() : undefined,
        };

        try {
            await TauriClient.saveProviderConfig(payload);
            setApiKeys(prev => ({ ...prev, [provider]: '' })); // clear input
            await loadConfigs();
        } catch (e) {
            console.error("Failed to save provider config", e);
            alert(`Failed to save config: ${e}`);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-[var(--text-muted)]">
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-[var(--text-primary)]">Secure Key Storage</p>
                    <p className="text-[var(--text-muted)] mt-1">
                        API keys are stored securely in your OS keychain (Credential Manager on Windows, Keychain on macOS). They never leave your device.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {configs.map(config => (
                    <div 
                        key={config.id} 
                        className={cn(
                            "border p-4 rounded-xl transition-colors",
                            config.enabled 
                                ? "border-[var(--accent)] bg-[var(--surface-highlight)]" 
                                : "border-[var(--border)] bg-[var(--surface)]"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-[var(--text-primary)] capitalize">
                                    {config.provider}
                                </h3>
                                {config.enabled && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)] text-foreground px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={10} /> Active
                                    </span>
                                )}
                            </div>
                            
                            {!config.enabled && (
                                <button
                                    onClick={() => handleSave(config.provider, true)}
                                    disabled={saving !== null || (!config.hasKey && !apiKeys[config.provider])}
                                    className="text-xs font-medium px-3 py-1.5 bg-[var(--surface-raised)] hover:bg-[var(--surface-highlight)] border border-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Set Active
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">
                                    API Key
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="password"
                                            value={apiKeys[config.provider] || ''}
                                            onChange={(e) => setApiKeys(prev => ({ ...prev, [config.provider]: e.target.value }))}
                                            placeholder={config.hasKey ? "•••••••••••••••• (Key is set)" : "Enter API Key"}
                                            className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSave(config.provider, config.enabled)}
                                        disabled={saving === config.provider || !apiKeys[config.provider]}
                                        className="px-4 py-1.5 bg-[var(--accent)] text-foreground text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                                    >
                                        {saving === config.provider ? <Loader2 size={14} className="animate-spin" /> : 'Save Key'}
                                    </button>
                                </div>
                            </div>

                            {config.provider !== 'gemini' && (
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">
                                        Default Model
                                    </label>
                                    <input
                                        type="text"
                                        value={config.defaultModel || ''}
                                        readOnly
                                        className="w-full px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] opacity-70 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                        Custom model overrides coming in a future update.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
