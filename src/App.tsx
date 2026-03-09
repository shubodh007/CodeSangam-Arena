import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RightClickBlocker } from "@/components/RightClickBlocker";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateContest from "./pages/admin/CreateContest";
import EditContest from "./pages/admin/EditContest";
import ContestLeaderboard from "./pages/admin/ContestLeaderboard";
import StudentEntry from "./pages/student/StudentEntry";
import ContestPage from "./pages/contest/ContestPage";
import ProblemSolver from "./pages/contest/ProblemSolver";
import ContestLeaderboardPage from "./pages/contest/ContestLeaderboardPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RightClickBlocker />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/contest/new" element={<CreateContest />} />
          <Route path="/admin/contest/:contestId" element={<EditContest />} />
          <Route path="/admin/contest/:contestId/leaderboard" element={<ContestLeaderboard />} />
          <Route path="/student/entry" element={<StudentEntry />} />
          <Route path="/contest/:contestId" element={<ContestPage />} />
          <Route path="/contest/:contestId/problem/:problemId" element={<ProblemSolver />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
