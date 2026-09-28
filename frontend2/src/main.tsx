import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AuthProvider from "./auth/AuthProvider";
import CartProvider from "./cart/CartProvider";
import RealtimeProvider from "../src/components/store/RealtimeProvider.tsx";
import "./index.css";
import "./styles/store.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RealtimeProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </RealtimeProvider>
    </AuthProvider>
  </StrictMode>,
);