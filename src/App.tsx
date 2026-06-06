import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useOneSignal } from "@/hooks/useOneSignal";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Deposit from "./pages/Deposit";
import DepositHistory from "./pages/DepositHistory";
import GameOrderHistory from "./pages/GameOrderHistory";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";
import AdminProfitSettings from "./pages/AdminProfitSettings";
import AdminPaymentMethods from "./pages/AdminPaymentMethods";
import AdminContent from "./pages/AdminContent";
import AdminRoute from "./components/AdminRoute";
import ScrollToTop from "./components/ScrollToTop";
import Account from "./pages/Account";
import Notifications from "./pages/Notifications";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function OneSignalInit() {
  useOneSignal();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OneSignalInit />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/deposit-history" element={<DepositHistory />} />
            <Route path="/game-order-history" element={<GameOrderHistory />} />
            <Route path="/admin" element={<AdminRoute allowReseller><Admin /></AdminRoute>} />
            <Route path="/admin/profit-settings" element={<AdminRoute allowReseller><AdminProfitSettings /></AdminRoute>} />
            <Route path="/admin/payment-methods" element={<AdminRoute allowReseller><AdminPaymentMethods /></AdminRoute>} />
            <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
            <Route path="/account" element={<Account />} />
            <Route path="/notifications" element={<Notifications />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
