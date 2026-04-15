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
import AdminRoute from "./components/AdminRoute";
import Account from "./pages/Account";
import Notifications from "./pages/Notifications";
import Spin from "./pages/Spin";
import DigitalShop from "./pages/DigitalShop";
import DigitalShopCategory from "./pages/DigitalShopCategory";
import DigitalOrders from "./pages/DigitalOrders";
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/deposit-history" element={<DepositHistory />} />
            <Route path="/game-order-history" element={<GameOrderHistory />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/account" element={<Account />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/spin" element={<Spin />} />
            <Route path="/digital-shop" element={<DigitalShop />} />
            <Route path="/digital-shop/:category" element={<DigitalShopCategory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
