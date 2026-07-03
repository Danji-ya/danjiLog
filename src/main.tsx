import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import App from "@/App";
import { queryClient, queryPersister } from "@/lib/queryClient";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>
);
