import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useOneSignal } from "@/hooks/useOneSignal";
import AdminRoute from "./components/AdminRoute";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import { LanguageProvider } from "@/i18n/LanguageProvider";

// Route-level code splitting: only the shop entry ships in the initial bundle.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Deposit = lazy(() => import("./pages/Deposit"));
const DepositHistory = lazy(() => import("./pages/DepositHistory"));
const GameOrderHistory = lazy(() => import("./pages/GameOrderHistory"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminProfitSettings = lazy(() => import("./pages/AdminProfitSettings"));
const AdminPaymentMethods = lazy(() => import("./pages/AdminPaymentMethods"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const Account = lazy(() => import("./pages/Account"));
const UpdateProfile = lazy(() => import("./pages/UpdateProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TopBuyers = lazy(() => import("./pages/TopBuyers"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function OneSignalInit() {
  useOneSignal();
  return null;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
      ))}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <OneSignalInit />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
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
              <Route path="/update-profile" element={<UpdateProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/top-buyers" element={<TopBuyers />} />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
