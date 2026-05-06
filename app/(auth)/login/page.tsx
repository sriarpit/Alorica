"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [azureLoading, setAzureLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid username or password.");
      } else {
        router.push(callbackUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAzure() {
    setAzureLoading(true);
    await signIn("microsoft-entra-id", { callbackUrl });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header banner */}
          <div className="bg-[#0f1e35] px-8 py-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-lg">
                A
              </div>
              <span className="text-white font-bold text-2xl tracking-wide">ALORICA</span>
            </div>
            <p className="text-gray-300 text-sm mt-1">Site Build Management Portal</p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {/* Azure SSO button */}
            <Button
              onClick={handleAzure}
              disabled={azureLoading}
              className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white h-11"
            >
              {azureLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Sign in with Microsoft (Azure SSO)
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or use credentials</span>
              </div>
            </div>

            {/* Credentials form */}
            <form onSubmit={handleCredentials} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f1e35] hover:bg-[#1a2d4a] text-white h-11"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign In
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Alorica Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
