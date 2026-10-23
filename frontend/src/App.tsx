import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/store/auth/LoginPage";
import SignupPage from "./pages/store/auth/SignupPage";
import ResetPasswordPage from "./pages/store/auth/ResetPasswordPage";
import ForgotPasswordPage from "./pages/store/auth/ForgotPasswordPage";

import AdminLayout from "./components/Admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import ProductsPage from "./pages/admin/ProductsPage";
import AddProductPage from "./pages/admin/AddProductPage";
import OrdersPage from "./pages/admin/OrdersPage";
import OrderDetailPage from "./pages/admin/OrderDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Admin block routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<AddProductPage />} />
          <Route path="products/:productId/edit" element={<AddProductPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="*" element={<h1 className="soon">Coming soon</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}