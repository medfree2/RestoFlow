import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const PRODUCTS_API = "http://localhost:5000/api/products";
const MOVEMENTS_API = "http://localhost:5000/api/stock-movements";

function Stock() {
  const { authFetch, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");

  const [movementFilter, setMovementFilter] = useState("Tous");
  const [movementSearch, setMovementSearch] = useState("");

  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, movementsResponse] =
        await Promise.all([
          authFetch(PRODUCTS_API),
          authFetch(MOVEMENTS_API),
        ]);

      if (productsResponse.status === 401 || movementsResponse.status === 401) {
        logout();
        return;
      }

      if (productsResponse.status === 403 || movementsResponse.status === 403) {
        throw new Error("Vous n\'avez pas l\'autorisation d\'accéder au stock.");
      }

      if (!productsResponse.ok || !movementsResponse.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const productsData = await productsResponse.json();
      const movementsData = await movementsResponse.json();

      setProducts(productsData);
      setMovements(movementsData);
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =====================================================
  // STOCK STATS
  // =====================================================

  const totalProducts = products.length;

  const availableProducts = products.filter(
    (product) => Number(product.stock) > 5
  ).length;

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock) > 0 &&
      Number(product.stock) <= 5
  ).length;

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock) === 0
  ).length;

  const totalUnits = products.reduce(
    (sum, product) =>
      sum + Number(product.stock || 0),
    0
  );

  const stockValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.price || 0) *
        Number(product.stock || 0),
    0
  );

  // =====================================================
  // PRODUCT FILTER
  // =====================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText =
        search.trim().toLowerCase();

      const matchesSearch =
        product.name
          ?.toLowerCase()
          .includes(searchText) ||
        product.category
          ?.toLowerCase()
          .includes(searchText);

      let matchesFilter = true;

      if (filter === "Disponible") {
        matchesFilter = Number(product.stock) > 5;
      }

      if (filter === "Faible") {
        matchesFilter =
          Number(product.stock) > 0 &&
          Number(product.stock) <= 5;
      }

      if (filter === "Rupture") {
        matchesFilter =
          Number(product.stock) === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  // =====================================================
  // MOVEMENT FILTER
  // =====================================================

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const searchText =
        movementSearch.trim().toLowerCase();

      const matchesSearch =
        movement.productName
          ?.toLowerCase()
          .includes(searchText) ||
        movement.orderNumber
          ?.toLowerCase()
          .includes(searchText);

      const matchesFilter =
        movementFilter === "Tous" ||
        movement.type === movementFilter;

      return matchesSearch && matchesFilter;
    });
  }, [
    movements,
    movementSearch,
    movementFilter,
  ]);

  // =====================================================
  // STOCK STATUS
  // =====================================================

  const getStockStatus = (stock) => {
    const quantity = Number(stock);

    if (quantity === 0) {
      return {
        label: "Rupture",
        className:
          "bg-rose-100 text-rose-700",
        barClass: "bg-rose-500",
      };
    }

    if (quantity <= 5) {
      return {
        label: "Stock faible",
        className:
          "bg-amber-100 text-amber-700",
        barClass: "bg-amber-500",
      };
    }

    return {
      label: "Disponible",
      className:
        "bg-emerald-100 text-emerald-700",
      barClass: "bg-emerald-500",
    };
  };

  // =====================================================
  // MOVEMENT STYLE
  // =====================================================

  const getMovementStyle = (type) => {
    if (type === "Commande") {
      return {
        icon: "🧾",
        badge:
          "bg-blue-100 text-blue-700",
        card:
          "border-blue-100 bg-blue-50/30",
      };
    }

    if (type === "Annulation") {
      return {
        icon: "↩️",
        badge:
          "bg-emerald-100 text-emerald-700",
        card:
          "border-emerald-100 bg-emerald-50/30",
      };
    }

    if (type === "Réactivation") {
      return {
        icon: "🔄",
        badge:
          "bg-violet-100 text-violet-700",
        card:
          "border-violet-100 bg-violet-50/30",
      };
    }

    return {
      icon: "📥",
      badge:
        "bg-orange-100 text-orange-700",
      card:
        "border-orange-100 bg-orange-50/30",
    };
  };

  // =====================================================
  // OPEN RESTOCK MODAL
  // =====================================================

  const openRestockModal = (product) => {
    setRestockProduct(product);
    setRestockQuantity("");
  };

  // =====================================================
  // RESTOCK
  // =====================================================

  const handleRestock = async (e) => {
    e.preventDefault();

    const quantity = Number(restockQuantity);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Veuillez saisir une quantité valide."
      );

      return;
    }

    try {
      const response = await authFetch(
        `${PRODUCTS_API}/${restockProduct._id}/restock`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            quantity,
          }),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        throw new Error("Vous n\'avez pas l\'autorisation de réapprovisionner le stock.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du réapprovisionnement"
        );
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product._id === data._id
            ? data
            : product
        )
      );

      setRestockProduct(null);
      setRestockQuantity("");

      // Reload history so the new movement appears
      const movementResponse =
        await authFetch(MOVEMENTS_API);

      if (movementResponse.status === 401) {
        logout();
        return;
      }

      if (movementResponse.status === 403) {
        throw new Error("Vous n\'avez pas l\'autorisation d\'accéder à l\'historique du stock.");
      }

      if (movementResponse.ok) {
        const movementData =
          await movementResponse.json();

        setMovements(movementData);
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          📦
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement du stock
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

            <p className="text-xs font-bold tracking-widest text-emerald-600">
              INVENTAIRE CONNECTÉ
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Gestion du stock 📦
          </h1>

          <p className="text-slate-500 mt-2">
            Suivez les quantités, les alertes et l&apos;historique des mouvements.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 p-4">
          ⚠ {error}
        </div>
      )}

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-3xl p-6 shadow-lg shadow-blue-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-5">
              🍽️
            </div>

            <p className="text-sm text-white/80">
              Produits
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {totalProducts}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              Articles enregistrés
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-3xl p-6 shadow-lg shadow-emerald-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-5">
              ✅
            </div>

            <p className="text-sm text-white/80">
              Disponibles
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {availableProducts}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              Plus de 5 unités
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-300 to-orange-400 rounded-3xl p-6 shadow-lg shadow-orange-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/20" />

          <div className="relative">
            <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl mb-5">
              ⚠️
            </div>

            <p className="text-sm text-orange-900/70">
              Stock faible
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {lowStockProducts}
            </h2>

            <p className="text-xs text-orange-900/70 mt-3">
              Entre 1 et 5 unités
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-pink-400 to-rose-600 text-white rounded-3xl p-6 shadow-lg shadow-pink-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-5">
              🚨
            </div>

            <p className="text-sm text-white/80">
              Rupture
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {outOfStockProducts}
            </h2>

            <p className="text-xs text-white/70 mt-3">
              Stock à zéro
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-3xl p-6 shadow-lg">
          <div className="relative">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-5">
              💰
            </div>

            <p className="text-sm text-slate-300">
              Valeur du stock
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {stockValue.toFixed(2)} DH
            </h2>

            <p className="text-xs text-slate-300 mt-3">
              {totalUnits} unités
            </p>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* ALERTS */}
      {/* ================================================= */}

      {(lowStockProducts > 0 ||
        outOfStockProducts > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {lowStockProducts > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                ⚠️
              </div>

              <div>
                <p className="font-bold text-amber-800">
                  Stock faible
                </p>

                <p className="text-sm text-amber-700 mt-1">
                  {lowStockProducts} produit(s) nécessitent un contrôle.
                </p>
              </div>
            </div>
          )}

          {outOfStockProducts > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-2xl">
                🚨
              </div>

              <div>
                <p className="font-bold text-rose-800">
                  Rupture de stock
                </p>

                <p className="text-sm text-rose-700 mt-1">
                  {outOfStockProducts} produit(s) sont indisponibles.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================= */}
      {/* PRODUCT SEARCH */}
      {/* ================================================= */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Rechercher un produit ou une catégorie..."
              className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            className="border border-slate-200 rounded-xl px-4 py-3 outline-none bg-white"
          >
            <option value="Tous">
              Tous les produits
            </option>

            <option value="Disponible">
              Disponibles
            </option>

            <option value="Faible">
              Stock faible
            </option>

            <option value="Rupture">
              Rupture
            </option>
          </select>
        </div>
      </div>

      {/* ================================================= */}
      {/* STOCK TABLE */}
      {/* ================================================= */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            📦 État du stock
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {filteredProducts.length} produit(s) affiché(s)
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            Aucun produit trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-4">
                    Produit
                  </th>

                  <th className="text-left px-5 py-4">
                    Catégorie
                  </th>

                  <th className="text-left px-5 py-4">
                    Prix
                  </th>

                  <th className="text-left px-5 py-4">
                    Stock
                  </th>

                  <th className="text-left px-5 py-4">
                    Valeur
                  </th>

                  <th className="text-left px-5 py-4">
                    État
                  </th>

                  <th className="text-left px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const status =
                    getStockStatus(product.stock);

                  const stock =
                    Number(product.stock || 0);

                  const stockPercent =
                    Math.min(
                      100,
                      (stock / 20) * 100
                    );

                  return (
                    <tr
                      key={product._id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl">
                            🍲
                          </div>

                          <span className="font-bold">
                            {product.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {product.category}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {Number(product.price || 0).toFixed(2)} DH
                      </td>

                      <td className="px-5 py-4 min-w-[180px]">
                        <div className="flex justify-between mb-2">
                          <strong className="text-lg">
                            {stock}
                          </strong>

                          <span className="text-xs text-slate-400">
                            unités
                          </span>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.barClass}`}
                            style={{
                              width: `${stockPercent}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {(
                          Number(product.price || 0) *
                          stock
                        ).toFixed(2)}{" "}
                        DH
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            openRestockModal(product)
                          }
                          className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
                        >
                          📥 Réapprovisionner
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* MOVEMENT HISTORY */}
      {/* ================================================= */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-violet-600">
                TRAÇABILITÉ
              </p>

              <h2 className="text-2xl font-bold mt-1">
                📋 Historique des mouvements
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Suivez chaque entrée et sortie du stock.
              </p>
            </div>

            <div className="bg-slate-100 rounded-xl px-4 py-2 text-sm font-semibold">
              {filteredMovements.length} mouvement(s)
            </div>
          </div>
        </div>

        {/* MOVEMENT FILTERS */}

        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row gap-3">
            <input
              type="text"
              value={movementSearch}
              onChange={(e) =>
                setMovementSearch(e.target.value)
              }
              placeholder="Rechercher un produit ou une commande..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />

            <div className="flex flex-wrap gap-2">
              {[
                "Tous",
                "Commande",
                "Réapprovisionnement",
                "Annulation",
                "Réactivation",
              ].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setMovementFilter(type)
                  }
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    movementFilter === type
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MOVEMENT LIST */}

        {filteredMovements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">
              📋
            </div>

            <h3 className="text-xl font-bold">
              Aucun mouvement
            </h3>

            <p className="text-slate-500 mt-2">
              Les mouvements de stock apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {filteredMovements.map((movement) => {
              const style =
                getMovementStyle(movement.type);

              const isPositive =
                Number(movement.quantity) > 0;

              return (
                <div
                  key={movement._id}
                  className={`border rounded-2xl p-4 ${style.card}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* ICON */}

                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">
                      {style.icon}
                    </div>

                    {/* PRODUCT */}

                    <div className="min-w-[200px]">
                      <p className="font-bold">
                        {movement.productName}
                      </p>

                      <span
                        className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}
                      >
                        {movement.type}
                      </span>
                    </div>

                    {/* ORDER */}

                    <div className="flex-1">
                      {movement.orderNumber ? (
                        <>
                          <p className="text-xs text-slate-400">
                            Commande
                          </p>

                          <p className="font-semibold">
                            {movement.orderNumber}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">
                            Origine
                          </p>

                          <p className="font-semibold">
                            Stock manuel
                          </p>
                        </>
                      )}
                    </div>

                    {/* BEFORE AFTER */}

                    <div className="min-w-[130px]">
                      <p className="text-xs text-slate-400">
                        Stock
                      </p>

                      <p className="font-bold">
                        {movement.stockBefore}
                        <span className="text-slate-400 mx-2">
                          →
                        </span>
                        {movement.stockAfter}
                      </p>
                    </div>

                    {/* QUANTITY */}

                    <div
                      className={`text-2xl font-bold min-w-[80px] text-right ${
                        isPositive
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {movement.quantity}
                    </div>

                    {/* DATE */}

                    <div className="min-w-[150px] lg:text-right">
                      <p className="text-xs text-slate-400">
                        Date
                      </p>

                      <p className="text-sm font-semibold">
                        {new Date(
                          movement.createdAt
                        ).toLocaleString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* RESTOCK MODAL */}
      {/* ================================================= */}

      {restockProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold tracking-widest text-emerald-600">
                  RÉAPPROVISIONNEMENT
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  Ajouter au stock 📦
                </h2>
              </div>

              <button
                onClick={() => {
                  setRestockProduct(null);
                  setRestockQuantity("");
                }}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl">
                  🍲
                </div>

                <div>
                  <p className="font-bold text-lg">
                    {restockProduct.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {restockProduct.category}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 mb-5">
                <p className="text-sm text-slate-500">
                  Stock actuel
                </p>

                <p className="text-4xl font-bold mt-1">
                  {restockProduct.stock}
                </p>
              </div>

              <form onSubmit={handleRestock}>
                <label className="block text-sm font-semibold mb-2">
                  Quantité à ajouter
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  autoFocus
                  value={restockQuantity}
                  onChange={(e) =>
                    setRestockQuantity(
                      e.target.value
                    )
                  }
                  placeholder="Ex : 10"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                />

                {Number(restockQuantity) > 0 && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <p className="text-sm text-emerald-700">
                      Nouveau stock
                    </p>

                    <p className="text-3xl font-bold text-emerald-700 mt-1">
                      {Number(
                        restockProduct.stock
                      ) +
                        Number(
                          restockQuantity
                        )}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setRestockProduct(null);
                      setRestockQuantity("");
                    }}
                    className="flex-1 px-5 py-3 rounded-xl bg-slate-100 font-semibold"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg"
                  >
                    ✅ Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stock;