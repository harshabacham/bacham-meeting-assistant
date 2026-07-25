import { useAppStore } from '../stores/appStore';

export const useConnectionStatus = () => {
    return useAppStore(state => state.nativeStatus);
};
