import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";

import NSELoginPage from "./pages/auth/NSELoginPage";
import NSEInvestorRegistrationPage from "./pages/auth/NSEInvestorRegistrationPage";
import NSEDashboard from "./pages/dashboard/NSEDashboard";
import MutualFundsDashboard from "./pages/dashboard/MutualFundsDashboard";
import NSESsoCallbackPage from "./pages/auth/NSESsoCallbackPage";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Customer entry point: Mutual Funds dashboard (no NSE login required to browse) */}
            <Route path="/" element={<Navigate to="/mutual-funds" replace />} />
            <Route path="/sso/callback" element={<NSESsoCallbackPage />} />
            <Route path="/mutual-funds" element={<MutualFundsDashboard />} />
            {/* NSE admin / operator routes — preserved for internal workflows */}
            <Route path="/nse-login" element={<NSELoginPage />} />
            <Route path="/investor-registration" element={<NSEInvestorRegistrationPage />} />
            <Route path="/nse-dashboard/*" element={<NSEDashboard />} />
            <Route path="*" element={<Navigate to="/mutual-funds" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
