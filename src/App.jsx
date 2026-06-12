import './App.css'
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import AppLoader from '@/lib/AppLoader';
import ErrorBoundary from '@/lib/ErrorBoundary';
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const LoginPage = Pages['Login'];
const ResetPasswordPage = Pages['ResetPassword'];

// Pages that don't need the Layout wrapper or auth
const PUBLIC_PAGES = ['Login', 'ResetPassword'];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    isAuthenticated,
    isDemoMode,
    isPasswordRecovery,
  } = useAuth();

  // Password recovery takes priority over everything else: the user MUST set a
  // new password before doing anything in the app.
  if (isPasswordRecovery) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="*" element={<ResetPasswordPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AppLoader />;
  }

  // Handle authentication errors
  if (authError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Authentication Error</p>
          <p className="text-muted-foreground text-sm mb-4">{authError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated and not in demo mode, show login
  if (!isAuthenticated && !isDemoMode) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="/Login" element={<LoginPage />} />
          <Route path="/ResetPassword" element={<ResetPasswordPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Render the main app
  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).filter(([path]) => !PUBLIC_PAGES.includes(path)).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/Login" element={<LoginPage />} />
        {/* Public route — also reachable when already authenticated, e.g. during
            the brief window between USER_UPDATED and the success-screen navigate. */}
        <Route path="/ResetPassword" element={<ResetPasswordPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


// A production build with missing/placeholder Supabase env vars must fail
// loudly instead of silently booting the auth-less demo app against fake data.
const isProdMisconfigured = import.meta.env.PROD && (
  !import.meta.env.VITE_SUPABASE_URL ||
  !import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project')
);

const ConfigurationError = () => (
  <div className="fixed inset-0 flex items-center justify-center p-4 bg-background">
    <div className="text-center max-w-md">
      <p className="text-red-600 font-medium mb-2">Configuration Error</p>
      <p className="text-muted-foreground text-base md:text-sm">
        This deployment is missing its database configuration
        (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Please contact the
        administrator.
      </p>
    </div>
  </div>
);

function App() {

  if (isProdMisconfigured) {
    return <ConfigurationError />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            {/* Base44 sandbox tooling: dev-only. In production these exposed an
                origin-unchecked postMessage surface and leaked URLs to any
                parent frame. */}
            {import.meta.env.DEV && <NavigationTracker />}
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster />
          {import.meta.env.DEV && <VisualEditAgent />}
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
