import { useSettingsStore } from '../stores/settingsStore';

export const useSettings = () => {
    return useSettingsStore();
};
