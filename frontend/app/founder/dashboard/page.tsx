"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL, formatApiError, formatNetworkError, parseResponse } from "../../lib/api";

type UiPlan = "basic" | "pro" | "enterprise";
type BackendPlan = "basic" | "freemium" | "premium";

type User = {
  id: number;
  email: string;
  phone?: string;
  full_name: string;
  role: string;
  plan: UiPlan;
  is_active: boolean;
  created_at: string;
  sales_count: number;
  total_revenue_tzs: number;
};

type UserDetails = {
  id: number;
  email: string;
  phone?: string;
  full_name: string;
  role: string;
  plan: UiPlan;
  is_active: boolean;
  created_at: string;
  sales: {
    count: number;
    total_revenue_tzs: number;
    first_sale?: string;
    last_sale?: string;
  };
  inventory_items: number;
  kpi_entries: number;
};

type Analytics = {
  total_users: number;
  enterprise_users: number;
  pro_users: number;
  total_sales: {
    count: number;
    revenue_tzs: number;
  };
  total_inventory_items: number;
  revenue_by_plan: Record<string, { sales_count: number; total_revenue_tzs: number }>;
};

export default function FounderDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "basic" | "pro" | "enterprise">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "analytics">("overview");
  const [message, setMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [planDraft, setPlanDraft] = useState<UiPlan>("basic");

  const mapBackendPlanToUiPlan = (value?: string | null): UiPlan => {
    const normalized = (value || "basic").toLowerCase();
    if (normalized === "premium" || normalized === "enterprise") return "enterprise";
    if (normalized === "freemium" || normalized === "pro") return "pro";
    return "basic";
  };

  const mapUiPlanToBackendPlan = (value: UiPlan): BackendPlan => {
    if (value === "enterprise") return "premium";
    if (value === "pro") return "freemium";
    return "basic";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-TZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const clearSession = () => {
    setToken("");
    setEmail("");
    localStorage.removeItem("sb_founder_token");
    localStorage.removeItem("sb_founder_email");
    setMessage("Session ended. Please login again.");
    router.replace("/founder/login");
  };

  const checkAuth = () => {
    const savedToken = localStorage.getItem("sb_founder_token");
    const savedEmail = localStorage.getItem("sb_founder_email");
    if (!savedToken || !savedEmail) {
      clearSession();
      return false;
    }
    setToken(savedToken);
    setEmail(savedEmail);
    return true;
  };

  const fetchAnalytics = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/founder/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Analytics error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setAnalytics({
        ...data,
        enterprise_users: data.enterprise_users ?? data.premium_users ?? 0,
        pro_users: data.pro_users ?? data.freemium_users ?? 0,
      });
    } catch (error: any) {
      setMessage(`Analytics error: ${formatNetworkError(error)}`);
    }
  };

  const fetchUsers = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/founder/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Users load error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setUsers((data.users || []).map((item: any) => ({ ...item, plan: mapBackendPlanToUiPlan(item.plan) })));
    } catch (error: any) {
      setMessage(`Users load error: ${formatNetworkError(error)}`);
    }
  };

  const fetchUserDetails = async (authToken: string, userId: number) => {
    try {
      const res = await fetch(`${API_URL}/founder/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`User details error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setSelectedUser({ ...data, plan: mapBackendPlanToUiPlan(data.plan) });
    } catch (error: any) {
      setMessage(`User details error: ${formatNetworkError(error)}`);
    }
  };

  const updateUserPlan = async (authToken: string, userId: number, newPlan: UiPlan) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`${API_URL}/founder/users/${userId}/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ plan: mapUiPlanToBackendPlan(newPlan) }),
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Plan update error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setMessage(`User plan updated to ${newPlan} successfully.`);
      await fetchUsers(authToken);
      await fetchAnalytics(authToken);
      if (selectedUser?.id === userId) {
        await fetchUserDetails(authToken, userId);
      }
      setTimeout(() => setMessage(""), 4000);
    } catch (error: any) {
      setMessage(`Plan update error: ${formatNetworkError(error)}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const toggleUserActive = async (authToken: string, userId: number) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`${API_URL}/founder/users/${userId}/toggle-active`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Toggle error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setMessage(`User status updated successfully.`);
      await fetchUsers(authToken);
      if (selectedUser?.id === userId) {
        await fetchUserDetails(authToken, userId);
      }
      setTimeout(() => setMessage(""), 4000);
    } catch (error: any) {
      setMessage(`Toggle error: ${formatNetworkError(error)}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    const isAuthed = checkAuth();
    if (!isAuthed) return;
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchAnalytics(token);
      fetchUsers(token);
    }
  }, [token]);

  useEffect(() => {
    if (selectedUser) {
      setPlanDraft(selectedUser.plan);
    }
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.full_name && u.full_name.toLowerCase().includes(query)) ||
          (u.phone && u.phone.includes(query))
      );
    }

    if (filterPlan !== "all") {
      filtered = filtered.filter((u) => u.plan === filterPlan);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [users, searchQuery, filterPlan]);

  const loggedIn = Boolean(token && email);
  const planBadge = (planValue: UiPlan) => {
    if (planValue === "enterprise") return "Enterprise";
    if (planValue === "pro") return "Pro";
    return "Basic";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/30 mb-3">
                🔐 FOUNDER PORTAL
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">System Administration</h1>
              <p className="mt-2 text-slate-400">Monitor users, manage subscriptions, and view system analytics</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {loggedIn && (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-slate-400">Logged in as</p>
                    <p className="font-semibold text-slate-200">{email}</p>
                  </div>
                  <button
                    onClick={clearSession}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold transition"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 rounded-xl p-4 text-sm border ${
            message.includes("success") || message.includes("updated")
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/20 text-rose-300 border-rose-500/30"
          }`}>
            {message}
          </div>
        )}

        {!loggedIn ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-8 text-center">
            <p className="text-slate-300 mb-4">You need to be logged in to access the founder portal.</p>
            <Link
              href="/founder/login"
              className="inline-block rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-3 font-semibold transition"
            >
              Go to Founder Login
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <aside className="self-start rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-xl xl:sticky xl:top-6">
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</div>
                <div className="space-y-2">
                  {[
                    { id: "overview" as const, label: "Overview", icon: "📊" },
                    { id: "users" as const, label: "Users", icon: "👥" },
                    { id: "analytics" as const, label: "Analytics", icon: "📈" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        activeTab === tab.id
                          ? "bg-amber-500 text-white"
                          : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/60"
                      }`}
                    >
                      <span className="mr-2 text-base">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
                <div className="text-sm font-semibold text-slate-300 mb-4">Quick stats</div>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Total users</span>
                    <span className="font-semibold text-slate-100">{analytics?.total_users ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enterprise</span>
                    <span className="font-semibold text-amber-300">{analytics?.enterprise_users ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pro</span>
                    <span className="font-semibold text-sky-300">{analytics?.pro_users ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Revenue</span>
                    <span className="font-semibold text-emerald-300">{analytics ? formatCurrency(analytics.total_sales.revenue_tzs) : "—"}</span>
                  </div>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              {activeTab === "overview" && analytics && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm font-medium text-slate-400 mb-1">Total Users</div>
                      <div className="text-4xl font-bold">{analytics.total_users}</div>
                      <div className="mt-2 text-xs text-slate-500">System-wide user count</div>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm font-medium text-slate-400 mb-1">Enterprise Active</div>
                      <div className="text-4xl font-bold text-amber-400">{analytics.enterprise_users}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {analytics.total_users > 0
                          ? `${Math.round((analytics.enterprise_users / analytics.total_users) * 100)}% of users`
                          : "0% of users"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm font-medium text-slate-400 mb-1">Total Sales</div>
                      <div className="text-4xl font-bold text-emerald-400">{analytics.total_sales.count}</div>
                      <div className="mt-2 text-xs text-slate-500">{formatCurrency(analytics.total_sales.revenue_tzs)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm font-medium text-slate-400 mb-1">Inventory Items</div>
                      <div className="text-4xl font-bold text-blue-400">{analytics.total_inventory_items}</div>
                      <div className="mt-2 text-xs text-slate-500">System-wide stock</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Revenue by Plan</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Object.entries(analytics.revenue_by_plan).map(([plan, stats]) => (
                        <div key={plan} className="rounded-lg bg-slate-700/30 p-4 border border-slate-600/50">
                          <div className="capitalize font-medium text-slate-200 mb-2">{plan} Plan</div>
                          <div className="flex justify-between">
                            <div>
                              <div className="text-sm text-slate-400">Sales</div>
                              <div className="text-2xl font-bold">{stats.sales_count}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400">Revenue</div>
                              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.total_revenue_tzs)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-4 sm:p-6 space-y-4">
                      <input
                        type="text"
                        placeholder="Search by email, name, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-600/50 bg-slate-700/30 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(["all", "basic", "pro", "enterprise"] as const).map((plan) => (
                          <button
                            key={plan}
                            onClick={() => setFilterPlan(plan)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                              filterPlan === plan
                                ? "bg-amber-500 text-white"
                                : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/60"
                            }`}
                          >
                            {plan === "all" ? "All Plans" : plan === "enterprise" ? "Enterprise Only" : plan === "pro" ? "Pro Only" : "Basic Only"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-700/50 bg-slate-700/20">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">User</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">Plan</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-300">Sales</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-300">Revenue</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">Status</th>
                              <th className="px-4 py-3 text-center font-semibold text-slate-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {filteredUsers.map((user) => (
                              <tr key={user.id} className="hover:bg-slate-700/20 transition">
                                <td className="px-4 py-3">
                                  <div
                                    onClick={() => fetchUserDetails(token, user.id)}
                                    className="cursor-pointer hover:text-amber-400 transition"
                                  >
                                    <div className="font-medium text-slate-200">{user.full_name}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                      user.plan === "enterprise"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : user.plan === "pro"
                                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                          : "bg-slate-600/20 text-slate-300 border border-slate-600/30"
                                    }`}
                                  >
                                    {planBadge(user.plan)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-300">{user.sales_count}</td>
                                <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                                  {formatCurrency(user.total_revenue_tzs)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                      user.is_active
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    }`}
                                  >
                                    {user.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => fetchUserDetails(token, user.id)}
                                    className="rounded-lg bg-slate-700/60 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                                  >
                                    Manage
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          No users found matching your criteria.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-400">User management</p>
                          <h2 className="text-2xl font-semibold text-slate-100">{selectedUser ? selectedUser.full_name : "Select a user"}</h2>
                        </div>
                        {selectedUser && (
                          <button
                            onClick={() => setSelectedUser(null)}
                            className="rounded-xl border border-slate-600/60 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Close
                          </button>
                        )}
                      </div>

                      {!selectedUser ? (
                        <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/50 p-6 text-sm text-slate-400">
                          Choose a user from the list to review account details, adjust subscription tiers, and change status.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Email</div>
                              <div className="font-medium text-slate-100">{selectedUser.email}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Phone</div>
                              <div className="font-medium text-slate-100">{selectedUser.phone || "Not provided"}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Plan</div>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  selectedUser.plan === "enterprise"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : selectedUser.plan === "pro"
                                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      : "bg-slate-600/20 text-slate-300 border border-slate-600/30"
                                }`}
                              >
                                {planBadge(selectedUser.plan)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Status</div>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  selectedUser.is_active
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {selectedUser.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
                            <div className="text-sm font-medium text-slate-300 mb-4">Plan controls</div>
                            <div className="space-y-4">
                              <div>
                                <label htmlFor="plan-select" className="mb-2 block text-sm font-medium text-slate-300">
                                  Change plan
                                </label>
                                <select
                                  id="plan-select"
                                  value={planDraft}
                                  onChange={(event) => setPlanDraft(event.target.value as UiPlan)}
                                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                >
                                  <option value="basic">Basic</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                              </div>
                              <button
                                onClick={() => updateUserPlan(token, selectedUser.id, planDraft)}
                                disabled={updatingUserId === selectedUser.id || planDraft === selectedUser.plan}
                                className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingUserId === selectedUser.id ? "Updating..." : "Save plan"}
                              </button>
                              <button
                                onClick={() => toggleUserActive(token, selectedUser.id)}
                                disabled={updatingUserId === selectedUser.id}
                                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                                  selectedUser.is_active
                                    ? "bg-rose-600 text-white hover:bg-rose-700"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                {updatingUserId === selectedUser.id
                                  ? "Updating..."
                                  : selectedUser.is_active
                                  ? "Deactivate account"
                                  : "Activate account"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "analytics" && analytics && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm text-slate-400 mb-1">Active Users</div>
                      <div className="text-4xl font-bold mb-2">{analytics.total_users}</div>
                      <div className="text-xs text-slate-500">
                        {analytics.enterprise_users} enterprise · {analytics.pro_users} pro
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm text-slate-400 mb-1">Conversion Rate</div>
                      <div className="text-4xl font-bold text-amber-400 mb-2">
                        {analytics.total_users > 0
                          ? `${Math.round((analytics.enterprise_users / analytics.total_users) * 100)}%`
                          : "0%"}
                      </div>
                      <div className="text-xs text-slate-500">Enterprise / Total Users</div>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                      <div className="text-sm text-slate-400 mb-1">Avg Revenue / User</div>
                      <div className="text-4xl font-bold text-emerald-400 mb-2">
                        {formatCurrency(
                          analytics.total_users > 0
                            ? analytics.total_sales.revenue_tzs / analytics.total_users
                            : 0
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Across all users</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6">
                    <h3 className="text-lg font-semibold mb-6">System Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
                        <span className="text-slate-300">Total Transactions Recorded</span>
                        <span className="text-2xl font-bold">{analytics.total_sales.count}</span>
                      </div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
                        <span className="text-slate-300">Total Revenue Generated</span>
                        <span className="text-2xl font-bold text-emerald-400">{formatCurrency(analytics.total_sales.revenue_tzs)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">SKUs Across System</span>
                        <span className="text-2xl font-bold text-blue-400">{analytics.total_inventory_items}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
