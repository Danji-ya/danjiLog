import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import App from "@/App";
import { queryClient, queryPersister } from "@/lib/queryClient";
import "@/index.css";

// react-router가 스크롤 위치를 직접 관리하므로 브라우저의 자동 스크롤 복원과 충돌하지 않도록 끕니다.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>
);
