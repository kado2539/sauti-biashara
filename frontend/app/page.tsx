"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, formatApiError, parseResponse } from "./lib/api";

export default function Home() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const validateLogin = () => {
    if (!email.trim()) return "Email is required.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  const login = async () => {
    const validationError = validateLogin();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setMessage("Logging in...");
    try {
      const form = new URLSearchParams({
        username: email,
        password,
        grant_type: "",
        scope: "",
        client_id: "",
        client_secret: "",
      });

      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setMessage(`Login error: ${formatApiError(data, res.statusText)}`);
        return;
      }

      localStorage.setItem("sb_token", data.access_token);
      setMessage("Login successful. Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (error: any) {
      setMessage(`Login error: ${error?.message || "Network error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
              Point of Sale
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
              Sauti Biashara login
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sign in to your business dashboard to manage sales, stock and cash flow.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              login();
            }}
          >
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign in to POS
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
            {message || "Use your business email and password to continue."}
          </div>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-600">
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-slate-900 hover:underline">
                Register here
              </Link>
            </p>
            <p>
              Founder access:{' '}
              <Link href="/founder/login" className="font-semibold text-amber-900 hover:underline">
                Open founder portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
