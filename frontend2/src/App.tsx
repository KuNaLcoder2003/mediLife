import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { PublicOnlyRoute } from "./auth/ProtectedRoute";
import AdminPanel from "./components/admin/AdminPanel";
import StoreLayout from "./components/store/StoreLayout";
import AuthPage from "./pages/store/AuthPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import HomePage from "./pages/store/HomePage";
import ProductPage from "./pages/store/ProductPage";
import ProductsPage from "./pages/store/ProductsPage";
import AuthCallbackPage from "./pages/store/AuthCallbackPage";
import AccountPage from "./pages/AccountPage";
import OrderDetailPage from "./pages/OrderDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/auth/callback" element={

          <AuthCallbackPage />
        } />

        <Route element={<StoreLayout />}>
          {/* Public: anyone can browse */}
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:productId" element={<ProductPage />} />

          {/* Signed-in users only */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
          </Route>
        </Route>

        <Route
          path="/admin"
          element={
            <AdminPanel />
            // <ProtectedRoute roles={["COMPANY"]}>
            //   <AdminPanel />
            // </ProtectedRoute>
          }
        />

        {/* Old route (and possibly the Google callback redirect) */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
