"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL, formatApiError, parseResponse } from "../../lib/api";

export default function FounderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${API_URL}/founder/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        setMessage(`Login failed: ${formatApiError(data, res.statusText)}`);
        setIsLoading(false);
        return;
      }

      // Save token and redirect to founder dashboard
      localStorage.setItem("sb_founder_token", data.access_token);
      localStorage.setItem("sb_founder_email", email);
      setMessage("Login successful. Redirecting...");
      setTimeout(() => router.push("/founder/dashboard"), 500);
    } catch (error: any) {
      setMessage(`Login error: ${error?.message || "Network error"}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center rounded-full bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 border border-amber-500/30">
            🔐 Founder Portal
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">Admin Access</h1>
          <p className="mt-2 text-slate-400">System management and user oversight</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-8 shadow-2xl">
          {message && (
            <div className={`mb-4 rounded-lg p-4 text-sm ${
              message.includes("success")
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Founder Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@sauti-biashara.local"
                className="w-full rounded-xl border border-slate-600/50 bg-slate-700/30 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-600/50 bg-slate-700/30 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 px-4 py-3 font-semibold text-white shadow-lg hover:shadow-amber-500/25 transition duration-200 disabled:cursor-not-allowed"
            >
              {isLoading ? "Authenticating..." : "Access Admin Portal"}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 pt-6 border-t border-slate-700/30">
            <p className="text-xs text-slate-400 text-center">
              Founder credentials required to access this portal. All actions are logged and monitored.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm mb-3">
            Regular user account?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-slate-700/40 hover:bg-slate-700/60 px-4 py-2 text-sm font-medium text-slate-300 transition"
          >
            ← User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
