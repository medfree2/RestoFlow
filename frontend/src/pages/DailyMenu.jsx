import {
  useCallback,
  useEffect,
  useState,
} from "react";

const API_URL =
  "http://localhost:5000";

function DailyMenu() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOAD DAILY MENU
  // =====================================================

  const loadDailyMenu =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          throw new Error(
            "Session introuvable. Veuillez vous reconnecter."
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/ai/daily-menu`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Impossible de générer le menu du jour."
          );
        }

        setData(result);
      } catch (err) {
        console.error(
          "DAILY MENU ERROR:",
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
    loadDailyMenu();
  }, [loadDailyMenu]);

  // =====================================================
  // DATA
  // =====================================================

  const summary =
    data?.stockSummary || {};

  const suggestions =
    data?.suggestions || [];

  const available =
    data?.availableIngredients ||
    [];

  const lowStock =
    data?.lowStockIngredients ||
    [];

  const unavailable =
    data?.unavailableIngredients ||
    [];

  // =====================================================
  // PRIORITY STYLE
  // =====================================================

  const priorityStyle = (
    priority
  ) => {
    if (priority === "Haute") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (
      priority === "Basse"
    ) {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-sm">
            <div className="min-h-[450px] flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-orange-500 animate-spin" />

                <div className="absolute inset-0 flex items-center justify-center text-xl">
                  🍳
                </div>
              </div>

              <h2 className="mt-6 text-xl font-bold text-slate-900">
                Création du menu du
                jour...
              </h2>

              <p className="mt-2 text-sm text-slate-500 text-center">
                L'IA analyse le stock
                disponible.
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
          <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Impossible de générer
              le menu
            </h2>

            <p className="mt-3 text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={
                loadDailyMenu
              }
              className="mt-6 px-5 py-3 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition"
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
        {/* =============================================== */}
        {/* HEADER */}
        {/* =============================================== */}

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center text-3xl shadow-lg">
              🍳
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
                  Menu du jour IA
                </h1>

                <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold">
                  IA
                </span>
              </div>

              <p className="text-sm text-slate-500 mt-1">
                Suggestions basées
                sur le stock
                disponible
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              loadDailyMenu
            }
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
          >
            ✨ Régénérer le menu
          </button>
        </div>

        {/* =============================================== */}
        {/* AI ANALYSIS */}
        {/* =============================================== */}

        <div className="relative overflow-hidden mt-7 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-6 sm:p-7 shadow-lg">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-orange-500/10" />

          <div className="absolute right-28 -bottom-20 w-48 h-48 rounded-full bg-pink-500/10" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl">
              🤖
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold">
                  Analyse intelligente
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

        {/* =============================================== */}
        {/* STOCK KPIS */}
        {/* =============================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
          {/* TOTAL */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">
                📦
              </div>

              <span className="text-xs font-bold text-slate-400">
                TOTAL
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Produits en stock
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">
              {summary.totalProducts ||
                0}
            </p>
          </div>

          {/* AVAILABLE */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl">
                ✅
              </div>

              <span className="text-xs font-bold text-emerald-600">
                DISPONIBLE
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Produits disponibles
            </p>

            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {summary.availableProducts ||
                0}
            </p>
          </div>

          {/* LOW STOCK */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-xl">
                ⚠️
              </div>

              <span className="text-xs font-bold text-amber-600">
                FAIBLE
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Stock faible
            </p>

            <p className="mt-1 text-3xl font-bold text-amber-600">
              {summary.lowStockProducts ||
                0}
            </p>
          </div>

          {/* OUT OF STOCK */}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-xl">
                ❌
              </div>

              <span className="text-xs font-bold text-rose-600">
                RUPTURE
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Produits en rupture
            </p>

            <p className="mt-1 text-3xl font-bold text-rose-600">
              {summary.outOfStockProducts ||
                0}
            </p>
          </div>
        </div>

        {/* =============================================== */}
        {/* AI MENU SUGGESTIONS */}
        {/* =============================================== */}

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Suggestions du jour
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Plats proposés selon
                les ingrédients
                disponibles
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold">
              {suggestions.length}{" "}
              proposition
              {suggestions.length !==
              1
                ? "s"
                : ""}
            </span>
          </div>

          {/* EMPTY */}

          {suggestions.length ===
          0 ? (
            <div className="mt-5 bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
              <div className="text-5xl">
                🍽️
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Aucune suggestion
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Vérifiez le stock et
                régénérez le menu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
              {suggestions.map(
                (
                  suggestion,
                  index
                ) => (
                  <div
                    key={`${suggestion.name}-${index}`}
                    className="group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* CARD HEADER */}

                    <div className="relative bg-gradient-to-br from-orange-50 via-white to-pink-50 p-6 border-b border-slate-100">
                      <div className="absolute top-4 right-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${priorityStyle(
                            suggestion.priority
                          )}`}
                        >
                          {
                            suggestion.priority
                          }
                        </span>
                      </div>

                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center text-3xl shadow-md">
                        🍽️
                      </div>

                      <p className="mt-5 text-xs font-bold tracking-widest text-orange-500">
                        SUGGESTION{" "}
                        {index + 1}
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-950 pr-10">
                        {
                          suggestion.name
                        }
                      </h3>
                    </div>

                    {/* CARD BODY */}

                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Ingrédients
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {suggestion
                          .ingredients
                          ?.length ? (
                          suggestion.ingredients.map(
                            (
                              ingredient,
                              ingredientIndex
                            ) => (
                              <span
                                key={`${ingredient}-${ingredientIndex}`}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                              >
                                {
                                  ingredient
                                }
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-sm text-slate-400">
                            Aucun
                            ingrédient
                            indiqué
                          </span>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-5" />

                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pourquoi ce plat ?
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {suggestion.reason ||
                          "Aucune explication disponible."}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* =============================================== */}
        {/* STOCK DETAILS */}
        {/* =============================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-8">
          {/* AVAILABLE */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    ✅ Disponibles
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    Utilisables par
                    l'IA
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  {available.length}
                </span>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
              {available.length ? (
                available.map(
                  (product) => (
                    <div
                      key={
                        product._id
                      }
                      className="px-5 py-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {
                            product.name
                          }
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {product.category ||
                            "Sans catégorie"}
                        </p>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                        {
                          product.stock
                        }
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="p-5 text-sm text-slate-400">
                  Aucun produit.
                </p>
              )}
            </div>
          </div>

          {/* LOW STOCK */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    ⚠️ Stock faible
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    À utiliser avec
                    prudence
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                  {lowStock.length}
                </span>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
              {lowStock.length ? (
                lowStock.map(
                  (product) => (
                    <div
                      key={
                        product._id
                      }
                      className="px-5 py-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {
                            product.name
                          }
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {product.category ||
                            "Sans catégorie"}
                        </p>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                        {
                          product.stock
                        }
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="p-5 text-sm text-slate-400">
                  Aucun produit en
                  stock faible.
                </p>
              )}
            </div>
          </div>

          {/* OUT OF STOCK */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    ❌ Ruptures
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    Exclus du menu IA
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                  {unavailable.length}
                </span>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
              {unavailable.length ? (
                unavailable.map(
                  (product) => (
                    <div
                      key={
                        product._id
                      }
                      className="px-5 py-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {
                            product.name
                          }
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {product.category ||
                            "Sans catégorie"}
                        </p>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">
                        0
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="p-5 text-sm text-slate-400">
                  Aucune rupture.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =============================================== */}
        {/* INFO */}
        {/* =============================================== */}

        <div className="mt-7 rounded-3xl bg-orange-50 border border-orange-100 p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">
              💡
            </span>

            <div>
              <h3 className="font-bold text-orange-900">
                Comment fonctionne le
                menu IA ?
              </h3>

              <p className="mt-2 text-sm leading-6 text-orange-800/80">
                RestoFlow analyse les
                produits disponibles,
                évite les ruptures et
                limite l'utilisation
                des stocks faibles
                avant de demander à
                l'IA de proposer les
                plats du jour.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pb-4 text-center">
          <p className="text-xs text-slate-400">
            RestoFlow • Menu du jour
            assisté par intelligence
            artificielle
          </p>
        </div>
      </div>
    </div>
  );
}

export default DailyMenu;