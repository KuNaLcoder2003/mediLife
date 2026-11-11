import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { PublicOnlyRoute } from "./auth/ProtectedRoute";

/* Sign-in screens */
import LoginPage from "./pages/store/auth/LoginPage";
import SignupPage from "./pages/store/auth/SignupPage";
import ForgotPasswordPage from "./pages/store/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/store/auth/ResetPasswordPage";
import AuthCallbackPage from "./pages/store/AuthCallbackPage";

/* Storefront */
import StoreLayout from "./components/store/StoreLayout";
import HomePage from "./pages/store/HomePage";
import ProductsPage from "./pages/store/ProductsPage";
import ProductPage from "./pages/store/ProductPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import OrderSuccessPage from "./pages/store/OrderSuccessPage";
import AccountPage from "./pages/store/AccountPage";
import OrderDetailPage from "./pages/store/OrderDetailPage";

/* Admin */
import AdminLayout from "./components/Admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminProductsPage from "./pages/admin/ProductsPage";
import AddProductPage from "./pages/admin/AddProductPage";
import AdminOrdersPage from "./pages/admin/OrdersPage";
import AdminOrderDetailPage from "./pages/admin/OrderDetailPage";
import ReportsPage from "./pages/admin/ReportsPage";
import CustomersPage from "./pages/admin/CustomersPage";
import CustomerDetailPage from "./pages/admin/CustomerDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sign-in screens: signed-in users are sent back where they came from */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Storefront */}
        <Route path="/" element={<HomePage />} />
        <Route element={<StoreLayout />}>
          {/* Public: anyone can browse */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:productId" element={<ProductPage />} />

          {/* Signed-in users only */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="success" element={<OrderSuccessPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
          </Route>
        </Route>

        {/* Admin. Not protected yet (admin auth is being built).
            When it's ready, wrap AdminLayout: <ProtectedRoute roles={["COMPANY"]}><AdminLayout /></ProtectedRoute> */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AddProductPage />} />
          <Route path="products/:productId/edit" element={<AddProductPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="*" element={<h1 className="soon">Coming soon</h1>} />
        </Route>

        {/* Old links */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
