import React, { createContext, useContext, useMemo, useState } from "react";

type ToastItem = {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
};

type ToastCtx = {
  push: (message: string, tone?: ToastItem["tone"]) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const api = useMemo<ToastCtx>(
    () => ({
      push(message, tone = "info") {
        const id = String(Date.now()) + Math.random().toString(16).slice(2);
        const item: ToastItem = { id, message, tone };
        setItems((prev) => [item, ...prev].slice(0, 3)); // max 3 visible
        setTimeout(() => {
          setItems((prev) => prev.filter((x) => x.id !== id));
        }, 3500);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast UI */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "grid",
          gap: 10,
          zIndex: 9999,
          width: 320,
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #eee",
              background:
                t.tone === "success"
                  ? "#ecfdf5"
                  : t.tone === "error"
                  ? "#fef2f2"
                  : "#eff6ff",
              color:
                t.tone === "success"
                  ? "#065f46"
                  : t.tone === "error"
                  ? "#991b1b"
                  : "#1e3a8a",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
