"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  formatApiError,
  formatNetworkError,
  getStoredToken,
  isTokenExpired,
  parseResponse,
} from "../lib/api";

type KpiCard = {
  id: number | null;
  key: string;
  name: string;
  description: string;
  unit: string;
  value: number | null;
};

type UiPlan = "basic" | "pro" | "enterprise";
type BackendPlan = "basic" | "freemium" | "premium";

type UserProfile = {
  email?: string;
  full_name?: string;
  username?: string;
  company_name?: string;
  role?: string;
  plan?: UiPlan;
  owner_id?: number | null;
};

type HistoryEntry = {
  id: number;
  kpiId: number | null;
  kpiName: string;
  kpiKey: string;
  kpiUnit: string;
  value: number;
  notes: string | null;
  recorded_at: string | null;
  recorded_by_name?: string | null;
};

type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  is_active: boolean;
  updated_at: string | null;
};

type TabKey = "overview" | "performance" | "transactions" | "inventory" | "history" | "admin";

export default function DashboardPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [saleAmount, setSaleAmount] = useState("");
  const [saleCurrency, setSaleCurrency] = useState("TZS");
  const [saleNotes, setSaleNotes] = useState("");
  const [saleItemId, setSaleItemId] = useState("");
  const [saleItemQuantity, setSaleItemQuantity] = useState("1");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<Array<{ id: number; sku: string; name: string; stock_quantity: number; reorder_level: number; selling_price: number }>>([]);
  const [inventoryName, setInventoryName] = useState("");
  const [inventorySku, setInventorySku] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryCostPrice, setInventoryCostPrice] = useState("");
  const [inventorySellingPrice, setInventorySellingPrice] = useState("");
  const [inventoryStockQuantity, setInventoryStockQuantity] = useState("0");
  const [inventoryReorderLevel, setInventoryReorderLevel] = useState("0");
  const [inventoryAdjustItemId, setInventoryAdjustItemId] = useState("");
  const [inventoryAdjustQuantity, setInventoryAdjustQuantity] = useState("0");
  const [inventoryAdjustNotes, setInventoryAdjustNotes] = useState("");
  const [revenue, setRevenue] = useState("");
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("");
  const [inventoryValue, setInventoryValue] = useState("");
  const [cashBalance, setCashBalance] = useState("");
  const [previousRevenue, setPreviousRevenue] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showTabSidebar, setShowTabSidebar] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<KpiCard | null>(null);
  const [kpiHistory, setKpiHistory] = useState<Array<{id:number; value:number; notes:string | null; recorded_at:string | null; recorded_by_name?: string | null}>>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySort, setHistorySort] = useState("newest");
  const [plan, setPlan] = useState<UiPlan>("basic");
  const [planUpdating, setPlanUpdating] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<Array<{ id: number; email?: string; phone?: string; username?: string; company_name?: string; full_name?: string; role?: string; plan?: string; is_active?: boolean; created_at?: string | null }>>([]);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [language, setLanguage] = useState<"en" | "sw">("en");

  const uiText = {
    en: {
      overview: "Overview",
      performance: "Performance",
      transactions: "Transactions",
      inventory: "Inventory",
      history: "History",
      admin: "Admin",
      staff: "Staff",
      registerStaff: "Register Staff",
      ownerControls: "Owner Controls",
      signOut: "Sign out",
      chooseLanguage: "Language",
      operationsSummary: "Operations summary",
      accountSecured: "Account secured",
      businessSummary: "Business operations dashboard",
      operationsDescription: "Monitor sales, cash position and inventory while capturing key business performance metrics in real time.",
      premiumCockpit: "Modern POS cockpit",
      amountsNote: "All amounts are entered in Tanzanian Shillings (TZS).",
      accountHolder: "Account holder",
      username: "Username",
      company: "Company",
      access: "Access",
      privateDashboard: "Private dashboard",
      restrictedStaff: "Restricted staff",
      adminActionTitle: "ADMIN ACTION",
      adminActionDescription: "Create staff accounts for your business and manage their active status from this owner workspace.",
      noStaffAccounts: "No staff accounts yet.",
      staffList: "Staff list",
      active: "Active",
      inactive: "Inactive",
      enable: "Enable",
      disable: "Disable",
      createStaffAccount: "Create staff account",
      createStaffAccountLoading: "Creating...",
      registerStaffButton: "Register staff",
      staffFormTitle: "Register a new staff member",
      staffFormSubtitle: "Use this form to add a staff account with limited access.",
      fullName: "Full name",
      temporaryPassword: "Temporary password",
      phoneNumber: "Phone number",
      staffPasswordHint: "Use at least 6 characters.",
      login: "Login",
      register: "Register",
      notSignedIn: "You are not signed in.",
      noActiveSystemMessage: "No active system message.",
      staffFormHint: "Required: full name, username, password, and either email or phone number.",
    },
    sw: {
      overview: "Muhtasari",
      performance: "Utendaji",
      transactions: "Miamala",
      inventory: "Hisa",
      history: "Historia",
      admin: "Admin",
      staff: "Wafanyakazi",
      registerStaff: "Andika Mfanyakazi",
      ownerControls: "Udhibiti wa Mmiliki",
      signOut: "Ondoka",
      chooseLanguage: "Lugha",
      operationsSummary: "Muhtasari wa shughuli",
      accountSecured: "Akaunti imesalama",
      businessSummary: "Dashibodi ya biashara",
      operationsDescription: "Fuatilia mauzo, nafasi ya fedha na hisa huku ukikamata viashiria muhimu vya utendaji kwa wakati halisi.",
      premiumCockpit: "Ghala ya POS ya kisasa",
      amountsNote: "Kiasi chote kinaingizwa kwa Shilingi za Tanzania (TZS).",
      accountHolder: "Mmiliki wa akaunti",
      username: "Jina la mtumiaji",
      company: "Kampuni",
      access: "Ufikiaji",
      privateDashboard: "Dashibodi ya kibinafsi",
      restrictedStaff: "Mfanyakazi aliyezuiwa",
      adminActionTitle: "KITENDO CHA ADMIN",
      adminActionDescription: "Unda akaunti za wafanyakazi kwa biashara yako na udhibiti hali zao kutoka kwa sehemu hii ya mmiliki.",
      noStaffAccounts: "Hakuna akaunti za wafanyakazi bado.",
      staffList: "Orodha ya wafanyakazi",
      active: "Inatumika",
      inactive: "Haijatumika",
      enable: "Wezesha",
      disable: "Zima",
      createStaffAccount: "Unda akaunti ya mfanyakazi",
      createStaffAccountLoading: "Inatengeneza...",
      registerStaffButton: "Andika mfanyakazi",
      staffFormTitle: "Andika mfanyakazi mpya",
      staffFormSubtitle: "Tumia fomu hii kuongeza akaunti ya mfanyakazi yenye ruhusa ndogo.",
      fullName: "Jina kamili",
      temporaryPassword: "Nywila ya muda",
      phoneNumber: "Namba ya simu",
      staffPasswordHint: "Tumia angalau herufi 6.",
      login: "Ingia",
      register: "Jiandikishe",
      notSignedIn: "Hujaingia kwenye mfumo.",
      noActiveSystemMessage: "Hakuna ujumbe wa mfumo unaofanya kazi.",
      staffFormHint: "Inahitajika: jina kamili, jina la mtumiaji, nywila, na barua pepe au namba ya simu.",
    },
  };

  const activeUiText = uiText[language];

  const getTabLabel = (tabId: TabKey) => {
    if (tabId === "overview") return activeUiText.overview;
    if (tabId === "performance") return activeUiText.performance;
    if (tabId === "transactions") return activeUiText.transactions;
    if (tabId === "inventory") return activeUiText.inventory;
    if (tabId === "history") return activeUiText.history;
    return activeUiText.admin;
  };

  const getTabDescription = (tabId: TabKey) => {
    if (tabId === "overview") return activeUiText.businessSummary;
    if (tabId === "performance") return "Executive input";
    if (tabId === "transactions") return "POS logging";
    if (tabId === "inventory") return "Stock control";
    if (tabId === "history") return "Activity trail";
    return activeUiText.ownerControls;
  };

  const setStatus = (text: string, tone: "neutral" | "success" | "error" = "neutral") => {
    setMessage(text);
    setMessageTone(tone);
  };

  const clearStatus = () => {
    setMessage("");
    setMessageTone("neutral");
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return "TZS 0";
    }
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatMetricValue = (value: number | null, unit: string) => {
    if (value === null) {
      return "No data yet";
    }
    const normalizedUnit = unit?.toUpperCase();
    if (normalizedUnit === "TZS" || normalizedUnit === "TSH" || normalizedUnit === "KES") {
      return formatCurrency(value);
    }
    return `${value}${unit}`;
  };

  const renderKpiValue = (kpi: KpiCard) => {
    return formatMetricValue(kpi.value, kpi.unit);
  };

  const formatHistoryTimestamp = (timestamp: string | null) => {
    if (!timestamp) {
      return "No timestamp";
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "No timestamp";
    }
    return date.toLocaleString("en-TZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const interpretKpi = (kpi: KpiCard) => {
    if (kpi.value === null) return "No data available for this metric yet.";

    const revenueNumber = Number(revenue || 0);
    const costNumber = Number(costOfGoodsSold || 0);
    const inventoryNumber = Number(inventoryValue || 0);
    const cashNumber = Number(cashBalance || 0);
    const previousRevenueNumber = Number(previousRevenue || 0);
    const grossProfit = revenueNumber - costNumber;

    switch (kpi.key) {
      case "net_profit_margin":
        return `Revenue of ${formatCurrency(revenueNumber)} against cost of goods sold of ${formatCurrency(costNumber)} produced gross profit of ${formatCurrency(grossProfit)}. The KPI value of ${kpi.value.toFixed(2)}% means the business retained about ${kpi.value.toFixed(2)}% of sales as profit after direct costs.`;
      case "gross_profit_margin":
        return `With revenue at ${formatCurrency(revenueNumber)} and cost of goods sold at ${formatCurrency(costNumber)}, gross profit is ${formatCurrency(grossProfit)}. This gives a gross margin of ${kpi.value.toFixed(2)}%, showing how efficiently the business converts sales into direct profit.`;
      case "inventory_turnover_ratio":
        return `Inventory value is ${formatCurrency(inventoryNumber)} and revenue is ${formatCurrency(revenueNumber)}. The turnover ratio is ${kpi.value.toFixed(2)} times, indicating the stock is being sold and replenished roughly ${kpi.value.toFixed(2)} times over the period.`;
      case "sales_growth_rate":
        return `Current revenue is ${formatCurrency(revenueNumber)} compared with previous period revenue of ${formatCurrency(previousRevenueNumber)}. The sales growth rate is ${kpi.value.toFixed(2)}%, which indicates whether sales improved or declined against the prior period.`;
      case "inventory_cash":
        return `The business has ${formatCurrency(inventoryNumber)} tied up in stock. That inventory figure is the working-capital portion represented by the KPI value, so it shows how much money is locked in inventory versus available cash.`;
      case "cash_balance":
        return `Cash available in the register is ${formatCurrency(cashNumber)}. The KPI value of ${formatCurrency(kpi.value)} shows the liquid money available for immediate operating needs.`;
      default:
        return `${kpi.description || "Metric details not available."} Current business context uses revenue ${formatCurrency(revenueNumber)}, inventory ${formatCurrency(inventoryNumber)}, and cash ${formatCurrency(cashNumber)}.`;
    }
  };

  const fetchKpiHistory = async (kpiId: number | null) => {
    if (!kpiId) return;
    setMessage("Loading KPI history...");
    try {
      const res = await fetch(`${API_URL}/kpis/${kpiId}/values?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`KPI history error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setKpiHistory((data.values || []).map((entry: any) => ({
        ...entry,
        recorded_by_name: entry.recorded_by_name || user?.full_name || user?.email || "the logged-in user",
      })));
      setMessage("");
    } catch (error: any) {
      setMessage(`KPI history error: ${error?.message || "Network error"}`);
    }
  };

  const fetchInventoryItems = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/inventory/items`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Inventory load error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setInventoryItems(data.items || []);
    } catch (error: any) {
      setMessage(`Inventory load error: ${error?.message || "Network error"}`);
    }
  };

  const fetchInventoryAlerts = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/inventory/alerts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Inventory alerts error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setInventoryAlerts(data.alerts || []);
    } catch (error: any) {
      setMessage(`Inventory alerts error: ${error?.message || "Network error"}`);
    }
  };

  const fetchHistoryEntries = async () => {
    setMessage("Loading KPI history...");
    try {
      const res = await fetch(`${API_URL}/kpis/history?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`History error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setHistoryEntries(data.history || []);
      setMessage("");
    } catch (error: any) {
      setMessage(`History error: ${error?.message || "Network error"}`);
    }
  };

  const createInventoryItem = async () => {
    if (!inventoryName.trim()) {
      setMessage("Please enter an item name.");
      return;
    }

    // Auto-generate SKU when not provided: SKU-<NAME>-<4digits>
    let skuToUse = inventorySku && inventorySku.trim() ? inventorySku.trim() : "";
    if (!skuToUse) {
      const slug = inventoryName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000);
      skuToUse = `SKU-${slug}-${rand}`.slice(0, 40);
    }

    try {
      const res = await fetch(`${API_URL}/inventory/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku: skuToUse,
          name: inventoryName,
          category: inventoryCategory || "General",
          cost_price: Number(inventoryCostPrice || 0),
          selling_price: Number(inventorySellingPrice || 0),
          stock_quantity: Number(inventoryStockQuantity || 0),
          reorder_level: Number(inventoryReorderLevel || 0),
        }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setStatus(`Inventory create error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      setStatus("Inventory item saved successfully.", "success");
      setInventoryName("");
      setInventorySku("");
      setInventoryCategory("");
      setInventoryCostPrice("");
      setInventorySellingPrice("");
      setInventoryStockQuantity("0");
      setInventoryReorderLevel("0");
      await fetchInventoryItems(token);
      await fetchInventoryAlerts(token);
    } catch (error: any) {
      setStatus(`Inventory create error: ${error?.message || "Network error"}`, "error");
    }
  };

  const adjustInventoryStock = async () => {
    if (!inventoryAdjustItemId) {
      setMessage("Please choose an inventory item to adjust.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/inventory/items/${inventoryAdjustItemId}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity_change: Number(inventoryAdjustQuantity || 0),
          movement_type: "adjustment",
          notes: inventoryAdjustNotes || "Inventory update via POS dashboard",
        }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setStatus(`Inventory adjustment error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      setStatus("Inventory stock updated successfully.", "success");
      setInventoryAdjustItemId("");
      setInventoryAdjustQuantity("0");
      setInventoryAdjustNotes("");
      await fetchInventoryItems(token);
      await fetchInventoryAlerts(token);
    } catch (error: any) {
      setStatus(`Inventory adjustment error: ${error?.message || "Network error"}`, "error");
    }
  };

  const canManageStaff = user?.role !== "staff";
  const planFeatureAccess: Record<UiPlan, TabKey[]> = {
    basic: ["overview", "transactions", "inventory", "history"],
    pro: ["overview", "performance", "transactions", "inventory", "history"],
    enterprise: ["overview", "performance", "transactions", "inventory", "history", "admin"],
  };

  const hasPlanAccess = (feature: TabKey) => (planFeatureAccess[plan] || planFeatureAccess.basic).includes(feature);

  const tabDefinitions: Array<{ id: TabKey; label: string; description: string }> = [
    { id: "overview", label: getTabLabel("overview"), description: getTabDescription("overview") },
    { id: "performance", label: getTabLabel("performance"), description: getTabDescription("performance") },
    { id: "transactions", label: getTabLabel("transactions"), description: getTabDescription("transactions") },
    { id: "inventory", label: getTabLabel("inventory"), description: getTabDescription("inventory") },
    { id: "history", label: getTabLabel("history"), description: getTabDescription("history") },
    ...(canManageStaff && hasPlanAccess("admin") ? [{ id: "admin" as TabKey, label: getTabLabel("admin"), description: getTabDescription("admin") }] : []),
  ];

  const tabs = tabDefinitions.filter((tab) => {
    if (tab.id === "admin") return canManageStaff && hasPlanAccess("admin");
    if (tab.id === "performance") return hasPlanAccess("performance");
    if (tab.id === "inventory") return hasPlanAccess("inventory");
    if (tab.id === "history") return hasPlanAccess("history");
    return true;
  });

  const saveSession = async (authToken: string) => {
    setToken(authToken);
    localStorage.setItem("sb_token", authToken);
    await fetchProfile(authToken);
    await fetchStaffAccounts(authToken);
    await fetchKpiDashboard(authToken);
    await fetchInventoryItems(authToken);
    await fetchInventoryAlerts(authToken);
  };

  const clearSession = () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;

    setToken("");
    setUser(null);
    setKpis([]);
    localStorage.removeItem("sb_token");
    setStatus("Signed out. Please login to continue.", "neutral");
    router.replace("/login");
  };

  const fetchKpiDashboard = async (authToken: string) => {
    setMessage("Loading KPI dashboard...");
    try {
      const res = await fetch(`${API_URL}/kpis/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`KPI dashboard error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setKpis(data.kpis || []);
      setMessage("KPI dashboard loaded.");
    } catch (error: any) {
      setMessage(`KPI dashboard error: ${formatNetworkError(error)}`);
    }
  };

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

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Profile error: ${formatApiError(data, res.statusText)}`);
        clearSession();
        return;
      }
      const resolvedPlan = mapBackendPlanToUiPlan(data.plan);
      setUser({
        email: data.email,
        full_name: data.full_name,
        username: data.username,
        company_name: data.company_name,
        role: data.role,
        plan: resolvedPlan,
        owner_id: data.owner_id ?? null,
      });
      setPlan(resolvedPlan);
    } catch (error: any) {
      setMessage(`Profile error: ${formatNetworkError(error)}`);
      clearSession();
    }
  };

  const fetchStaffAccounts = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/users/staff`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setMessage(`Staff load error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setStaffAccounts(data.staff || []);
    } catch (error: any) {
      setMessage(`Staff load error: ${formatNetworkError(error)}`);
    }
  };

  const createStaffAccount = async () => {
    if (!staffFullName.trim() || !staffUsername.trim() || (!staffEmail.trim() && !staffPhone.trim()) || !staffPassword.trim()) {
      setStatus("Provide a full name, username, contact method, and password for the staff member.", "error");
      return;
    }
    if (staffEmail.trim() && !staffEmailValid) {
      setStatus("Please enter a valid email address for the staff member.", "error");
      return;
    }
    if (staffPassword.length < 6) {
      setStatus("Staff password must be at least 6 characters.", "error");
      return;
    }

    setStaffSubmitting(true);
    setStatus("Creating staff account...", "neutral");
    try {
      const res = await fetch(`${API_URL}/users/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: staffFullName,
          username: staffUsername,
          email: staffEmail,
          phone: staffPhone,
          password: staffPassword,
        }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setStatus(`Staff create error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      setStaffFullName("");
      setStaffUsername("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      setStatus("Staff account created successfully.", "success");
      await fetchStaffAccounts(token);
    } catch (error: any) {
      setStatus(`Staff create error: ${error?.message || "Network error"}`, "error");
    } finally {
      setStaffSubmitting(false);
    }
  };

  const toggleStaffAccountActive = async (staffId: number) => {
    const targetStaff = staffAccounts.find((item) => item.id === staffId);
    if (!targetStaff) return;

    const confirmed = window.confirm(`Are you sure you want to ${targetStaff.is_active ? "disable" : "enable"} this staff account?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/users/staff/${staffId}/toggle-active`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setMessage(`Staff toggle error: ${formatApiError(data, res.statusText)}`);
        return;
      }
      setStatus("Staff account status updated.", "success");
      await fetchStaffAccounts(token);
    } catch (error: any) {
      setMessage(`Staff toggle error: ${error?.message || "Network error"}`);
    }
  };

  const updatePlan = async (targetPlan: UiPlan) => {
    if (!token) return;
    const backendPlan = mapUiPlanToBackendPlan(targetPlan);
    const confirmed = window.confirm(
      targetPlan === "enterprise"
        ? "Are you sure you want to upgrade this workspace to Enterprise?"
        : targetPlan === "pro"
          ? "Are you sure you want to upgrade this workspace to Pro?"
          : "Are you sure you want to switch this workspace back to Basic?"
    );
    if (!confirmed) return;

    setPlanUpdating(true);
    setStatus(targetPlan === "enterprise" ? "Upgrading to Enterprise..." : targetPlan === "pro" ? "Upgrading to Pro..." : "Switching to Basic...", "neutral");

    try {
      const res = await fetch(`${API_URL}/users/me/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: backendPlan }),
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setStatus(`Plan update error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      const updatedPlan = mapBackendPlanToUiPlan(data.plan);
      setPlan(updatedPlan);
      setUser({
        email: data.email,
        full_name: data.full_name,
        username: data.username,
        company_name: data.company_name,
        role: data.role,
        plan: updatedPlan,
        owner_id: data.owner_id ?? null,
      });
      setStatus(targetPlan === "enterprise" ? "Enterprise unlocked successfully." : targetPlan === "pro" ? "Pro unlocked successfully." : "Basic restored successfully.", "success");
      setTimeout(() => clearStatus(), 4000);
    } catch (error: any) {
      setStatus(`Plan update error: ${error?.message || "Network error"}`, "error");
    } finally {
      setPlanUpdating(false);
    }
  };

  const computeKpis = async () => {
    const revenueValue = Number(revenue);
    const costValue = Number(costOfGoodsSold);
    const inventoryValueAmount = Number(inventoryValue);
    const cashBalanceValue = Number(cashBalance);
    const previousRevenueValue = Number(previousRevenue);

    if (Number.isNaN(revenueValue) || revenueValue < 0) {
      setMessage("Please enter a valid revenue amount.");
      return;
    }
    if (Number.isNaN(costValue) || costValue < 0) {
      setMessage("Please enter a valid cost of goods sold amount.");
      return;
    }
    if (Number.isNaN(inventoryValueAmount) || inventoryValueAmount < 0) {
      setMessage("Please enter a valid inventory value.");
      return;
    }
    if (Number.isNaN(cashBalanceValue) || cashBalanceValue < 0) {
      setMessage("Please enter a valid cash balance amount.");
      return;
    }

    setMessage("Calculating KPIs...");
    try {
      const res = await fetch(`${API_URL}/kpis/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          revenue: revenueValue,
          cost_of_goods_sold: costValue,
          inventory_value: inventoryValueAmount,
          cash_balance: cashBalanceValue,
          previous_revenue: Number.isNaN(previousRevenueValue) ? null : previousRevenueValue,
        }),
      });
      const data = await parseResponse(res);
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        setStatus(`KPI compute error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      setMessage("KPI calculations saved successfully.");
      // clear inputs after successful compute
      setRevenue("");
      setCostOfGoodsSold("");
      setInventoryValue("");
      setCashBalance("");
      setPreviousRevenue("");
      await fetchKpiDashboard(token);
      // clear message after a short delay
      setTimeout(() => setMessage(""), 4000);
    } catch (error: any) {
      setStatus(`KPI compute error: ${error?.message || "Network error"}`, "error");
    }
  };

  const recordSale = async () => {
    const quantity = Number(saleItemQuantity || 1);
    const selectedItem = inventoryItems.find((item) => String(item.id) === saleItemId);

    if (!saleItemId && (Number.isNaN(Number(saleAmount)) || Number(saleAmount) <= 0)) {
      setMessage("Please enter a valid sale amount or select an inventory item.");
      return;
    }

    if (saleItemId && (!selectedItem || Number.isNaN(quantity) || quantity <= 0)) {
      setMessage("Please choose a valid inventory item and quantity.");
      return;
    }

    setMessage("Recording sale...");
    try {
      const body: Record<string, any> = {
        currency: saleCurrency || "TZS",
        notes: saleNotes,
      };

      if (saleItemId && selectedItem) {
        body.items = [
          {
            item_id: selectedItem.id,
            quantity,
          },
        ];
      } else {
        const amount = Number(saleAmount);
        const minorUnitAmount = ["TZS", "TSH"].includes(saleCurrency.toUpperCase())
          ? Math.round(amount)
          : Math.round(amount * 100);
        body.amount_cents = minorUnitAmount;
      }

      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setStatus(`Sale error: ${formatApiError(data, res.statusText)}`, "error");
        return;
      }
      setSaleAmount("");
      setSaleNotes("");
      setSaleCurrency("TZS");
      setSaleItemId("");
      setSaleItemQuantity("1");
      setMessage("Sale recorded successfully.");
      await fetchKpiDashboard(token);
      await fetchInventoryItems(token);
      await fetchInventoryAlerts(token);
      setTimeout(() => setMessage(""), 4000);
    } catch (error: any) {
      setStatus(`Sale error: ${error?.message || "Network error"}`, "error");
    }
  };

  const router = useRouter();

  useEffect(() => {
    const savedToken = getStoredToken();
    if (savedToken && !isTokenExpired(savedToken)) {
      saveSession(savedToken);
      return;
    }
    if (savedToken) {
      clearSession();
      return;
    }
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (selectedKpi) {
      fetchKpiHistory(selectedKpi.id);
    } else {
      setKpiHistory([]);
    }
  }, [selectedKpi]);

  useEffect(() => {
    if (activeTab === "history" && token) {
      fetchHistoryEntries();
    }
  }, [activeTab, token]);

  const filteredHistoryEntries = useMemo(() => {
    const cloned = [...historyEntries];
    const filtered = historyFilter === "all"
      ? cloned
      : cloned.filter((entry) => entry.kpiId === Number(historyFilter));

    if (historySort === "oldest") {
      return filtered.sort((a, b) => {
        const aTime = new Date(a.recorded_at || 0).getTime();
        const bTime = new Date(b.recorded_at || 0).getTime();
        return aTime - bTime;
      });
    }

    if (historySort === "kpi") {
      return filtered.sort((a, b) => a.kpiName.localeCompare(b.kpiName) || new Date(b.recorded_at || 0).getTime() - new Date(a.recorded_at || 0).getTime());
    }

    return filtered.sort((a, b) => {
      const aTime = new Date(a.recorded_at || 0).getTime();
      const bTime = new Date(b.recorded_at || 0).getTime();
      return bTime - aTime;
    });
  }, [historyEntries, historyFilter, historySort]);

  const performanceInputsComplete = [revenue, costOfGoodsSold, inventoryValue, cashBalance].every((value) => String(value).trim() !== "" && Number(value) >= 0);
  // SKU is optional and will be auto-generated when not provided by the user
  const inventoryCreateComplete = [inventoryName, inventoryCostPrice, inventorySellingPrice, inventoryStockQuantity, inventoryReorderLevel].every((value) => String(value).trim() !== "" && Number(value) >= 0);
  const inventoryAdjustComplete = Boolean(inventoryAdjustItemId) && Number(inventoryAdjustQuantity) > 0;
  const saleCanSubmit = Boolean(saleItemId ? Number(saleItemQuantity) > 0 : Number(saleAmount) > 0);
  const staffEmailValid = !staffEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail.trim());
  const staffFormComplete = Boolean(staffFullName.trim()) && Boolean(staffUsername.trim()) && Boolean(staffPassword.trim()) && Boolean(staffEmail.trim() || staffPhone.trim()) && staffEmailValid;
  const isEnterprisePlan = plan === "enterprise";
  const isProPlan = plan === "pro";
  const isBasicPlan = plan === "basic";

  const messageToneClass = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
  }[messageTone];

  const planTierDefinitions = [
    {
      id: "basic" as UiPlan,
      title: "Basic",
      subtitle: "Free / Starter",
      description: "Ideal for a single terminal or a small retail shop that needs dependable daily POS operations.",
      features: [
        "Offline and online POS terminal",
        "Real-time transaction recording",
        "Digital and print receipts",
        "Basic stock viewing",
        "Low-stock alerts",
        "Daily sales summary",
      ],
      buttonLabel: isBasicPlan ? "Current Plan" : "Downgrade to Basic",
      buttonTone: isBasicPlan ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      isRecommended: false,
    },
    {
      id: "pro" as UiPlan,
      title: "Pro",
      subtitle: "Growth",
      description: "For growing businesses that need multi-register workflows, loyalty tools, and richer stock controls.",
      features: [
        "All Basic features",
        "Multi-register support",
        "Customer loyalty and rewards",
        "Custom receipt branding",
        "Real-time stock tracking",
        "Automated reorder levels",
        "Supplier purchase orders",
        "Historical sales analytics",
        "Staff performance tracking",
      ],
      buttonLabel: isProPlan ? "Current Plan" : "Upgrade to Pro",
      buttonTone: isProPlan ? "bg-sky-600 text-white" : "bg-sky-600 text-white hover:bg-sky-700",
      isRecommended: true,
    },
    {
      id: "enterprise" as UiPlan,
      title: "Enterprise",
      subtitle: "Scale",
      description: "For multi-location operations that need advanced analytics, security controls, and API-based integrations.",
      features: [
        "All Pro features",
        "Multi-store syncing",
        "Dedicated API access",
        "Custom integrations",
        "Multi-warehouse transfer",
        "Batch and expiry tracking",
        "Automated audit logs",
        "Advanced custom KPIs",
        "Executive BI dashboards",
      ],
      buttonLabel: isEnterprisePlan ? "Current Plan" : "Contact Sales",
      buttonTone: isEnterprisePlan ? "bg-amber-600 text-white" : "bg-amber-600 text-white hover:bg-amber-700",
      isRecommended: false,
    },
  ];

  const loggedIn = Boolean(token && user);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("sb_language");
    if (storedLanguage === "en" || storedLanguage === "sw") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sb_language", language);
  }, [language]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, tabs]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fbff,_#eef2ff_42%,_#f8fafc_100%)] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] backdrop-blur sm:p-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
              {activeUiText.premiumCockpit}
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{activeUiText.businessSummary}</h1>
            <p className="max-w-3xl text-slate-600">{activeUiText.operationsDescription}</p>
            <p className="text-sm font-semibold text-emerald-700">{activeUiText.amountsNote}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <span className="mr-2">{activeUiText.chooseLanguage}</span>
              <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "sw" : "en")}
                className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
              >
                {language === "en" ? "SW" : "EN"}
              </button>
            </div>
            <button
              type="button"
              onClick={clearSession}
              className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
            >
              {activeUiText.signOut}
            </button>
          </div>
        </div>

        <div role="status" aria-live="polite" className={`rounded-2xl border p-4 text-sm font-medium shadow-sm ${messageToneClass}`}>
          {message || activeUiText.noActiveSystemMessage}
        </div>

        {!loggedIn ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-slate-700">{activeUiText.notSignedIn}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">
                {activeUiText.login}
              </Link>
              <Link href="/register" className="rounded-2xl bg-slate-200 px-5 py-3 text-slate-900 hover:bg-slate-300">
                {activeUiText.register}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <aside className="mt-6 lg:sticky lg:top-6 lg:float-left lg:w-64 rounded-[22px] border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Workspace tabs</h2>
                  <p className="text-xs text-slate-500">Collapse the navigation when you need more space.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTabSidebar((value) => !value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {showTabSidebar ? "Hide tabs" : "Show tabs"}
                </button>
              </div>

              {showTabSidebar && (
                <div className="flex flex-col gap-2">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full rounded-2xl px-3 py-2.5 text-left transition-all duration-200 ${
                          isActive
                            ? "bg-slate-900 text-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.9)]"
                            : "bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100"
                        }`}
                      >
                        <div className="truncate text-sm font-semibold">{tab.label}</div>
                        <div className={`mt-1 truncate text-[11px] ${isActive ? "text-slate-300" : "text-slate-500"}`}>{tab.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <div className="lg:ml-72">
              {activeTab === "overview" && (
                <div className="flex flex-col">
                <div className="order-1 mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">{activeUiText.operationsSummary}</h2>
                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{activeUiText.accountSecured}</div>
                  </div>
                  <p className="text-slate-600">Signed in as {user?.full_name || user?.email}. {activeUiText.operationsDescription}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">{activeUiText.accountHolder}</p>
                      <p className="mt-1 font-semibold text-slate-900">{user?.full_name || "Business user"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">{activeUiText.username}</p>
                      <p className="mt-1 font-semibold text-slate-900">{user?.username || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">{activeUiText.company}</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {user?.role === "staff" ? (user?.company_name || "Business workspace") : (user?.company_name || "Not provided")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">{activeUiText.access}</p>
                      <p className="mt-1 font-semibold text-slate-900">{user?.role === "staff" ? activeUiText.restrictedStaff : activeUiText.privateDashboard}</p>
                    </div>
                  </div>
                </div>

                <div className="order-3 mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subscription plans</p>
                      <h2 className="mt-1 text-xl font-semibold">Choose the right POS workspace for your team</h2>
                    </div>
                    <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {plan === "basic" ? "Basic" : plan === "pro" ? "Pro" : "Enterprise"}
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-3">
                    {planTierDefinitions.map((tier) => {
                      const isActive = tier.id === plan;
                      const canSelect = tier.id !== plan && !planUpdating;
                      return (
                        <div key={tier.id} className={`rounded-2xl border p-4 shadow-sm ${tier.isRecommended ? "border-sky-300 bg-sky-50/70" : "border-slate-200 bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{tier.subtitle}</div>
                              <h3 className="mt-2 text-xl font-semibold text-slate-900">{tier.title}</h3>
                            </div>
                            {tier.isRecommended && (
                              <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">Recommended</span>
                            )}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-600">{tier.description}</p>
                          <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                            {tier.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <span className="mt-0.5 text-sky-600">✓</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={() => updatePlan(tier.id)}
                            disabled={!canSelect || planUpdating}
                            className={`mt-4 w-full rounded-xl px-3 py-2.5 text-xs font-semibold transition ${isActive ? "bg-slate-900 text-white" : tier.buttonTone}`}
                          >
                            {planUpdating ? "Updating plan..." : isActive ? "Current Plan" : tier.buttonLabel}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="order-2 mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Operational KPIs</h2>
                    <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Live metrics</div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {kpis.map((kpi) => (
                      <div key={kpi.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_16px_50px_-20px_rgba(15,23,42,0.65)]">
                        <div className="text-sm uppercase tracking-[0.2em] text-slate-500">{kpi.name}</div>
                        <div
                          className="mt-3 cursor-pointer text-3xl font-semibold text-slate-900"
                          onClick={() => setSelectedKpi(kpi)}
                          role="button"
                          tabIndex={0}
                        >
                          {renderKpiValue(kpi)}
                        </div>
                        <div className="mt-3 text-sm text-slate-600">{kpi.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}

            {activeTab === "admin" && (
              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{activeUiText.adminActionTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600">{activeUiText.adminActionDescription}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStaffForm((current) => !current);
                      if (!showStaffForm) {
                        setMessage("Fill in the staff form and continue when ready.");
                      }
                    }}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {activeUiText.registerStaffButton}
                  </button>
                </div>

                {showStaffForm && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900">{activeUiText.staffFormTitle}</h3>
                    <p className="mt-1 text-sm text-slate-600">{activeUiText.staffFormSubtitle}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input className={`rounded-xl border px-4 py-3 ${staffFullName.trim() ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300"}`} value={staffFullName} onChange={(e) => setStaffFullName(e.target.value)} placeholder={activeUiText.fullName} />
                      <input className={`rounded-xl border px-4 py-3 ${staffUsername.trim() ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300"}`} value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} placeholder="Username" />
                      <input className={`rounded-xl border px-4 py-3 ${staffEmail.trim() && !staffEmailValid ? "border-rose-300 bg-rose-50/60" : staffEmail.trim() ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300"}`} value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Email" type="email" />
                      <input className={`rounded-xl border px-4 py-3 ${staffPhone.trim() ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300"}`} value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder={activeUiText.phoneNumber} type="tel" />
                      <input className={`rounded-xl border px-4 py-3 md:col-span-2 ${staffPassword.trim() ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300"}`} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder={activeUiText.temporaryPassword} type="password" />
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{activeUiText.staffFormHint}</div>
                    <button
                      type="button"
                      onClick={createStaffAccount}
                      disabled={staffSubmitting || !staffFormComplete}
                      className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {staffSubmitting ? activeUiText.createStaffAccountLoading : activeUiText.createStaffAccount}
                    </button>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{activeUiText.staffList}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{staffAccounts.length}</span>
                  </div>
                  <div className="space-y-3">
                    {staffAccounts.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{activeUiText.noStaffAccounts}</div>
                    ) : (
                      staffAccounts.map((staff) => (
                        <div key={staff.id} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{staff.full_name || staff.username || "Staff member"}</div>
                              <div className="text-sm text-slate-600">{staff.email || staff.phone || staff.username}</div>
                            </div>
                            <button type="button" onClick={() => toggleStaffAccountActive(staff.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                              {staff.is_active ? activeUiText.disable : activeUiText.enable}
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">{staff.is_active ? activeUiText.active : activeUiText.inactive} · {staff.role || "staff"}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "performance" && (
              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Business performance inputs</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Enter revenue, cost and cash position details. The system will compute profitability and efficiency metrics automatically.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Executive input</div>
                </div>
                <label className="mb-3 block text-sm font-medium text-slate-700">Revenue (TZS)</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  type="number"
                  value={revenue}
                  onChange={(event) => setRevenue(event.target.value)}
                  placeholder="Total revenue"
                />
                <label className="mb-3 block text-sm font-medium text-slate-700">Cost of goods sold (TZS)</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  type="number"
                  value={costOfGoodsSold}
                  onChange={(event) => setCostOfGoodsSold(event.target.value)}
                  placeholder="COGS amount"
                />
                <label className="mb-3 block text-sm font-medium text-slate-700">Inventory value (TZS)</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  type="number"
                  value={inventoryValue}
                  onChange={(event) => setInventoryValue(event.target.value)}
                  placeholder="Current inventory value"
                />
                <label className="mb-3 block text-sm font-medium text-slate-700">Cash balance (TZS)</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  type="number"
                  value={cashBalance}
                  onChange={(event) => setCashBalance(event.target.value)}
                  placeholder="Current cash in register"
                />
                <label className="mb-3 block text-sm font-medium text-slate-700">Previous period revenue (TZS)</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  type="number"
                  value={previousRevenue}
                  onChange={(event) => setPreviousRevenue(event.target.value)}
                  placeholder="Revenue from prior period"
                />
                <div className="mt-2 text-sm text-slate-500">
                  {performanceInputsComplete ? "All required business inputs are ready to submit." : "Complete the required inputs to enable KPI calculation."}
                </div>
                <button
                  type="button"
                  onClick={computeKpis}
                  disabled={!performanceInputsComplete}
                  className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Compute performance metrics
                </button>
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Record transaction</h3>
                    <p className="mt-1 text-sm text-slate-600">Use this section to log a completed sale or payment in Tanzanian Shillings.</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">POS ready</div>
                </div>
                <label className="mb-3 block text-sm font-medium text-slate-700">Select inventory item (optional)</label>
                <select
                  className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  value={saleItemId}
                  onChange={(event) => {
                    setSaleItemId(event.target.value);
                    if (!event.target.value) {
                      setSaleItemQuantity("1");
                    }
                  }}
                >
                  <option value="">No item selected — record amount only</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.sku}) — stock: {item.stock_quantity}</option>
                  ))}
                </select>

                {saleItemId ? (
                  <>
                    <label className="mb-3 block text-sm font-medium text-slate-700">Quantity</label>
                    <input
                      className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                      type="number"
                      min="1"
                      value={saleItemQuantity}
                      onChange={(event) => setSaleItemQuantity(event.target.value)}
                      placeholder="1"
                    />
                  </>
                ) : (
                  <>
                    <label className="mb-3 block text-sm font-medium text-slate-700">Transaction amount (TZS)</label>
                    <input
                      className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                      type="number"
                      value={saleAmount}
                      onChange={(event) => setSaleAmount(event.target.value)}
                      placeholder="0.00"
                    />
                  </>
                )}
                <label className="mb-3 block text-sm font-medium text-slate-700">Currency</label>
                <input
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={saleCurrency}
                  onChange={(event) => setSaleCurrency(event.target.value)}
                  placeholder="TZS"
                />
                <label className="mb-3 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={saleNotes}
                  onChange={(event) => setSaleNotes(event.target.value)}
                  rows={3}
                  placeholder="Transaction notes or customer details"
                />
                <div className="mt-2 text-sm text-slate-500">
                  {saleCanSubmit ? "The transaction form is ready to submit." : "Enter either a sale amount or pick an inventory item with quantity to enable logging."}
                </div>
                <button
                  type="button"
                  onClick={recordSale}
                  disabled={!saleCanSubmit}
                  className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Log transaction
                </button>
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Inventory management</h3>
                    <p className="text-sm text-slate-600">Track stock, set reorder levels, and respond to low-stock alerts before they impact sales.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Items</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{inventoryItems.length}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Low stock alerts</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{inventoryAlerts.length}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-3 text-base font-semibold">Add inventory item</h4>
                    <label className="mb-3 block text-sm font-medium text-slate-700">Item name</label>
                    <input className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3" value={inventoryName} onChange={(event) => setInventoryName(event.target.value)} placeholder="Rice 5kg" />
                    <label className="mb-3 block text-sm font-medium text-slate-700">SKU</label>
                    <input className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3" value={inventorySku} onChange={(event) => setInventorySku(event.target.value)} placeholder="SKU-004" />
                    <label className="mb-3 block text-sm font-medium text-slate-700">Category</label>
                    <input className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3" value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)} placeholder="Groceries" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-slate-700">Cost price (TZS)</label>
                        <input className="w-full rounded-xl border border-slate-300 px-4 py-3" type="number" value={inventoryCostPrice} onChange={(event) => setInventoryCostPrice(event.target.value)} placeholder="5000" />
                      </div>
                      <div>
                        <label className="mb-3 block text-sm font-medium text-slate-700">Selling price (TZS)</label>
                        <input className="w-full rounded-xl border border-slate-300 px-4 py-3" type="number" value={inventorySellingPrice} onChange={(event) => setInventorySellingPrice(event.target.value)} placeholder="7000" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-slate-700">Stock quantity</label>
                        <input className="w-full rounded-xl border border-slate-300 px-4 py-3" type="number" value={inventoryStockQuantity} onChange={(event) => setInventoryStockQuantity(event.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="mb-3 block text-sm font-medium text-slate-700">Reorder level</label>
                        <input className="w-full rounded-xl border border-slate-300 px-4 py-3" type="number" value={inventoryReorderLevel} onChange={(event) => setInventoryReorderLevel(event.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-500">
                      {inventoryCreateComplete ? "All inventory product details are ready to save." : "Fill in the product name, prices, stock, and reorder level to enable saving."}
                    </div>
                    <button type="button" onClick={createInventoryItem} disabled={!inventoryCreateComplete} className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">Save product</button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="mb-3 text-base font-semibold">Adjust stock</h4>
                    <label className="mb-3 block text-sm font-medium text-slate-700">Select item</label>
                    <select className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" value={inventoryAdjustItemId} onChange={(event) => setInventoryAdjustItemId(event.target.value)}>
                      <option value="">Choose item</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                      ))}
                    </select>
                    <label className="mb-3 block text-sm font-medium text-slate-700">Quantity change</label>
                    <input className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3" type="number" value={inventoryAdjustQuantity} onChange={(event) => setInventoryAdjustQuantity(event.target.value)} placeholder="5" />
                    <label className="mb-3 block text-sm font-medium text-slate-700">Notes</label>
                    <textarea className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3" value={inventoryAdjustNotes} onChange={(event) => setInventoryAdjustNotes(event.target.value)} rows={3} placeholder="Restock, breakage, stock count, etc." />
                    <div className="mt-3 text-sm text-slate-500">
                      {inventoryAdjustComplete ? "The stock adjustment is ready to submit." : "Choose an item and enter a positive quantity to update inventory."}
                    </div>
                    <button type="button" onClick={adjustInventoryStock} disabled={!inventoryAdjustComplete} className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300">Update inventory</button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="mb-3 text-base font-semibold">Current inventory</h4>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {inventoryItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.sku}</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">{item.name}</div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.stock_quantity <= item.reorder_level ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {item.stock_quantity <= item.reorder_level ? "Low stock" : "Healthy"}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-slate-600">Category: {item.category || "General"}</div>
                        <div className="mt-1 text-sm text-slate-600">Selling price: {formatCurrency(item.selling_price)}</div>
                        <div className="mt-1 text-sm text-slate-600">On hand: {item.stock_quantity} | Reorder: {item.reorder_level}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">History</h3>
                    <p className="text-sm text-slate-600">Review the full KPI event trail for this account, filter by business metric, and sort by date or KPI name.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-slate-700">
                      <span className="mb-1 block">Filter KPI</span>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                        value={historyFilter}
                        onChange={(event) => setHistoryFilter(event.target.value)}
                      >
                        <option value="all">All KPIs</option>
                        {kpis.map((kpi) => (
                          <option key={kpi.id ?? kpi.key} value={kpi.id ?? ""}>{kpi.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700">
                      <span className="mb-1 block">Sort by</span>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                        value={historySort}
                        onChange={(event) => setHistorySort(event.target.value)}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="kpi">KPI name</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredHistoryEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                      No KPI history records are available for the current selection.
                    </div>
                  ) : (
                    filteredHistoryEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.kpiName}</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{formatMetricValue(entry.value, entry.kpiUnit)}</div>
                            <div className="mt-2 text-sm text-slate-700">{entry.notes || "No notes recorded for this snapshot."}</div>
                          </div>
                          <div className="text-sm text-slate-500 lg:text-right">
                            <div>{formatHistoryTimestamp(entry.recorded_at)}</div>
                            <div className="mt-1">Recorded by {entry.recorded_by_name || user?.full_name || user?.email || "the logged-in user"}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {selectedKpi && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedKpi.name}</h3>
                      <p className="text-sm text-slate-500">{selectedKpi.description}</p>
                    </div>
                    <button className="text-slate-500" onClick={() => setSelectedKpi(null)}>Close</button>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-semibold">{renderKpiValue(selectedKpi)}</div>
                    <div className="mt-3 text-sm text-slate-700">{interpretKpi(selectedKpi)}</div>

                    <div className="mt-6">
                      <h4 className="text-sm font-semibold">Recent entries</h4>
                      {kpiHistory.length === 0 ? (
                        <p className="text-sm text-slate-500">No historical entries available.</p>
                      ) : (
                        <ul className="mt-3 space-y-2 max-h-48 overflow-auto">
                          {kpiHistory.map((h) => (
                            <li key={h.id} className="flex items-start justify-between rounded-lg bg-slate-50 p-3">
                              <div>
                                <div className="text-sm font-medium">{renderKpiValue({ ...selectedKpi, value: h.value })}</div>
                                <div className="text-xs text-slate-500">{h.notes || ""}</div>
                                <div className="mt-1 text-[11px] text-slate-400">Recorded by {h.recorded_by_name || user?.full_name || user?.email || "the logged-in user"}</div>
                              </div>
                              <div className="text-xs text-slate-400">{h.recorded_at ? formatHistoryTimestamp(h.recorded_at) : ""}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
