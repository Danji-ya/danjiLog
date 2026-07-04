import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import MobileLayout from "@/layouts/MobileLayout";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import CalendarPage from "@/pages/CalendarPage";
import SettingsPage from "@/pages/SettingsPage";

// recharts는 번들이 커서 통계 페이지만 지연 로딩합니다.
const StatsPage = lazy(() => import("@/pages/StatsPage"));

function PageFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-ios-gray-400">
      불러오는 중...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <MobileLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route
              path="/stats"
              element={
                <Suspense fallback={<PageFallback />}>
                  <StatsPage />
                </Suspense>
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
