import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RightClickBlocker } from "@/components/RightClickBlocker";
import { GlobalKeyboardShortcuts } from "@/components/GlobalKeyboardShortcuts";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CreateContest = lazy(() => import("./pages/admin/CreateContest"));
const EditContest = lazy(() => import("./pages/admin/EditContest"));
const ContestLeaderboard = lazy(() => import("./pages/admin/ContestLeaderboard"));
const SubmissionsList = lazy(() => import("./pages/admin/SubmissionsList"));
const ContestReport = lazy(() => import("./pages/admin/ContestReport"));
const StudentEntry = lazy(() => import("./pages/student/StudentEntry"));
const ContestPage = lazy(() => import("./pages/contest/ContestPage"));
const ProblemSolver = lazy(() => import("./pages/contest/ProblemSolver"));
const ContestLeaderboardPage = lazy(() => import("./pages/contest/ContestLeaderboardPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RightClickBlocker />
      <BrowserRouter>
        <GlobalKeyboardShortcuts>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<ErrorBoundary context="Landing"><Index /></ErrorBoundary>} />
              <Route path="/admin/login" element={<ErrorBoundary context="AdminLogin"><AdminLogin /></ErrorBoundary>} />
              <Route path="/admin/dashboard" element={<ErrorBoundary context="AdminDashboard"><AdminDashboard /></ErrorBoundary>} />
              <Route path="/admin/contest/new" element={<ErrorBoundary context="CreateContest"><CreateContest /></ErrorBoundary>} />
              <Route path="/admin/contest/:contestId" element={<ErrorBoundary context="EditContest"><EditContest /></ErrorBoundary>} />
              <Route path="/admin/contest/:contestId/leaderboard" element={<ErrorBoundary context="AdminLeaderboard"><ContestLeaderboard /></ErrorBoundary>} />
              <Route path="/admin/contest/:contestId/submissions" element={<ErrorBoundary context="Submissions"><SubmissionsList /></ErrorBoundary>} />
              <Route path="/admin/contest/:contestId/report" element={<ErrorBoundary context="ContestReport"><ContestReport /></ErrorBoundary>} />
              <Route path="/student/entry" element={<ErrorBoundary context="StudentEntry"><StudentEntry /></ErrorBoundary>} />
              <Route path="/contest/:contestId" element={<ErrorBoundary context="ContestPage"><ContestPage /></ErrorBoundary>} />
              <Route path="/contest/:contestId/problem/:problemId" element={<ErrorBoundary context="ProblemSolver"><ProblemSolver /></ErrorBoundary>} />
              <Route path="/contest/:contestId/leaderboard" element={<ErrorBoundary context="Leaderboard"><ContestLeaderboardPage /></ErrorBoundary>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </GlobalKeyboardShortcuts>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
