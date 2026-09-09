import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineSupport } from "./lib/registerServiceWorker";
import { startAutoUpdate } from "./lib/autoUpdate";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

registerOfflineSupport();
startAutoUpdate();
