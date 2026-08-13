import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { ThemeProvider } from './shared/contexts/ThemeContext';
import { ErrorBoundary } from './shared/contexts/ErrorBoundary';
import { useAuthStore } from "./shared/stores/authStore";
import { useSettingsStore } from "./shared/stores/settingsStore";
import { SplashScreen } from "./components/ui/SplashScreen";
import { AnimatePresence } from "framer-motion";
import { ToastProvider } from './components/ui/ToastProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

// Lazy loaded routes (Tier 1 Startup Optimization)
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const LectureViewerPage = lazy(() => import("./pages/LectureViewerPage").then(m => ({ default: m.LectureViewerPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));

const TrashPage = lazy(() => import("./pages/TrashPage").then(m => ({ default: m.TrashPage })));
const AiWorkspacePage = lazy(() => import("./features/ai_workspace/AiWorkspacePage").then(m => ({ default: m.AiWorkspacePage })));
const NotesWorkspacePage = lazy(() => import("./features/notes_workspace/NotesWorkspacePage").then(m => ({ default: m.NotesWorkspacePage })));
const TasksPage = lazy(() => import("./pages/TasksPage").then(m => ({ default: m.TasksPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then(m => ({ default: m.TermsPage })));
const KnowledgeBasePage = lazy(() => import("./pages/KnowledgeBasePage").then(m => ({ default: m.KnowledgeBasePage })));

const LiveWorkspacePage = lazy(() => import("./pages/LiveWorkspacePage").then(m => ({ default: m.LiveWorkspacePage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

const CopilotWindow = lazy(() => import("./pages/CopilotWindow").then(m => ({ default: m.CopilotWindow })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
  
  if (!hasSeenOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (hasSeenOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const language = useSettingsStore((state) => state.settings?.language);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (language) {
      import('./i18n/config').then(({ default: i18n }) => {
        i18n.changeLanguage(language);
      });
    }
  }, [language]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Suspense fallback={<SplashScreen />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/copilot" element={<CopilotWindow />} />
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardPage />} />
                    <Route path="lectures" element={<LibraryPage />} />
                    <Route path="lectures/:id" element={<LectureViewerPage />} />
                    <Route path="ai" element={<AiWorkspacePage />} />
                    <Route path="notes" element={<NotesWorkspacePage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="trash" element={<TrashPage />} />
                    <Route path="knowledge" element={<KnowledgeBasePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="terms" element={<TermsPage />} />
                    <Route path="live" element={<LiveWorkspacePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </AnimatePresence>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
