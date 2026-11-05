import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/figtree/800.css";
import App from "./App.tsx";
import AuthProvider from "./auth/AuthProvider";
import CartProvider from "./cart/CartProvider";
import RealtimeProvider from "./components/store/RealtimeProvider";
import "./index.css";
import "./styles/global.css";
import "./styles/auth.css";
import "./styles/admin.css";
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
