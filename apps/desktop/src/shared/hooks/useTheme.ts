import { useSettingsStore } from '../stores/settingsStore';

export const useTheme = () => {
    return useSettingsStore(state => state.settings?.theme || 'system');
};
