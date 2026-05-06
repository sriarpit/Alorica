"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function MainError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        An unexpected error occurred. This has been logged. Try refreshing the page or contact
        your administrator if the problem persists.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4 font-mono">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
