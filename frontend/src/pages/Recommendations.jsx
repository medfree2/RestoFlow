import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const CUSTOMERS_API =
  "http://localhost:5000/api/customers";

const RECOMMENDATIONS_API =
  "http://localhost:5000/api/ai/recommendations";

function Recommendations() {
  const { authFetch, logout } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [data, setData] = useState(null);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // AUTH
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
        result.message || "Accès refusé."
      );
    }

    return response;
  };

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      setError("");

      const response = await authFetch(
        CUSTOMERS_API
      );

      await checkAuthResponse(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible de charger les clients."
        );
      }

      setCustomers(
        Array.isArray(result) ? result : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Impossible de charger les clients."
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // =====================================================
  // LOAD RECOMMENDATIONS
  // =====================================================

  const loadRecommendations = async () => {
    if (!selectedCustomer) {
      setError(
        "Veuillez sélectionner un client."
      );

      return;
    }

    try {
      setLoadingRecommendations(true);
      setError("");
      setData(null);

      const response = await authFetch(
        `${RECOMMENDATIONS_API}/${selectedCustomer}`
      );

      await checkAuthResponse(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible de générer les recommandations."
        );
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Impossible de générer les recommandations."
      );
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetSelection = () => {
    setSelectedCustomer("");
    setData(null);
    setError("");
  };

  // =====================================================
  // CUSTOMER
  // =====================================================

  const currentCustomer = customers.find(
    (customer) =>
      customer._id === selectedCustomer
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-5 lg:p-7">
      {/* HEADER */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />

            <p className="text-xs font-bold tracking-[0.18em] text-violet-600">
              INTELLIGENCE ARTIFICIELLE
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Recommandations IA 🤖
          </h1>

          <p className="text-slate-500 mt-2 max-w-2xl">
            Analysez les habitudes de vos clients et
            recommandez automatiquement les plats les
            plus adaptés.
          </p>
        </div>

        <button
          onClick={loadCustomers}
          disabled={loadingCustomers}
          className="px-5 py-3 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* AI HERO */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white p-6 lg:p-8 mb-7 shadow-lg">
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="absolute -left-20 -bottom-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                🧠
              </div>

              <div>
                <p className="text-xs font-bold tracking-widest text-violet-200">
                  RESTOFLOW AI
                </p>

                <h2 className="text-2xl font-bold">
                  Assistant de recommandation
                </h2>
              </div>
            </div>

            <p className="mt-4 text-violet-100 max-w-2xl">
              Le système analyse les commandes précédentes,
              les catégories favorites et les plats
              disponibles pour proposer les meilleures
              suggestions.
            </p>
          </div>

          <div className="hidden lg:flex w-24 h-24 rounded-3xl bg-white/15 items-center justify-center text-5xl">
            ✨
          </div>
        </div>
      </div>

      {/* CUSTOMER SELECTOR */}

      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 mb-7">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              👤 Sélectionner un client
            </label>

            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setData(null);
                setError("");
              }}
              disabled={loadingCustomers}
              className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            >
              <option value="">
                {loadingCustomers
                  ? "Chargement des clients..."
                  : "Choisir un client"}
              </option>

              {customers.map((customer) => (
                <option
                  key={customer._id}
                  value={customer._id}
                >
                  {customer.name}
                  {customer.totalOrders !== undefined
                    ? ` — ${customer.totalOrders} commande(s)`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadRecommendations}
            disabled={
              !selectedCustomer ||
              loadingRecommendations
            }
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition"
          >
            {loadingRecommendations
              ? "✨ Analyse..."
              : "✨ Générer les recommandations"}
          </button>

          {(selectedCustomer || data) && (
            <button
              onClick={resetSelection}
              className="px-5 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {currentCustomer && !data && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex flex-wrap gap-5 text-sm">
              <div>
                <span className="text-slate-400">
                  Client
                </span>

                <p className="font-bold mt-1">
                  {currentCustomer.name}
                </p>
              </div>

              <div>
                <span className="text-slate-400">
                  Commandes
                </span>

                <p className="font-bold mt-1">
                  {currentCustomer.totalOrders ?? 0}
                </p>
              </div>

              <div>
                <span className="text-slate-400">
                  Total dépensé
                </span>

                <p className="font-bold mt-1">
                  {Number(
                    currentCustomer.totalSpent || 0
                  ).toFixed(2)}{" "}
                  DH
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-7 rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 text-rose-700">
          <div className="flex gap-3">
            <span>⚠️</span>

            <div>
              <p className="font-bold">
                Une erreur est survenue
              </p>

              <p className="text-sm mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}

      {loadingRecommendations && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-12 text-center mb-7">
          <div className="text-6xl mb-5 animate-pulse">
            🧠
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Analyse du client...
          </h2>

          <p className="text-slate-500 mt-2">
            RestoFlow analyse l&apos;historique des
            commandes et prépare les recommandations.
          </p>
        </div>
      )}

      {/* RESULTS */}

      {data && !loadingRecommendations && (
        <>
          {/* CUSTOMER SUMMARY */}

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Client analysé
              </p>

              <div className="flex items-center gap-3 mt-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center text-xl">
                  👤
                </div>

                <p className="font-bold text-lg">
                  {data.customer?.name}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Commandes analysées
              </p>

              <p className="text-3xl font-bold mt-3">
                {data.orderCount || 0}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Catégories favorites
              </p>

              <p className="text-3xl font-bold mt-3 text-fuchsia-600">
                {data.favoriteCategories?.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Recommandations
              </p>

              <p className="text-3xl font-bold mt-3 text-emerald-600">
                {data.recommendations?.length || 0}
              </p>
            </div>
          </div>

          {/* AI MESSAGE */}

          <div className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 mb-7">
            <div className="absolute right-0 top-0 w-56 h-56 bg-violet-500/20 rounded-full blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl">
                🤖
              </div>

              <div>
                <p className="text-xs tracking-widest font-bold text-violet-300">
                  ANALYSE IA
                </p>

                <h2 className="text-xl font-bold mt-1">
                  Recommandation personnalisée
                </h2>

                <p className="text-slate-300 mt-3 leading-7">
                  {data.aiMessage ||
                    "Les recommandations sont basées sur l'historique du client."}
                </p>
              </div>
            </div>
          </div>

          {/* PREFERENCES */}

          <div className="grid lg:grid-cols-2 gap-5 mb-7">
            {/* FAVORITE CATEGORIES */}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">
                    ❤️ Catégories favorites
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Selon les commandes précédentes
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center">
                  📊
                </div>
              </div>

              {data.favoriteCategories?.length ? (
                <div className="space-y-3">
                  {data.favoriteCategories.map(
                    (item, index) => (
                      <div
                        key={`${item.category}-${index}`}
                        className="flex items-center justify-between bg-slate-50 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-bold text-violet-600 border border-slate-100">
                            {index + 1}
                          </div>

                          <span className="font-semibold">
                            {item.category}
                          </span>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                          {item.quantity} article(s)
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <div className="text-4xl mb-3">
                    📭
                  </div>

                  <p>
                    Pas encore assez d&apos;historique.
                  </p>
                </div>
              )}
            </div>

            {/* FAVORITE PRODUCTS */}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">
                    🍽️ Plats préférés
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Les plats commandés le plus souvent
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                  🏆
                </div>
              </div>

              {data.favoriteProducts?.length ? (
                <div className="space-y-3">
                  {data.favoriteProducts.map(
                    (item, index) => (
                      <div
                        key={`${item.productId || item.name}-${index}`}
                        className="flex items-center justify-between bg-slate-50 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-bold text-orange-600 border border-slate-100">
                            {index + 1}
                          </div>

                          <span className="font-semibold">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-bold text-slate-600">
                          × {item.quantity}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <div className="text-4xl mb-3">
                    🍴
                  </div>

                  <p>
                    Aucun plat préféré identifié.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RECOMMENDATIONS */}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl text-white">
                  ✨
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Plats recommandés
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Suggestions personnalisées pour{" "}
                    {data.customer?.name}
                  </p>
                </div>
              </div>
            </div>

            {!data.recommendations?.length ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">
                  🍽️
                </div>

                <h3 className="text-xl font-bold">
                  Aucune recommandation
                </h3>

                <p className="text-slate-500 mt-2">
                  Aucun plat disponible actuellement.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 p-6">
                {data.recommendations.map(
                  (item, index) => (
                    <div
                      key={
                        item.productId ||
                        `${item.name}-${index}`
                      }
                      className="relative rounded-3xl border border-slate-100 bg-slate-50 p-5 hover:-translate-y-1 hover:shadow-lg transition"
                    >
                      {/* RANK */}

                      <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-bold text-violet-600 shadow-sm">
                        #{index + 1}
                      </div>

                      <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl mb-4">
                        🍲
                      </div>

                      <div className="pr-10">
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.name}
                        </h3>

                        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                          {item.category}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-500 mt-4 leading-6 line-clamp-3">
                          {item.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-400">
                            Prix
                          </p>

                          <p className="font-bold mt-1">
                            {Number(
                              item.price || 0
                            ).toFixed(2)}{" "}
                            DH
                          </p>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-400">
                            Stock
                          </p>

                          <p className="font-bold mt-1">
                            {item.stock}
                          </p>
                        </div>
                      </div>

                      {/* SCORE */}

                      {item.score > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">
                              Score de recommandation
                            </span>

                            <span className="text-xs font-bold text-violet-600">
                              {item.score} pts
                            </span>
                          </div>

                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                              style={{
                                width: `${Math.min(
                                  item.score,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* REASON */}

                      <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
                        <p className="text-xs font-bold text-violet-600 mb-1">
                          🤖 Pourquoi ?
                        </p>

                        <p className="text-sm text-slate-600 leading-5">
                          {item.reason}
                        </p>
                      </div>

                      {item.alreadyOrdered ? (
                        <div className="mt-4 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                          ✓ Déjà commandé par ce client
                        </div>
                      ) : (
                        <div className="mt-4 text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                          ✨ Nouveau plat à découvrir
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* INITIAL EMPTY STATE */}

      {!data &&
        !loadingRecommendations &&
        !error && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-100 flex items-center justify-center text-4xl">
              🤖
            </div>

            <h2 className="text-2xl font-bold mt-5">
              Prêt pour l&apos;analyse
            </h2>

            <p className="text-slate-500 mt-2 max-w-lg mx-auto">
              Sélectionnez un client puis cliquez sur
              « Générer les recommandations » pour
              analyser ses habitudes.
            </p>
          </div>
        )}
    </div>
  );
}

export default Recommendations;