import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const API_URL = `${API_BASE_URL}/api/dashboard`;
const FORECAST_API =
  `${API_BASE_URL}/api/ai/sales-forecast`;
const DAILY_MENU_API =
  `${API_BASE_URL}/api/ai/daily-menu`;
const RESERVATIONS_API =
  `${API_BASE_URL}/api/reservations`;

function Dashboard() {
  const { authFetch, logout } = useAuth();

  const [data, setData] = useState({
    totalSales: 0,
    todaySales: 0,

    totalOrders: 0,
    todayOrders: 0,

    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,

    totalProducts: 0,
    lowStock: 0,
    totalCustomers: 0,

    averageOrderValue: 0,
    last7DaysSales: 0,
    last7DaysOrders: 0,

    recentOrders: [],
    bestSelling: [],
    salesLast7Days: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [forecast, setForecast] = useState(null);
  const [dailyMenu, setDailyMenu] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [intelligenceLoading, setIntelligenceLoading] =
    useState(true);

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  const checkAuthResponse = async (response) => {
    if (response.status === 401) {
      logout();
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    if (response.status === 403) {
      const result = await response
        .json()
        .catch(() => ({}));

      throw new Error(
        result.message ||
          "Vous n'avez pas l'autorisation d'accéder à cette ressource."
      );
    }

    return response;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setIntelligenceLoading(true);
      setError("");

      const [
        dashboardResponse,
        forecastResponse,
        dailyMenuResponse,
        reservationsResponse,
      ] = await Promise.all([
        authFetch(API_URL),
        authFetch(FORECAST_API),
        authFetch(DAILY_MENU_API),
        authFetch(RESERVATIONS_API),
      ]);

      await checkAuthResponse(dashboardResponse);
      await checkAuthResponse(forecastResponse);
      await checkAuthResponse(dailyMenuResponse);
      await checkAuthResponse(reservationsResponse);

      const [
        dashboardResult,
        forecastResult,
        dailyMenuResult,
        reservationsResult,
      ] = await Promise.all([
        dashboardResponse.json().catch(() => ({})),
        forecastResponse.json().catch(() => ({})),
        dailyMenuResponse.json().catch(() => ({})),
        reservationsResponse.json().catch(() => []),
      ]);

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardResult.message ||
            "Erreur lors du chargement du centre de pilotage"
        );
      }

      setData(dashboardResult);

      if (forecastResponse.ok) {
        setForecast(forecastResult);
      } else {
        setForecast(null);
      }

      if (dailyMenuResponse.ok) {
        setDailyMenu(dailyMenuResult);
      } else {
        setDailyMenu(null);
      }

      if (reservationsResponse.ok) {
        setReservations(
          Array.isArray(reservationsResult)
            ? reservationsResult
            : []
        );
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
      setIntelligenceLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    if (status === "Terminée") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "En préparation") {
      return "bg-amber-100 text-amber-700";
    }

    if (status === "Prête") {
      return "bg-violet-100 text-violet-700";
    }

    if (status === "Annulée") {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  // =====================================================
  // REAL SALES DATA
  // =====================================================

  const salesData =
    data.salesLast7Days?.map((day) => ({
      jour: day.date,
      ventes: day.sales,
      commandes: day.orders,
      date: day.fullDate,
    })) || [];

  // =====================================================
  // ORDER STATUS DATA
  // =====================================================

  const orderStatusData = [
    {
      name: "En cours",
      value: data.activeOrders || 0,
    },
    {
      name: "Terminées",
      value: data.completedOrders || 0,
    },
    {
      name: "Annulées",
      value: data.cancelledOrders || 0,
    },
  ];

  // =====================================================
  // DISH DATA
  // =====================================================

  const bestSellingData =
    data.bestSelling?.map((dish) => ({
      name: dish.name,
      ventes: dish.quantity || 0,
      revenu: dish.revenue || 0,
    })) || [];


  const todayString = new Date()
    .toISOString()
    .slice(0, 10);

  const todayReservations =
    reservations.filter((reservation) => {
      if (!reservation.date) {
        return false;
      }

      return new Date(reservation.date)
        .toISOString()
        .slice(0, 10) === todayString;
    });

  const forecastSummary =
    forecast?.summary || {};

  const forecastTotal =
    Number(
      forecastSummary.predictedNext7Days || 0
    );

  const forecastTrend =
    forecastSummary.trend || "stable";

  const forecastTrendPercentage =
    Number(
      forecastSummary.trendPercentage || 0
    );

  const bestForecastDay =
    forecastSummary.bestForecastDay || null;

  const dailySuggestions =
    dailyMenu?.suggestions || [];

  const mainDailySuggestion =
    dailySuggestions[0] || null;

  const stockAlerts =
    Number(data.lowStock || 0) +
    Number(
      dailyMenu?.stockSummary
        ?.outOfStockProducts || 0
    );

  const importantAlertLabel =
    stockAlerts > 0
      ? `${stockAlerts} alerte(s) stock`
      : "Aucune alerte critique";

  const getForecastBadge = () => {
    if (forecastTrend === "hausse") {
      return {
        label: "En hausse",
        className:
          "bg-emerald-100 text-emerald-700",
        icon: "↗",
      };
    }

    if (forecastTrend === "baisse") {
      return {
        label: "En baisse",
        className:
          "bg-rose-100 text-rose-700",
        icon: "↘",
      };
    }

    return {
      label: "Stable",
      className:
        "bg-slate-100 text-slate-700",
      icon: "→",
    };
  };

  const forecastBadge =
    getForecastBadge();

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          ⏳
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement du centre de pilotage
        </h2>

        <p className="text-slate-500 mt-2">
          Récupération des données MongoDB...
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />

            <p className="text-xs font-bold tracking-widest text-emerald-600">
              SYSTÈME CONNECTÉ
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Centre de pilotage 🎯
          </h1>

          <p className="text-slate-500 mt-2">
            Vue en temps réel de l'activité, des performances et des décisions clés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-3">
            <p className="text-xs text-slate-400">
              CA aujourd&apos;hui
            </p>

            <p className="text-xl font-bold text-emerald-600">
              {Number(data.todaySales || 0).toFixed(2)} DH
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4">
          ⚠ {error}
        </div>
      )}

      {/* ================================================= */}
      {/* MAIN STAT CARDS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {/* SALES */}

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              💰
            </div>

            <p className="text-white/80 text-sm">
              Chiffre d&apos;affaires
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {Number(data.totalSales || 0).toFixed(2)} DH
            </h2>

            <p className="text-xs text-white/70 mt-3">
              Commandes terminées
            </p>
          </div>
        </div>

        {/* ORDERS */}

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              🧾
            </div>

            <p className="text-white/80 text-sm">
              Commandes
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {data.totalOrders}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              {data.todayOrders} aujourd&apos;hui
            </p>
          </div>
        </div>

        {/* ACTIVE */}

        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/20" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-5">
              ⏳
            </div>

            <p className="text-orange-900/70 text-sm">
              En cours
            </p>

            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              {data.activeOrders}
            </h2>

            <p className="text-xs text-orange-900/70 mt-3">
              Commandes à traiter
            </p>
          </div>
        </div>

        {/* MENU */}

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-purple-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              🍽️
            </div>

            <p className="text-white/80 text-sm">
              Plats
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {data.totalProducts}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              Articles au menu
            </p>
          </div>
        </div>

        {/* STOCK */}

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-pink-400 to-rose-600 shadow-lg shadow-pink-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              📦
            </div>

            <p className="text-white/80 text-sm">
              Stock faible
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {data.lowStock}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              ⚠ À surveiller
            </p>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* ANALYTICS CARDS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">
            Panier moyen
          </p>

          <h3 className="text-3xl font-bold mt-2 text-violet-600">
            {Number(data.averageOrderValue || 0).toFixed(2)} DH
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Par commande terminée
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">
            Ventes sur 7 jours
          </p>

          <h3 className="text-3xl font-bold mt-2 text-emerald-600">
            {Number(data.last7DaysSales || 0).toFixed(2)} DH
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Chiffre d&apos;affaires récent
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">
            Commandes sur 7 jours
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {data.last7DaysOrders}
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Commandes terminées
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">
            Clients
          </p>

          <h3 className="text-3xl font-bold mt-2 text-cyan-600">
            {data.totalCustomers}
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Clients uniques
          </p>
        </div>


        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">
            Réservations aujourd&apos;hui
          </p>

          <h3 className="text-3xl font-bold mt-2 text-rose-600">
            {todayReservations.length}
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            À accueillir aujourd&apos;hui
          </p>
        </div>
      </div>

      {/* ================================================= */}
      {/* CHART ROW 1 */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-[1.4fr_0.8fr] gap-5 mb-6">
        {/* SALES */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-7">
            <div>
              <h2 className="text-xl font-bold">
                📈 Évolution des ventes
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Données réelles des 7 derniers jours
              </p>
            </div>

            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl">
              <p className="text-xs">
                Aujourd&apos;hui
              </p>

              <p className="font-bold">
                {Number(data.todaySales || 0).toFixed(0)} DH
              </p>
            </div>
          </div>

          <div className="h-[330px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={salesData}
                margin={{
                  top: 10,
                  right: 10,
                  bottom: 0,
                  left: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="salesColor"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#10b981"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="#10b981"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="jour"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  labelFormatter={(label, payload) => {
                    if (payload?.length) {
                      return payload[0].payload.date;
                    }

                    return label;
                  }}
                  formatter={(value, name) => {
                    if (name === "ventes") {
                      return [
                        `${value} DH`,
                        "Ventes",
                      ];
                    }

                    return [
                      value,
                      "Commandes",
                    ];
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="ventes"
                  stroke="#10b981"
                  strokeWidth={4}
                  fill="url(#salesColor)"
                />

                <Area
                  type="monotone"
                  dataKey="commandes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONUT */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-xl font-bold">
            🍩 État des commandes
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Répartition globale
          </p>

          <div className="h-[260px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">
                En cours
              </p>

              <p className="font-bold text-amber-600 text-xl">
                {data.activeOrders}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">
                Terminées
              </p>

              <p className="font-bold text-emerald-600 text-xl">
                {data.completedOrders}
              </p>
            </div>

            <div className="bg-rose-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">
                Annulées
              </p>

              <p className="font-bold text-rose-600 text-xl">
                {data.cancelledOrders}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* CHART ROW 2 */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-2 gap-5 mb-6">
        {/* QUANTITY BY DISH */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                🍽️ Ventes par plat
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Nombre d&apos;unités vendues
              </p>
            </div>

            <span className="text-3xl">
              🏆
            </span>
          </div>

          {bestSellingData.length === 0 ? (
            <div className="h-[340px] flex flex-col items-center justify-center text-slate-500">
              <div className="text-5xl mb-3">
                🍲
              </div>

              <p className="font-semibold">
                Pas encore de ventes
              </p>
            </div>
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={bestSellingData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value) => [
                      value,
                      "Unités vendues",
                    ]}
                  />

                  <Bar
                    dataKey="ventes"
                    fill="#8b5cf6"
                    radius={[10, 10, 0, 0]}
                    barSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* REVENUE BY DISH */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                💵 Revenus par plat
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Chiffre d&apos;affaires généré par produit
              </p>
            </div>

            <span className="text-3xl">
              💰
            </span>
          </div>

          {bestSellingData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-slate-500">
              Pas encore de données.
            </div>
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={bestSellingData}
                  layout="vertical"
                  margin={{
                    left: 25,
                    right: 25,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value} DH`,
                      "Revenu",
                    ]}
                  />

                  <Bar
                    dataKey="revenu"
                    fill="#f97316"
                    radius={[0, 10, 10, 0]}
                    barSize={25}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* RESTOFLOW INTELLIGENCE */}
      {/* ================================================= */}

      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />

              <p className="text-xs font-bold tracking-widest text-violet-600">
                RESTOFLOW INTELLIGENCE
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              🤖 Assistance intelligente
            </h2>

            <p className="text-slate-500 mt-1">
              Prévisions, suggestions et alertes utiles pour piloter le restaurant.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 font-semibold hover:bg-violet-100 transition"
          >
            ✨ Actualiser l&apos;IA
          </button>
        </div>

        <div className="grid xl:grid-cols-3 gap-5">
          {/* SALES FORECAST */}

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white p-6 shadow-lg">
            <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="w-13 h-13 rounded-2xl bg-violet-500/20 flex items-center justify-center text-3xl">
                  🔮
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${forecastBadge.className}`}
                >
                  {forecastBadge.icon} {forecastBadge.label}
                </span>
              </div>

              <p className="text-xs font-bold tracking-widest text-violet-300 mt-5">
                PRÉVISION 7 JOURS
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {intelligenceLoading
                  ? "..."
                  : `${forecastTotal.toFixed(2)} DH`}
              </h3>

              <p className="text-slate-300 text-sm mt-2">
                Chiffre d&apos;affaires estimé
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-white/10 rounded-2xl p-3">
                  <p className="text-xs text-slate-400">
                    Variation
                  </p>

                  <p className="font-bold mt-1">
                    {forecastTrendPercentage > 0
                      ? "+"
                      : ""}
                    {forecastTrendPercentage.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-3">
                  <p className="text-xs text-slate-400">
                    Meilleur jour
                  </p>

                  <p className="font-bold mt-1 truncate">
                    {bestForecastDay?.label ||
                      "Non disponible"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DAILY MENU */}

          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
            <div className="absolute -right-14 -top-14 w-40 h-40 rounded-full bg-orange-100" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-3xl text-white">
                  🍳
                </div>

                <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold">
                  MENU IA
                </span>
              </div>

              <p className="text-xs font-bold tracking-widest text-orange-500 mt-5">
                SUGGESTION DU JOUR
              </p>

              <h3 className="text-xl font-bold text-slate-900 mt-2">
                {mainDailySuggestion?.name ||
                  "Aucune suggestion disponible"}
              </h3>

              <p className="text-sm text-slate-500 mt-3 leading-6">
                {mainDailySuggestion?.reason ||
                  dailyMenu?.aiMessage ||
                  "Le stock doit être analysé pour générer une suggestion."}
              </p>

              {mainDailySuggestion?.ingredients?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {mainDailySuggestion.ingredients
                    .slice(0, 4)
                    .map((ingredient) => (
                      <span
                        key={ingredient}
                        className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
                      >
                        {ingredient}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* ALERTS */}

          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl">
                ⚠️
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  stockAlerts > 0
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {stockAlerts > 0
                  ? "À surveiller"
                  : "Tout va bien"}
              </span>
            </div>

            <p className="text-xs font-bold tracking-widest text-rose-500 mt-5">
              ALERTES IMPORTANTES
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-2">
              {importantAlertLabel}
            </h3>

            <div className="space-y-3 mt-5">
              <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
                <span className="text-sm text-slate-600">
                  Stock faible
                </span>

                <span className="font-bold text-amber-700">
                  {data.lowStock || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3">
                <span className="text-sm text-slate-600">
                  Ruptures
                </span>

                <span className="font-bold text-rose-700">
                  {dailyMenu?.stockSummary
                    ?.outOfStockProducts || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <span className="text-sm text-slate-600">
                  Réservations aujourd&apos;hui
                </span>

                <span className="font-bold text-blue-700">
                  {todayReservations.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* RECENT ORDERS */}
      {/* ================================================= */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              🧾 Commandes récentes
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Dernières commandes enregistrées.
            </p>
          </div>

          <span className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-semibold">
            {data.totalOrders} commandes
          </span>
        </div>

        {data.recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">
              🧾
            </div>

            <h3 className="font-bold text-lg">
              Aucune commande
            </h3>

            <p className="text-slate-500 text-sm mt-1">
              Les nouvelles commandes apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-4">
                    Commande
                  </th>

                  <th className="text-left px-5 py-4">
                    Client
                  </th>

                  <th className="text-left px-5 py-4">
                    Articles
                  </th>

                  <th className="text-left px-5 py-4">
                    Total
                  </th>

                  <th className="text-left px-5 py-4">
                    Paiement
                  </th>

                  <th className="text-left px-5 py-4">
                    Statut
                  </th>

                  <th className="text-left px-5 py-4">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.recentOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 font-bold">
                      {order.orderNumber}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                          👤
                        </div>

                        {order.customer?.name ||
                          order.customerName}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {order.items?.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.quantity || 0
                          ),
                        0
                      ) || 0}
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {Number(
                        order.total || 0
                      ).toFixed(2)}{" "}
                      DH
                    </td>

                    <td className="px-5 py-4">
                      {order.paymentMethod}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {new Date(
                        order.createdAt
                      ).toLocaleString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* TOP DISHES + SUMMARY */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-[1.4fr_0.7fr] gap-5">
        {/* TOP DISHES */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">
                🔥 Top des plats
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Classement des meilleures ventes.
              </p>
            </div>

            <span className="text-3xl">
              🏆
            </span>
          </div>

          {data.bestSelling.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              Pas encore de ventes terminées.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.bestSelling.map((dish, index) => (
                <div
                  key={dish.name}
                  className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl">
                      🍲
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        {dish.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {dish.quantity} unité
                        {dish.quantity > 1
                          ? "s"
                          : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-emerald-600">
                        {Number(
                          dish.revenue || 0
                        ).toFixed(0)}{" "}
                        DH
                      </p>

                      <p className="text-xs text-slate-400">
                        revenu
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SUMMARY */}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101c31] via-[#17233a] to-[#0c1525] text-white p-7">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-orange-500/20 blur-3xl" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl mb-6">
              🚀
            </div>

            <p className="text-orange-300 text-xs font-bold tracking-widest">
              RESTAURANT INTELLIGENT
            </p>

            <h2 className="text-3xl font-bold mt-3">
              Votre restaurant en un coup d'œil.
            </h2>

            <p className="text-slate-300 mt-3">
              Ventes, commandes, clients, stock et intelligence RestoFlow sont réunis dans un seul centre de pilotage.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-7">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-300">
                  Commandes aujourd&apos;hui
                </p>

                <p className="text-xl font-bold mt-2">
                  {data.todayOrders}
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-300">
                  CA aujourd&apos;hui
                </p>

                <p className="text-xl font-bold mt-2">
                  {Number(
                    data.todaySales || 0
                  ).toFixed(0)}{" "}
                  DH
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 mt-3">
              <p className="text-xs text-slate-300">
                Panier moyen
              </p>

              <p className="text-2xl font-bold mt-2">
                {Number(
                  data.averageOrderValue || 0
                ).toFixed(2)}{" "}
                DH
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;