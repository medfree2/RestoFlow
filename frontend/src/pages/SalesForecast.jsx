import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

function SalesForecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  // =====================================================
  // LOAD FORECAST
  // =====================================================

  const loadForecast = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Session introuvable. Veuillez vous reconnecter."
        );
      }

      const response = await fetch(
        `${API_URL}/api/ai/sales-forecast`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible de charger les prévisions."
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        "SALES FORECAST FRONTEND ERROR:",
        err
      );

      setError(
        err.message ||
          "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  // =====================================================
  // DATA
  // =====================================================

  const historicalDays =
    data?.historicalDays || [];

  const forecast =
    data?.forecast || [];

  const summary =
    data?.summary || {};

  // =====================================================
  // MONEY FORMAT
  // =====================================================

  const formatMoney = (value) => {
    const number =
      Number(value) || 0;

    return `${number.toLocaleString(
      "fr-FR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )} DH`;
  };

  // =====================================================
  // TREND
  // =====================================================

  const trendConfig =
    useMemo(() => {
      const trend =
        summary?.trend ||
        "stable";

      if (trend === "hausse") {
        return {
          icon: "↗",
          label: "En hausse",
          badge:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconBox:
            "bg-emerald-100 text-emerald-700",
        };
      }

      if (trend === "baisse") {
        return {
          icon: "↘",
          label: "En baisse",
          badge:
            "bg-rose-50 text-rose-700 border-rose-200",
          iconBox:
            "bg-rose-100 text-rose-700",
        };
      }

      return {
        icon: "→",
        label: "Stable",
        badge:
          "bg-slate-100 text-slate-700 border-slate-200",
        iconBox:
          "bg-slate-100 text-slate-700",
      };
    }, [summary?.trend]);

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData =
    useMemo(() => {
      const history =
        historicalDays
          .slice(-14)
          .map((day) => ({
            label: day.label,
            value:
              Number(day.sales) ||
              0,
            type: "history",
          }));

      const prediction =
        forecast.map((day) => ({
          label: day.label,
          value:
            Number(
              day.predictedSales
            ) || 0,
          type: "forecast",
        }));

      return [
        ...history,
        ...prediction,
      ];
    }, [
      historicalDays,
      forecast,
    ]);

  const maxChartValue =
    useMemo(() => {
      if (!chartData.length) {
        return 1;
      }

      return Math.max(
        ...chartData.map(
          (item) =>
            item.value
        ),
        1
      );
    }, [chartData]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-orange-500 animate-spin" />

              <h2 className="mt-6 text-xl font-bold text-slate-900">
                Analyse des ventes...
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                RestoFlow prépare les prévisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-rose-200 rounded-3xl shadow-sm p-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Impossible de charger les prévisions
            </h2>

            <p className="mt-3 text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadForecast}
              className="mt-6 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              🔄 Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-5 sm:p-6 lg:p-8">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
                📈
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
                  Prévision des ventes
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                  Analyse intelligente des ventes et prévisions sur 7 jours
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadForecast}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            🔄 Actualiser les prévisions
          </button>
        </div>

        {/* ================================================= */}
        {/* AI BANNER */}
        {/* ================================================= */}

        <div className="mt-7 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-6 sm:p-7 shadow-lg overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-orange-500/10" />

          <div className="absolute right-20 -bottom-16 w-44 h-44 rounded-full bg-pink-500/10" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl">
                🤖
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold">
                    Analyse IA
                  </h2>

                  <span className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                    ● OpenRouter AI
                  </span>
                </div>

                <p className="mt-3 text-sm sm:text-base leading-7 text-slate-300 max-w-4xl">
                  {data?.aiMessage ||
                    "Aucune analyse disponible."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* KPI CARDS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
          {/* 30 DAYS */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">
                💰
              </div>

              <span className="text-xs font-semibold text-slate-400">
                30 JOURS
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Chiffre d'affaires
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {formatMoney(
                summary.totalHistoricalSales
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {
                summary.historicalOrderCount ||
                0
              }{" "}
              commandes terminées
            </p>
          </div>

          {/* DAILY AVERAGE */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                📊
              </div>

              <span className="text-xs font-semibold text-slate-400">
                MOYENNE
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Moyenne quotidienne
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {formatMoney(
                summary.averageDailySales
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Basée sur les 30 derniers jours
            </p>
          </div>

          {/* FORECAST */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl">
                🔮
              </div>

              <span className="text-xs font-semibold text-violet-500">
                PRÉVISION
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Prochains 7 jours
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {formatMoney(
                summary.predictedNext7Days
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Chiffre d'affaires estimé
            </p>
          </div>

          {/* TREND */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-bold ${trendConfig.iconBox}`}
              >
                {trendConfig.icon}
              </div>

              <span
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${trendConfig.badge}`}
              >
                {trendConfig.label}
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Tendance récente
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {Number(
                summary.trendPercentage ||
                  0
              ) > 0
                ? "+"
                : ""}
              {Number(
                summary.trendPercentage ||
                  0
              ).toFixed(1)}
              %
            </p>

            <p className="mt-2 text-xs text-slate-400">
              7 derniers jours vs période précédente
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* CHART */}
        {/* ================================================= */}

        <div className="mt-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Historique & prévisions
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                14 derniers jours et prévision des 7 prochains jours
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-800" />

                <span className="text-slate-500">
                  Historique
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />

                <span className="text-slate-500">
                  Prévision
                </span>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="min-h-[320px] flex items-center justify-center text-slate-400">
              Aucune donnée disponible.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <div className="min-w-[900px] h-[340px] flex items-end gap-2 border-b border-slate-200 px-2">
                {chartData.map(
                  (item, index) => {
                    const height =
                      item.value > 0
                        ? Math.max(
                            8,
                            (item.value /
                              maxChartValue) *
                              260
                          )
                        : 4;

                    return (
                      <div
                        key={`${item.type}-${item.label}-${index}`}
                        className="flex-1 min-w-[32px] h-full flex flex-col justify-end items-center group"
                      >
                        <div className="relative w-full flex justify-center items-end flex-1">
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition bg-slate-950 text-white text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                            {formatMoney(
                              item.value
                            )}
                          </div>

                          <div
                            style={{
                              height: `${height}px`,
                            }}
                            className={`w-full max-w-[30px] rounded-t-lg transition-all ${
                              item.type ===
                              "forecast"
                                ? "bg-gradient-to-t from-orange-500 to-pink-500"
                                : "bg-slate-800"
                            }`}
                          />
                        </div>

                        <p className="mt-3 text-[10px] text-slate-400 whitespace-nowrap">
                          {item.label}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* FORECAST TABLE + BEST DAY */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-7">
          {/* FORECAST TABLE */}

          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950">
                Prévisions — 7 prochains jours
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Estimation quotidienne du chiffre d'affaires
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Jour
                    </th>

                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Vente prévue
                    </th>

                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Part
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {forecast.map(
                    (day, index) => {
                      const total =
                        Number(
                          summary.predictedNext7Days
                        ) || 0;

                      const percentage =
                        total > 0
                          ? (Number(
                              day.predictedSales
                            ) /
                              total) *
                            100
                          : 0;

                      return (
                        <tr
                          key={
                            day.date ||
                            index
                          }
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                                📅
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800 capitalize">
                                  {day.label}
                                </p>

                                <p className="text-xs text-slate-400 mt-0.5">
                                  {day.date}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {formatMoney(
                              day.predictedSales
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      percentage
                                    )}%`,
                                  }}
                                />
                              </div>

                              <span className="text-xs font-semibold text-slate-500 w-12 text-right">
                                {percentage.toFixed(
                                  1
                                )}
                                %
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}

                  {forecast.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Aucune prévision disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN */}

          <div className="space-y-6">
            {/* BEST DAY */}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">
                🏆
              </div>

              <p className="mt-5 text-sm font-medium text-slate-500">
                Meilleur jour prévu
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-950 capitalize">
                {summary
                  ?.bestForecastDay
                  ?.label ||
                  "Non disponible"}
              </h3>

              <p className="mt-2 text-2xl font-bold text-orange-600">
                {formatMoney(
                  summary
                    ?.bestForecastDay
                    ?.predictedSales
                )}
              </p>
            </div>

            {/* RECENT AVERAGE */}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
                📉
              </div>

              <p className="mt-5 text-sm font-medium text-slate-500">
                Moyenne récente
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {formatMoney(
                  summary.recentAverage
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Moyenne des 7 derniers jours
              </p>
            </div>

            {/* INFORMATION */}

            <div className="rounded-3xl bg-orange-50 border border-orange-100 p-6">
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  💡
                </div>

                <div>
                  <h3 className="font-bold text-orange-900">
                    À savoir
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-orange-800/80">
                    Ces valeurs sont des estimations basées sur l'historique des ventes et la tendance récente. Elles ne garantissent pas les ventes futures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div className="mt-8 pb-4 text-center">
          <p className="text-xs text-slate-400">
            RestoFlow • Prévisions générées à partir des données du restaurant
          </p>
        </div>
      </div>
    </div>
  );
}

export default SalesForecast;