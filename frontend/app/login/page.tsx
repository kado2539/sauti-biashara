"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, formatApiError, parseResponse } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const validateCredentials = () => {
    if (!email.trim()) return "Email is required.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  const login = async () => {
    const validationError = validateCredentials();
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
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 shadow-xl">
        <h1 className="mb-4 text-3xl font-semibold">Business Login</h1>
        <p className="mb-6 text-slate-600">Sign in to the Sauti Biashara point-of-sale system and manage sales, cash and performance metrics securely.</p>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            login();
          }}
        >
          <label className="grid gap-2">
            <span>Email</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </label>

          <label className="grid gap-2">
            <span>Password</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </label>

          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
          >
            Login
          </button>

          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
            {message || "Enter your business credentials to access the operations dashboard."}
          </div>

          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-slate-900 hover:underline">
              Register here
            </Link>
          </p>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-xs text-slate-500 text-center mb-2">System administrator?</p>
            <Link
              href="/founder/login"
              className="block text-center rounded-lg bg-amber-100 text-amber-900 font-medium py-2 hover:bg-amber-200 transition"
            >
              Founder Portal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
