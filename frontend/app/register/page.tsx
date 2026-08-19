"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, formatApiError, parseResponse } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const validateCredentials = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!username.trim()) return "Username is required.";
    if (!companyName.trim()) return "Company or shop name is required.";
    if (!email.trim()) return "Email is required.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!phone.trim()) return "Phone number is required.";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const register = async () => {
    const validationError = validateCredentials();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setMessage("Registering...");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username,
          email,
          phone,
          company_name: companyName,
          plan,
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setMessage(`Register error: ${formatApiError(data, res.statusText)}`);
        return;
      }

      setMessage("Registration successful. Logging in...");
      const form = new URLSearchParams({
        username: email,
        password,
        grant_type: "",
        scope: "",
        client_id: "",
        client_secret: "",
      });
      const loginRes = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const loginData = await parseResponse(loginRes);
      if (!loginRes.ok) {
        setMessage(`Registration succeeded but login failed: ${formatApiError(loginData, loginRes.statusText)}`);
        return;
      }

      localStorage.setItem("sb_token", loginData.access_token);
      router.push("/dashboard");
    } catch (error: any) {
      setMessage(`Register error: ${error?.message || "Network error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 shadow-xl">
        <h1 className="mb-4 text-3xl font-semibold">Create Your Business Account</h1>
        <p className="mb-6 text-slate-600">Register your account to start recording transactions and tracking operational KPIs for your business.</p>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            register();
          }}
        >
          <label className="grid gap-2">
            <span>Full name</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span>Username</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
            />
          </label>

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
            <span>Phone number</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </label>

          <label className="grid gap-2">
            <span>Company or shop name</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span>Subscription plan</span>
            <select
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
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

          <label className="grid gap-2">
            <span>Confirm password</span>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
            />
          </label>

          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
          >
            Register
          </button>

          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
            {message || "Register your business account to begin using the POS dashboard."}
          </div>

          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-slate-900 hover:underline">
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
