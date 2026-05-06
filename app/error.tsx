"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f4f6f9" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "#fee2e2",
              borderRadius: "50%",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle size={32} color="#dc2626" />
          </div>
          <h1 style={{ color: "#0f1e35", margin: "0 0 0.5rem" }}>Application Error</h1>
          <p style={{ color: "#64748b", maxWidth: "400px", marginBottom: "1.5rem" }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "1rem", fontFamily: "monospace" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              background: "#0f1e35",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      </body>
    </html>
  );
}
