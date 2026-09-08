import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import SalesForecast from "./SalesForecast";
import { API_BASE_URL } from "../config/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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

const REPORTS_API = `${API_BASE_URL}/api/reports`;

function RapportsContent() {
  const { authFetch, logout } = useAuth();

  const [data, setData] = useState({
    period: {
      from: null,
      to: null,
    },

    summary: {
      totalOrders: 0,
      completedOrders: 0,
      activeOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    },

    paymentBreakdown: [],
    topDishes: [],
    topCustomers: [],
    dailySales: [],
    statusBreakdown: [],

    stock: {
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      lowStockProducts: [],
    },
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // AUTH RESPONSE CHECK
  // =====================================================

  const checkAuthResponse = async (response) => {
    if (response.status === 401) {
      logout();

      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));

      throw new Error(
        data.message ||
          "Vous n'avez pas l'autorisation d'accéder aux rapports."
      );
    }

    return response;
  };

  // =====================================================
  // LOAD REPORTS
  // =====================================================

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (from) {
        params.append("from", from);
      }

      if (to) {
        params.append("to", to);
      }

      const url =
        params.toString().length > 0
          ? `${REPORTS_API}?${params.toString()}`
          : REPORTS_API;

      const response = await authFetch(url);

      await checkAuthResponse(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Erreur lors du chargement des rapports"
        );
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // =====================================================
  // FILTER BUTTON
  // =====================================================

  const handleApplyFilter = (e) => {
    e.preventDefault();

    if (
      from &&
      to &&
      new Date(from) > new Date(to)
    ) {
      alert(
        "La date de début doit être antérieure à la date de fin."
      );

      return;
    }

    loadReports();
  };

  const clearFilters = async () => {
    setFrom("");
    setTo("");

    try {
      setLoading(true);
      setError("");

      const response = await authFetch(REPORTS_API);

      await checkAuthResponse(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Erreur lors du chargement des rapports"
        );
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CHART DATA
  // =====================================================

  const dailySalesData =
    data.dailySales?.map((item) => ({
      date: item.date,
      ventes: Number(item.revenue || 0),
      commandes: Number(item.orders || 0),
    })) || [];

  const paymentData =
    data.paymentBreakdown?.map((item) => ({
      name: item.name,
      value: Number(item.orders || 0),
      revenue: Number(item.revenue || 0),
    })) || [];

  const dishData =
    data.topDishes?.map((dish) => ({
      name: dish.name,
      ventes: Number(dish.quantity || 0),
      revenu: Number(dish.revenue || 0),
    })) || [];

  const customerData =
    data.topCustomers?.map((customer) => ({
      name: customer.name,
      commandes: Number(customer.orders || 0),
      depenses: Number(customer.spent || 0),
    })) || [];

  // =====================================================
  // CALCULATED INFO
  // =====================================================

  const completionRate = useMemo(() => {
    const total =
      Number(
        data.summary.totalOrders || 0
      );

    if (total === 0) {
      return 0;
    }

    return Math.round(
      (Number(
        data.summary.completedOrders || 0
      ) /
        total) *
        100
    );
  }, [data]);

  const cancellationRate = useMemo(() => {
    const total =
      Number(
        data.summary.totalOrders || 0
      );

    if (total === 0) {
      return 0;
    }

    return Math.round(
      (Number(
        data.summary.cancelledOrders || 0
      ) /
        total) *
        100
    );
  }, [data]);

  const topDish =
    data.topDishes?.[0] || null;

  const topCustomer =
    data.topCustomers?.[0] || null;

  // =====================================================
  // PERIOD HELPERS
  // =====================================================

  const formatInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const applyQuickPeriod = (
    days
  ) => {
    const endDate = new Date();
    const startDate = new Date();

    startDate.setDate(
      endDate.getDate() -
        (days - 1)
    );

    setFrom(
      formatInputDate(startDate)
    );

    setTo(
      formatInputDate(endDate)
    );
  };

  const applyToday = () => {
    const today =
      formatInputDate(
        new Date()
      );

    setFrom(today);
    setTo(today);
  };

  const formatPeriodLabel = () => {
    if (from && to) {
      return `Du ${new Date(
        `${from}T00:00:00`
      ).toLocaleDateString(
        "fr-FR"
      )} au ${new Date(
        `${to}T00:00:00`
      ).toLocaleDateString(
        "fr-FR"
      )}`;
    }

    if (from) {
      return `À partir du ${new Date(
        `${from}T00:00:00`
      ).toLocaleDateString(
        "fr-FR"
      )}`;
    }

    if (to) {
      return `Jusqu'au ${new Date(
        `${to}T00:00:00`
      ).toLocaleDateString(
        "fr-FR"
      )}`;
    }

    return "Toutes les données";
  };

  // =====================================================
  // PDF EXPORT
  // =====================================================

  const exportPDF = () => {
    try {
      const doc =
        new jsPDF({
          orientation:
            "portrait",
          unit: "mm",
          format: "a4",
        });

      const generatedAt =
        new Date()
          .toLocaleString(
            "fr-FR"
          );

      doc.setFontSize(20);
      doc.text(
        "RestoFlow",
        14,
        18
      );

      doc.setFontSize(13);
      doc.text(
        "Rapport de gestion du restaurant",
        14,
        26
      );

      doc.setFontSize(10);
      doc.text(
        `Période : ${formatPeriodLabel()}`,
        14,
        34
      );

      doc.text(
        `Généré le : ${generatedAt}`,
        14,
        40
      );

      autoTable(doc, {
        startY: 48,

        head: [
          [
            "Indicateur",
            "Valeur",
          ],
        ],

        body: [
          [
            "Chiffre d'affaires",
            `${Number(
              data.summary
                .totalRevenue ||
                0
            ).toFixed(2)} DH`,
          ],
          [
            "Commandes",
            Number(
              data.summary
                .totalOrders ||
                0
            ),
          ],
          [
            "Commandes terminées",
            Number(
              data.summary
                .completedOrders ||
                0
            ),
          ],
          [
            "Commandes en cours",
            Number(
              data.summary
                .activeOrders ||
                0
            ),
          ],
          [
            "Commandes annulées",
            Number(
              data.summary
                .cancelledOrders ||
                0
            ),
          ],
          [
            "Panier moyen",
            `${Number(
              data.summary
                .averageOrderValue ||
                0
            ).toFixed(2)} DH`,
          ],
          [
            "Taux de réussite",
            `${completionRate}%`,
          ],
          [
            "Taux d'annulation",
            `${cancellationRate}%`,
          ],
        ],

        theme: "grid",

        headStyles: {
          fillColor: [
            15,
            23,
            42,
          ],
        },
      });

      let nextY =
        doc.lastAutoTable
          ?.finalY + 10 ||
        110;

      doc.setFontSize(13);
      doc.text(
        "Plats les plus vendus",
        14,
        nextY
      );

      autoTable(doc, {
        startY: nextY + 4,

        head: [
          [
            "#",
            "Plat",
            "Quantité",
            "Revenu",
          ],
        ],

        body:
          data.topDishes?.length
            ? data.topDishes.map(
                (
                  dish,
                  index
                ) => [
                  index + 1,
                  dish.name,
                  Number(
                    dish.quantity ||
                      0
                  ),
                  `${Number(
                    dish.revenue ||
                      0
                  ).toFixed(
                    2
                  )} DH`,
                ]
              )
            : [
                [
                  "-",
                  "Aucune donnée",
                  "-",
                  "-",
                ],
              ],

        theme: "striped",
      });

      nextY =
        doc.lastAutoTable
          ?.finalY + 10 ||
        nextY + 60;

      if (nextY > 250) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFontSize(13);
      doc.text(
        "Meilleurs clients",
        14,
        nextY
      );

      autoTable(doc, {
        startY: nextY + 4,

        head: [
          [
            "#",
            "Client",
            "Commandes",
            "Dépenses",
          ],
        ],

        body:
          data.topCustomers
            ?.length
            ? data.topCustomers.map(
                (
                  customer,
                  index
                ) => [
                  index + 1,
                  customer.name,
                  Number(
                    customer.orders ||
                      0
                  ),
                  `${Number(
                    customer.spent ||
                      0
                  ).toFixed(
                    2
                  )} DH`,
                ]
              )
            : [
                [
                  "-",
                  "Aucune donnée",
                  "-",
                  "-",
                ],
              ],

        theme: "striped",
      });

      const filename =
        `RestoFlow_Rapport_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`;

      doc.save(filename);
    } catch (err) {
      console.error(
        "PDF EXPORT ERROR:",
        err
      );

      alert(
        "Impossible de générer le PDF."
      );
    }
  };

  // =====================================================
  // EXCEL EXPORT
  // =====================================================

  const exportExcel = () => {
    try {
      const workbook =
        XLSX.utils.book_new();

      const summaryRows = [
        [
          "RestoFlow - Rapport de gestion",
          "",
        ],
        [
          "Période",
          formatPeriodLabel(),
        ],
        [
          "Généré le",
          new Date().toLocaleString(
            "fr-FR"
          ),
        ],
        [],
        [
          "Indicateur",
          "Valeur",
        ],
        [
          "Chiffre d'affaires",
          Number(
            data.summary
              .totalRevenue || 0
          ),
        ],
        [
          "Commandes",
          Number(
            data.summary
              .totalOrders || 0
          ),
        ],
        [
          "Terminées",
          Number(
            data.summary
              .completedOrders ||
              0
          ),
        ],
        [
          "En cours",
          Number(
            data.summary
              .activeOrders || 0
          ),
        ],
        [
          "Annulées",
          Number(
            data.summary
              .cancelledOrders ||
              0
          ),
        ],
        [
          "Panier moyen",
          Number(
            data.summary
              .averageOrderValue ||
              0
          ),
        ],
        [
          "Taux terminé (%)",
          completionRate,
        ],
        [
          "Taux annulation (%)",
          cancellationRate,
        ],
      ];

      const summarySheet =
        XLSX.utils.aoa_to_sheet(
          summaryRows
        );

      summarySheet[
        "!cols"
      ] = [
        {
          wch: 28,
        },
        {
          wch: 24,
        },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Résumé"
      );

      const salesSheet =
        XLSX.utils.json_to_sheet(
          dailySalesData.map(
            (item) => ({
              Date:
                item.date,
              "Chiffre d'affaires":
                item.ventes,
              Commandes:
                item.commandes,
            })
          )
        );

      XLSX.utils.book_append_sheet(
        workbook,
        salesSheet,
        "Ventes"
      );

      const dishesSheet =
        XLSX.utils.json_to_sheet(
          data.topDishes?.map(
            (
              dish,
              index
            ) => ({
              Rang:
                index + 1,
              Plat:
                dish.name,
              Quantité:
                Number(
                  dish.quantity ||
                    0
                ),
              Revenu:
                Number(
                  dish.revenue ||
                    0
                ),
            })
          ) || []
        );

      XLSX.utils.book_append_sheet(
        workbook,
        dishesSheet,
        "Plats"
      );

      const customersSheet =
        XLSX.utils.json_to_sheet(
          data.topCustomers?.map(
            (
              customer,
              index
            ) => ({
              Rang:
                index + 1,
              Client:
                customer.name,
              Commandes:
                Number(
                  customer.orders ||
                    0
                ),
              Dépenses:
                Number(
                  customer.spent ||
                    0
                ),
            })
          ) || []
        );

      XLSX.utils.book_append_sheet(
        workbook,
        customersSheet,
        "Clients"
      );

      const paymentsSheet =
        XLSX.utils.json_to_sheet(
          data.paymentBreakdown?.map(
            (payment) => ({
              "Mode de paiement":
                payment.name,
              Commandes:
                Number(
                  payment.orders ||
                    0
                ),
              Revenu:
                Number(
                  payment.revenue ||
                    0
                ),
            })
          ) || []
        );

      XLSX.utils.book_append_sheet(
        workbook,
        paymentsSheet,
        "Paiements"
      );

      const stockSheet =
        XLSX.utils.json_to_sheet(
          data.stock
            ?.lowStockProducts
            ?.map(
              (product) => ({
                Produit:
                  product.name,
                Catégorie:
                  product.category,
                Stock:
                  Number(
                    product.stock ||
                      0
                  ),
                Prix:
                  Number(
                    product.price ||
                      0
                  ),
              })
            ) || []
        );

      XLSX.utils.book_append_sheet(
        workbook,
        stockSheet,
        "Stock à surveiller"
      );

      XLSX.writeFile(
        workbook,
        `RestoFlow_Rapport_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error(
        "EXCEL EXPORT ERROR:",
        err
      );

      alert(
        "Impossible de générer le fichier Excel."
      );
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          📊
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement des rapports
        </h2>

        <p className="text-slate-500 mt-2">
          Analyse des données MongoDB...
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

            <p className="text-xs font-bold tracking-widest text-emerald-600">
              ANALYTICS CONNECTÉ
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Rapports & Analytics 📊
          </h1>

          <p className="text-slate-500 mt-2">
            Analysez les ventes, les clients, les plats et le stock.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportPDF}
            className="px-5 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-semibold hover:bg-rose-100 transition"
          >
            📄 Export PDF
          </button>

          <button
            type="button"
            onClick={exportExcel}
            className="px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
          >
            📊 Export Excel
          </button>

          <button
            type="button"
            onClick={loadReports}
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
      {/* DATE FILTER */}
      {/* ================================================= */}

      <form
        onSubmit={handleApplyFilter}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6"
      >
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest text-violet-600 mb-1">
              PÉRIODE
            </p>

            <h2 className="text-xl font-bold">
              Filtrer les rapports
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Sélectionnez une période pour recalculer les statistiques.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={applyToday}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Aujourd&apos;hui
              </button>

              <button
                type="button"
                onClick={() =>
                  applyQuickPeriod(7)
                }
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
              >
                7 jours
              </button>

              <button
                type="button"
                onClick={() =>
                  applyQuickPeriod(30)
                }
                className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100"
              >
                30 jours
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Du
            </label>

            <input
              type="date"
              value={from}
              onChange={(e) =>
                setFrom(e.target.value)
              }
              className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Au
            </label>

            <input
              type="date"
              value={to}
              onChange={(e) =>
                setTo(e.target.value)
              }
              className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg"
          >
            🔍 Appliquer
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {/* ================================================= */}
      {/* SUMMARY CARDS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-emerald-400 to-teal-600">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-4">
              💰
            </div>

            <p className="text-sm text-white/80">
              Chiffre d'affaires
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {Number(
                data.summary.totalRevenue || 0
              ).toFixed(2)}{" "}
              DH
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-blue-400 to-indigo-600">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-4">
              🧾
            </div>

            <p className="text-sm text-white/80">
              Commandes
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {data.summary.totalOrders}
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-violet-400 to-purple-600">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-4">
              🛒
            </div>

            <p className="text-sm text-white/80">
              Panier moyen
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {Number(
                data.summary.averageOrderValue ||
                  0
              ).toFixed(2)}{" "}
              DH
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-amber-300 to-orange-400">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-4">
              ⏳
            </div>

            <p className="text-sm text-orange-900/70">
              En cours
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {data.summary.activeOrders}
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-cyan-400 to-sky-600">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-4">
              ✅
            </div>

            <p className="text-sm text-white/80">
              Taux terminé
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {completionRate}%
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-pink-400 to-rose-600">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-4">
              ❌
            </div>

            <p className="text-sm text-white/80">
              Taux annulation
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {cancellationRate}%
            </h2>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* SALES + STATUS */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-[1.45fr_0.8fr] gap-5 mb-6">
        {/* DAILY SALES */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">
                📈 Évolution du chiffre d'affaires
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Ventes des commandes terminées par jour.
              </p>
            </div>

            <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-2 text-right">
              <p className="text-xs">
                Total période
              </p>

              <p className="font-bold">
                {Number(
                  data.summary.totalRevenue || 0
                ).toFixed(0)}{" "}
                DH
              </p>
            </div>
          </div>

          {dailySalesData.length === 0 ? (
            <div className="h-[340px] flex flex-col items-center justify-center text-slate-500">
              <div className="text-5xl mb-3">
                📈
              </div>

              <p className="font-semibold">
                Pas encore de ventes terminées
              </p>
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient
                      id="reportSales"
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
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "ventes") {
                        return [
                          `${Number(
                            value
                          ).toFixed(2)} DH`,
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
                    fill="url(#reportSales)"
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
          )}
        </div>

        {/* STATUS */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-xl font-bold">
            🍩 État des commandes
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Répartition sur la période.
          </p>

          <div className="h-[260px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={105}
                  paddingAngle={5}
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between bg-amber-50 rounded-xl p-3">
              <span className="text-sm">
                🟡 En cours
              </span>

              <strong>
                {data.summary.activeOrders}
              </strong>
            </div>

            <div className="flex justify-between bg-emerald-50 rounded-xl p-3">
              <span className="text-sm">
                🟢 Terminées
              </span>

              <strong>
                {data.summary.completedOrders}
              </strong>
            </div>

            <div className="flex justify-between bg-rose-50 rounded-xl p-3">
              <span className="text-sm">
                🔴 Annulées
              </span>

              <strong>
                {data.summary.cancelledOrders}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* TOP DISHES + PAYMENTS */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-2 gap-5 mb-6">
        {/* DISHES */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">
                🍽️ Plats les plus vendus
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Classement par quantité vendue.
              </p>
            </div>

            <span className="text-3xl">
              🏆
            </span>
          </div>

          {dishData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-slate-500">
              Aucune donnée.
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={dishData}
                  layout="vertical"
                  margin={{
                    left: 30,
                    right: 20,
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
                    allowDecimals={false}
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
                      value,
                      "Unités vendues",
                    ]}
                  />

                  <Bar
                    dataKey="ventes"
                    fill="#8b5cf6"
                    radius={[0, 10, 10, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PAYMENT */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              💳 Modes de paiement
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Répartition des commandes terminées.
            </p>
          </div>

          {paymentData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-slate-500">
              Aucune donnée de paiement.
            </div>
          ) : (
            <>
              <div className="h-[260px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {paymentData.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              [
                                "#0ea5e9",
                                "#10b981",
                                "#8b5cf6",
                                "#f59e0b",
                              ][index % 4]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {data.paymentBreakdown.map(
                  (payment) => (
                    <div
                      key={payment.name}
                      className="flex items-center justify-between border border-slate-100 rounded-xl p-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {payment.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          {payment.orders} commande(s)
                        </p>
                      </div>

                      <p className="font-bold text-emerald-600">
                        {Number(
                          payment.revenue || 0
                        ).toFixed(2)}{" "}
                        DH
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* CUSTOMERS */}
      {/* ================================================= */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              👥 Meilleurs clients
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Classement par montant dépensé.
            </p>
          </div>

          <span className="text-3xl">
            👑
          </span>
        </div>

        {customerData.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            Aucune donnée client pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-4">
                    #
                  </th>

                  <th className="text-left px-5 py-4">
                    Client
                  </th>

                  <th className="text-left px-5 py-4">
                    Commandes
                  </th>

                  <th className="text-left px-5 py-4">
                    Dépenses
                  </th>

                  <th className="text-left px-5 py-4">
                    Panier moyen
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.topCustomers.map(
                  (customer, index) => {
                    const average =
                      Number(
                        customer.orders || 0
                      ) > 0
                        ? Number(
                            customer.spent || 0
                          ) /
                          Number(
                            customer.orders || 1
                          )
                        : 0;

                    return (
                      <tr
                        key={
                          customer.customerId ||
                          `${customer.name}-${index}`
                        }
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                              index === 0
                                ? "bg-amber-100 text-amber-700"
                                : index === 1
                                ? "bg-slate-200 text-slate-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {customer.name}
                        </td>

                        <td className="px-5 py-4">
                          {customer.orders}
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-600">
                          {Number(
                            customer.spent || 0
                          ).toFixed(2)}{" "}
                          DH
                        </td>

                        <td className="px-5 py-4">
                          {average.toFixed(2)} DH
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* STOCK + HIGHLIGHTS */}
      {/* ================================================= */}

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-5">
        {/* STOCK ALERTS */}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold">
              📦 Rapport de stock
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Produits nécessitant votre attention.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 p-5 border-b border-slate-100">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                Produits
              </p>

              <p className="text-2xl font-bold mt-1 text-blue-700">
                {data.stock.totalProducts}
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                Stock faible
              </p>

              <p className="text-2xl font-bold mt-1 text-amber-700">
                {data.stock.lowStockCount}
              </p>
            </div>

            <div className="bg-rose-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                Rupture
              </p>

              <p className="text-2xl font-bold mt-1 text-rose-700">
                {data.stock.outOfStockCount}
              </p>
            </div>
          </div>

          {data.stock.lowStockProducts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-3">
                ✅
              </div>

              <p className="font-semibold">
                Aucun stock critique
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Tous les produits ont suffisamment de stock.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.stock.lowStockProducts.map(
                (product) => (
                  <div
                    key={product._id}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50"
                  >
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-xl">
                      🍲
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {product.category}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          Number(
                            product.stock
                          ) === 0
                            ? "text-rose-600"
                            : "text-amber-600"
                        }`}
                      >
                        {product.stock} unité(s)
                      </p>

                      <p className="text-xs text-slate-400">
                        {Number(
                          product.price || 0
                        ).toFixed(2)}{" "}
                        DH
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* HIGHLIGHTS */}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111827] via-[#172033] to-[#0f172a] text-white p-7">
          <div className="absolute -right-16 -bottom-16 w-60 h-60 bg-violet-500/20 rounded-full blur-3xl" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl mb-6">
              💡
            </div>

            <p className="text-xs font-bold tracking-widest text-orange-300">
              RÉSUMÉ DE PERFORMANCE
            </p>

            <h2 className="text-3xl font-bold mt-3">
              Vue rapide.
            </h2>

            <div className="space-y-3 mt-7">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-300">
                  Plat numéro 1
                </p>

                <p className="font-bold text-lg mt-1">
                  {topDish
                    ? topDish.name
                    : "Aucune donnée"}
                </p>

                {topDish && (
                  <p className="text-sm text-emerald-300 mt-1">
                    {topDish.quantity} unité(s) ·{" "}
                    {Number(
                      topDish.revenue || 0
                    ).toFixed(0)}{" "}
                    DH
                  </p>
                )}
              </div>

              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-300">
                  Meilleur client
                </p>

                <p className="font-bold text-lg mt-1">
                  {topCustomer
                    ? topCustomer.name
                    : "Aucune donnée"}
                </p>

                {topCustomer && (
                  <p className="text-sm text-emerald-300 mt-1">
                    {Number(
                      topCustomer.spent || 0
                    ).toFixed(0)}{" "}
                    DH dépensés
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-xs text-slate-300">
                    Succès
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    {completionRate}%
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-xs text-slate-300">
                    Annulation
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    {cancellationRate}%
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/20 rounded-2xl p-4">
                <p className="text-xs text-emerald-200">
                  Chiffre d'affaires
                </p>

                <p className="text-3xl font-bold mt-1">
                  {Number(
                    data.summary.totalRevenue ||
                      0
                  ).toFixed(2)}{" "}
                  DH
                </p>

                <p className="text-xs text-slate-300 mt-2">
                  Pour la période sélectionnée
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// =====================================================
// REPORTS + AI SALES FORECAST
// =====================================================

function Rapports() {
  const [activeTab, setActiveTab] =
    useState("reports");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-5 lg:px-7 pt-5 lg:pt-7">
        <div className="inline-flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setActiveTab("reports")
            }
            className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
              activeTab === "reports"
                ? "bg-slate-950 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📈 Rapports
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("forecast")
            }
            className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
              activeTab === "forecast"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            🔮 Prévision des ventes
          </button>
        </div>
      </div>

      {activeTab === "reports" ? (
        <RapportsContent />
      ) : (
        <SalesForecast />
      )}
    </div>
  );
}

export default Rapports;
