import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Estimate from "./pages/Estimate";
import Packages from "./pages/Packages";
import Services from "./pages/Services";
import Internal from "./pages/Internal";
import Admin from "./pages/Admin";
import CalendarSettings from "./pages/CalendarSettings";
import NotFound from "./pages/NotFound";
import QuoteView from "./pages/QuoteView";
import TeamProjects from "./pages/TeamProjects";
import TeamPayouts from "./pages/TeamPayouts";
import SessionTimer from "./pages/SessionTimer";
import Sessions from "./pages/Sessions";
import BookStudio from "./pages/BookStudio";

const queryClient = new QueryClient();

// Wrapper component for pages that use the app layout
const WithLayout = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth page without layout */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Quote view without layout (public shareable) */}
          <Route path="/quote/:id" element={<QuoteView />} />
          
          {/* All other pages with sidebar layout */}
          <Route path="/" element={<WithLayout><Dashboard /></WithLayout>} />
          <Route path="/estimate" element={<WithLayout><Estimate /></WithLayout>} />
          <Route path="/packages" element={<WithLayout><Packages /></WithLayout>} />
          <Route path="/services" element={<WithLayout><Services /></WithLayout>} />
          <Route path="/internal" element={<WithLayout><Internal /></WithLayout>} />
          <Route path="/admin" element={<WithLayout><Admin /></WithLayout>} />
          <Route path="/calendar-settings" element={<WithLayout><CalendarSettings /></WithLayout>} />
          <Route path="/projects" element={<WithLayout><TeamProjects /></WithLayout>} />
          <Route path="/payouts" element={<WithLayout><TeamPayouts /></WithLayout>} />
          <Route path="/sessions" element={<WithLayout><Sessions /></WithLayout>} />
          <Route path="/session/:id" element={<WithLayout><SessionTimer /></WithLayout>} />
          <Route path="/book" element={<WithLayout><BookStudio /></WithLayout>} />
          <Route path="/book/:studioType" element={<WithLayout><BookStudio /></WithLayout>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<WithLayout><NotFound /></WithLayout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
