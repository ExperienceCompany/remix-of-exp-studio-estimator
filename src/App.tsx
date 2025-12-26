import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Estimate from "./pages/Estimate";
import Services from "./pages/Services";
import Internal from "./pages/Internal";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import QuoteView from "./pages/QuoteView";
import TeamProjects from "./pages/TeamProjects";
import TeamPayouts from "./pages/TeamPayouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/estimate" element={<Estimate />} />
          <Route path="/services" element={<Services />} />
          <Route path="/internal" element={<Internal />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/quote/:id" element={<QuoteView />} />
          <Route path="/projects" element={<TeamProjects />} />
          <Route path="/payouts" element={<TeamPayouts />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
