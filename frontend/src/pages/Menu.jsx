import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api/products";
const AI_API =
  "http://localhost:5000/api/ai/menu-description";

const DAILY_MENU_API =
  "http://localhost:5000/api/ai/daily-menu";

function Menu() {
  const { authFetch, logout } = useAuth();

  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [generatingAI, setGeneratingAI] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("dishes");

  const [dailyMenu, setDailyMenu] =
    useState(null);

  const [
    loadingDailyMenu,
    setLoadingDailyMenu,
  ] = useState(false);

  const [
    dailyMenuError,
    setDailyMenuError,
  ] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    ingredients: "",
    description: "",
  });

  // =====================================================
  // AUTH RESPONSE
  // =====================================================

  const checkAuthResponse = async (
    response
  ) => {
    if (response.status === 401) {
      logout();

      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    if (response.status === 403) {
      const data = await response
        .json()
        .catch(() => ({}));

      throw new Error(
        data.message ||
          "Vous n'avez pas l'autorisation d'effectuer cette action."
      );
    }

    return response;
  };

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await authFetch(API_URL);

      await checkAuthResponse(
        response
      );

      if (!response.ok) {
        const result = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          result.message ||
            "Erreur lors du chargement des produits"
        );
      }

      const data =
        await response.json();

      setProducts(data);
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
    loadProducts();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================================
  // OPEN ADD
  // =====================================================

  const openAddModal = () => {
    setEditingProduct(null);

    setForm({
      name: "",
      category: "",
      price: "",
      stock: "",
      ingredients: "",
      description: "",
    });

    setShowForm(true);
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const handleEditClick = (
    product
  ) => {
    setEditingProduct(product);

    setForm({
      name:
        product.name || "",

      category:
        product.category || "",

      price:
        product.price ?? "",

      stock:
        product.stock ?? "",

      ingredients:
        product.ingredients || "",

      description:
        product.description || "",
    });

    setShowForm(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    setShowForm(false);

    setEditingProduct(null);

    setGeneratingAI(false);
  };

  // =====================================================
  // AI GENERATION
  // =====================================================

  const generateDescription =
    async () => {
      if (!form.name.trim()) {
        alert(
          "Veuillez d'abord saisir le nom du plat."
        );

        return;
      }

      try {
        setGeneratingAI(true);

        const response =
          await authFetch(
            AI_API,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    form.name,

                  category:
                    form.category,

                  ingredients:
                    form.ingredients,
                }),
            }
          );

        await checkAuthResponse(
          response
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Impossible de générer la description"
          );
        }

        if (!data.description) {
          throw new Error(
            "Aucune description retournée par l'IA."
          );
        }

        setForm(
          (current) => ({
            ...current,

            description:
              data.description,
          })
        );
      } catch (err) {
        console.error(err);

        alert(
          err.message ||
            "Impossible de contacter le service IA."
        );
      } finally {
        setGeneratingAI(false);
      }
    };

  // =====================================================
  // SAVE PRODUCT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method =
        editingProduct
          ? "PUT"
          : "POST";

      const url =
        editingProduct
          ? `${API_URL}/${editingProduct._id}`
          : API_URL;

      const response =
        await authFetch(
          url,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  form.name,

                category:
                  form.category,

                price:
                  Number(
                    form.price
                  ),

                stock:
                  Number(
                    form.stock
                  ),

                ingredients:
                  form.ingredients,

                description:
                  form.description,
              }),
          }
        );

      await checkAuthResponse(
        response
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Erreur lors de l'enregistrement"
        );
      }

      if (editingProduct) {
        setProducts(
          (
            currentProducts
          ) =>
            currentProducts.map(
              (product) =>
                product._id ===
                result._id
                  ? result
                  : product
            )
        );
      } else {
        setProducts(
          (
            currentProducts
          ) => [
            result,
            ...currentProducts,
          ]
        );
      }

      setForm({
        name: "",
        category: "",
        price: "",
        stock: "",
        ingredients: "",
        description: "",
      });

      setEditingProduct(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible d'enregistrer le produit."
      );
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    id
  ) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer ce plat ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      const response =
        await authFetch(
          `${API_URL}/${id}`,
          {
            method:
              "DELETE",
          }
        );

      await checkAuthResponse(
        response
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Erreur lors de la suppression"
        );
      }

      setProducts(
        (
          currentProducts
        ) =>
          currentProducts.filter(
            (product) =>
              product._id !==
              id
          )
      );
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible de supprimer le produit."
      );
    }
  };

  // =====================================================
  // DAILY MENU AI
  // =====================================================

  const loadDailyMenu = async () => {
    try {
      setLoadingDailyMenu(true);
      setDailyMenuError("");

      const response =
        await authFetch(
          DAILY_MENU_API
        );

      await checkAuthResponse(
        response
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible de générer le menu du jour."
        );
      }

      setDailyMenu(result);
    } catch (err) {
      console.error(err);

      setDailyMenuError(
        err.message ||
          "Impossible de générer le menu du jour."
      );
    } finally {
      setLoadingDailyMenu(false);
    }
  };

  const openDailyMenuTab = () => {
    setActiveTab("daily");

    if (!dailyMenu) {
      loadDailyMenu();
    }
  };

  const getPriorityStyle = (
    priority
  ) => {
    if (priority === "Haute") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (priority === "Basse") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // =====================================================
  // STATS
  // =====================================================

  const availableProducts =
    products.filter(
      (product) =>
        Number(product.stock) >
        5
    ).length;

  const lowStockProducts =
    products.filter(
      (product) =>
        Number(product.stock) >
          0 &&
        Number(product.stock) <=
          5
    ).length;

  const outOfStockProducts =
    products.filter(
      (product) =>
        Number(product.stock) ===
        0
    ).length;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          🍽️
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement du menu
        </h2>

        <p className="text-slate-500 mt-2">
          Récupération des plats...
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
              MENU CONNECTÉ
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Gestion du menu 🍽️
          </h1>

          <p className="text-slate-500 mt-2">
            Gérez vos plats et générez automatiquement
            leurs descriptions avec l&apos;IA.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={
              loadProducts
            }
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition"
          >
            🔄 Actualiser
          </button>

          <button
            onClick={
              openAddModal
            }
            className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:scale-[1.02] transition"
          >
            + Ajouter un plat
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* MENU TABS */}
      {/* ================================================= */}

      <div className="mb-6 inline-flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
        <button
          type="button"
          onClick={() =>
            setActiveTab("dishes")
          }
          className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
            activeTab === "dishes"
              ? "bg-slate-950 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          🍽️ Tous les plats
        </button>

        <button
          type="button"
          onClick={
            openDailyMenuTab
          }
          className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
            activeTab === "daily"
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          ✨ Menu du jour IA
        </button>
      </div>

      <div
        className={
          activeTab === "dishes"
            ? "block"
            : "hidden"
        }
      >

      {/* ================================================= */}
      {/* AI BANNER */}
      {/* ================================================= */}

      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-3xl p-6 mb-6">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              ✨
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest text-violet-200">
                INTELLIGENCE ARTIFICIELLE
              </p>

              <h2 className="text-2xl font-bold mt-1">
                Descriptions automatiques
              </h2>

              <p className="text-violet-100 mt-2 max-w-2xl">
                Saisissez le nom et les ingrédients
                d&apos;un plat, puis laissez l&apos;IA
                générer une description professionnelle.
              </p>
            </div>
          </div>

          <button
            onClick={
              openAddModal
            }
            className="bg-white text-violet-700 px-5 py-3 rounded-xl font-bold shadow-lg"
          >
            ✨ Créer avec IA
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
          ⚠ {error}
        </div>
      )}

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                Total des plats
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {products.length}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
              🍽️
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                Disponibles
              </p>

              <h2 className="text-3xl font-bold mt-2 text-emerald-600">
                {
                  availableProducts
                }
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                Stock faible
              </p>

              <h2 className="text-3xl font-bold mt-2 text-amber-600">
                {
                  lowStockProducts
                }
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                En rupture
              </p>

              <h2 className="text-3xl font-bold mt-2 text-rose-600">
                {
                  outOfStockProducts
                }
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl">
              ❌
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* PRODUCT TABLE */}
      {/* ================================================= */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            📋 Liste des plats
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Produits enregistrés dans MongoDB
          </p>
        </div>

        {products.length ===
        0 ? (
          <div className="p-14 text-center">
            <div className="text-6xl mb-4">
              🍽️
            </div>

            <h3 className="font-bold text-xl">
              Aucun plat
            </h3>

            <p className="text-slate-500 mt-2">
              Ajoutez votre premier plat au menu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-4">
                    Plat
                  </th>

                  <th className="text-left px-5 py-4">
                    Catégorie
                  </th>

                  <th className="text-left px-5 py-4">
                    Description
                  </th>

                  <th className="text-left px-5 py-4">
                    Prix
                  </th>

                  <th className="text-left px-5 py-4">
                    Stock
                  </th>

                  <th className="text-left px-5 py-4">
                    Statut
                  </th>

                  <th className="text-left px-5 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => (
                    <tr
                      key={
                        product._id
                      }
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
                            🍲
                          </div>

                          <div>
                            <p className="font-bold">
                              {
                                product.name
                              }
                            </p>

                            {product.ingredients && (
                              <p className="text-xs text-slate-400 mt-1 max-w-[180px] truncate">
                                🥕{" "}
                                {
                                  product.ingredients
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold">
                          {
                            product.category
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 max-w-[300px]">
                        {product.description ? (
                          <p className="text-slate-600 line-clamp-3">
                            {
                              product.description
                            }
                          </p>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            Aucune description
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {Number(
                          product.price ||
                            0
                        ).toFixed(
                          2
                        )}{" "}
                        DH
                      </td>

                      <td className="px-5 py-4">
                        {
                          product.stock
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            Number(
                              product.stock
                            ) === 0
                              ? "bg-rose-100 text-rose-700"
                              : Number(
                                  product.stock
                                ) <= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {Number(
                            product.stock
                          ) === 0
                            ? "Rupture"
                            : Number(
                                product.stock
                              ) <= 5
                            ? "Stock faible"
                            : "Disponible"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleEditClick(
                                product
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                          >
                            ✏️ Modifier
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                product._id
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                          >
                            🗑 Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>

      {/* ================================================= */}
      {/* DAILY MENU AI */}
      {/* ================================================= */}

      <div
        className={
          activeTab === "daily"
            ? "block"
            : "hidden"
        }
      >
        {loadingDailyMenu ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />

            <h2 className="text-xl font-bold text-slate-900 mt-6">
              Création du menu du jour...
            </h2>

            <p className="text-slate-500 mt-2">
              L&apos;IA analyse le stock disponible.
            </p>
          </div>
        ) : dailyMenuError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-7">
            <h2 className="text-xl font-bold text-rose-800">
              ⚠️ Impossible de générer le menu du jour
            </h2>

            <p className="text-rose-700 mt-2">
              {dailyMenuError}
            </p>

            <button
              type="button"
              onClick={
                loadDailyMenu
              }
              className="mt-5 px-5 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700"
            >
              🔄 Réessayer
            </button>
          </div>
        ) : dailyMenu ? (
          <>
            {/* DAILY MENU HEADER */}

            <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-3xl p-6 lg:p-8 mb-6">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                    🍳
                  </div>

                  <div>
                    <p className="text-xs font-bold tracking-widest text-violet-200">
                      MENU DU JOUR INTELLIGENT
                    </p>

                    <h2 className="text-2xl font-bold mt-1">
                      Suggestions selon le stock
                    </h2>

                    <p className="text-violet-100 mt-2 max-w-2xl">
                      RestoFlow analyse les produits disponibles et propose des plats adaptés pour aujourd&apos;hui.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    loadDailyMenu
                  }
                  className="bg-white text-violet-700 px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-violet-50 transition"
                >
                  ✨ Régénérer
                </button>
              </div>
            </div>

            {/* AI ANALYSIS */}

            <div className="bg-slate-950 text-white rounded-3xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl flex-shrink-0">
                  🤖
                </div>

                <div>
                  <p className="text-xs font-bold tracking-widest text-violet-300">
                    ANALYSE IA
                  </p>

                  <h3 className="text-xl font-bold mt-1">
                    Analyse du stock
                  </h3>

                  <p className="text-slate-300 mt-3 leading-7">
                    {dailyMenu.aiMessage ||
                      "Aucune analyse disponible."}
                  </p>
                </div>
              </div>
            </div>

            {/* STOCK SUMMARY */}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total produits
                </p>

                <p className="text-3xl font-bold mt-2">
                  {dailyMenu.stockSummary?.totalProducts || 0}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-500">
                  Disponibles
                </p>

                <p className="text-3xl font-bold mt-2 text-emerald-600">
                  {dailyMenu.stockSummary?.availableProducts || 0}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-500">
                  Stock faible
                </p>

                <p className="text-3xl font-bold mt-2 text-amber-600">
                  {dailyMenu.stockSummary?.lowStockProducts || 0}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-500">
                  En rupture
                </p>

                <p className="text-3xl font-bold mt-2 text-rose-600">
                  {dailyMenu.stockSummary?.outOfStockProducts || 0}
                </p>
              </div>
            </div>

            {/* SUGGESTIONS */}

            <div className="mb-7">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    🍽️ Suggestions du jour
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Plats proposés automatiquement par l&apos;IA.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-bold">
                  {dailyMenu.suggestions?.length || 0} suggestion(s)
                </span>
              </div>

              {dailyMenu.suggestions?.length ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {dailyMenu.suggestions.map(
                    (
                      suggestion,
                      index
                    ) => (
                      <div
                        key={`${suggestion.name}-${index}`}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-lg transition"
                      >
                        <div className="bg-gradient-to-br from-orange-50 via-white to-pink-50 p-6 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center text-3xl">
                              🍲
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full border text-xs font-bold ${getPriorityStyle(
                                suggestion.priority
                              )}`}
                            >
                              {suggestion.priority || "Moyenne"}
                            </span>
                          </div>

                          <p className="text-xs font-bold tracking-widest text-orange-500 mt-5">
                            SUGGESTION {index + 1}
                          </p>

                          <h3 className="text-xl font-bold text-slate-900 mt-2">
                            {suggestion.name}
                          </h3>
                        </div>

                        <div className="p-6">
                          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                            Ingrédients
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {suggestion.ingredients?.length ? (
                              suggestion.ingredients.map(
                                (
                                  ingredient,
                                  ingredientIndex
                                ) => (
                                  <span
                                    key={`${ingredient}-${ingredientIndex}`}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                                  >
                                    {ingredient}
                                  </span>
                                )
                              )
                            ) : (
                              <span className="text-sm text-slate-400">
                                Aucun ingrédient indiqué
                              </span>
                            )}
                          </div>

                          <div className="h-px bg-slate-100 my-5" />

                          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                            Pourquoi ?
                          </p>

                          <p className="text-sm text-slate-600 mt-3 leading-6">
                            {suggestion.reason ||
                              "Aucune explication disponible."}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center">
                  <div className="text-5xl">
                    🍽️
                  </div>

                  <h3 className="text-xl font-bold mt-4">
                    Aucune suggestion
                  </h3>

                  <p className="text-slate-500 mt-2">
                    Vérifiez le stock puis régénérez le menu.
                  </p>
                </div>
              )}
            </div>

            {/* STOCK DETAILS */}

            <div className="grid lg:grid-cols-3 gap-5">
              {/* AVAILABLE */}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">
                      ✅ Disponibles
                    </h3>

                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                      {dailyMenu.availableIngredients?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                  {dailyMenu.availableIngredients?.length ? (
                    dailyMenu.availableIngredients.map(
                      (product) => (
                        <div
                          key={product._id}
                          className="px-5 py-4 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {product.name}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              {product.category || "Sans catégorie"}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                            {product.stock}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="p-5 text-sm text-slate-400">
                      Aucun produit disponible.
                    </p>
                  )}
                </div>
              </div>

              {/* LOW STOCK */}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">
                      ⚠️ Stock faible
                    </h3>

                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                      {dailyMenu.lowStockIngredients?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                  {dailyMenu.lowStockIngredients?.length ? (
                    dailyMenu.lowStockIngredients.map(
                      (product) => (
                        <div
                          key={product._id}
                          className="px-5 py-4 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {product.name}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              {product.category || "Sans catégorie"}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                            {product.stock}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="p-5 text-sm text-slate-400">
                      Aucun stock faible.
                    </p>
                  )}
                </div>
              </div>

              {/* OUT OF STOCK */}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">
                      ❌ Ruptures
                    </h3>

                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                      {dailyMenu.unavailableIngredients?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                  {dailyMenu.unavailableIngredients?.length ? (
                    dailyMenu.unavailableIngredients.map(
                      (product) => (
                        <div
                          key={product._id}
                          className="px-5 py-4 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {product.name}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              {product.category || "Sans catégorie"}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">
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
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <div className="text-5xl">
              ✨
            </div>

            <h2 className="text-xl font-bold mt-4">
              Menu du jour IA
            </h2>

            <p className="text-slate-500 mt-2">
              Cliquez sur le bouton pour analyser votre stock.
            </p>

            <button
              type="button"
              onClick={
                loadDailyMenu
              }
              className="mt-5 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold"
            >
              ✨ Générer le menu
            </button>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold tracking-widest text-pink-600">
                  {editingProduct
                    ? "MODIFICATION"
                    : "NOUVEAU PLAT"}
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  {editingProduct
                    ? "Modifier le plat ✏️"
                    : "Ajouter un plat 🍽️"}
                </h2>

                <p className="text-slate-500 text-sm mt-1">
                  Utilisez l&apos;IA pour créer une
                  description automatiquement.
                </p>
              </div>

              <button
                onClick={
                  closeModal
                }
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="p-6 space-y-5"
            >
              {/* NAME */}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nom du plat *
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="Ex : Tagine de poulet"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Catégorie *
                </label>

                <select
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-pink-200"
                >
                  <option value="">
                    Choisir une catégorie
                  </option>

                  <option value="Entrées">
                    Entrées
                  </option>

                  <option value="Plats">
                    Plats
                  </option>

                  <option value="Desserts">
                    Desserts
                  </option>

                  <option value="Boissons">
                    Boissons
                  </option>
                </select>
              </div>

              {/* PRICE STOCK */}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Prix (DH) *
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={
                      form.price
                    }
                    onChange={
                      handleChange
                    }
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Stock *
                  </label>

                  <input
                    type="number"
                    name="stock"
                    value={
                      form.stock
                    }
                    onChange={
                      handleChange
                    }
                    required
                    min="0"
                    step="1"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                  />
                </div>
              </div>

              {/* INGREDIENTS */}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  🥕 Ingrédients
                </label>

                <textarea
                  name="ingredients"
                  value={
                    form.ingredients
                  }
                  onChange={
                    handleChange
                  }
                  rows="3"
                  placeholder="Ex : poulet, olives, citron confit, oignons, épices..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200 resize-none"
                />

                <p className="text-xs text-slate-400 mt-2">
                  Plus les ingrédients sont précis,
                  meilleure sera la description générée.
                </p>
              </div>

              {/* AI PANEL */}

              <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-200/40 rounded-full blur-2xl" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        ✨
                      </span>

                      <h3 className="font-bold text-violet-900">
                        Assistant IA
                      </h3>
                    </div>

                    <p className="text-sm text-violet-700 mt-2">
                      Générez automatiquement une
                      description à partir du plat et
                      de ses ingrédients.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      generateDescription
                    }
                    disabled={
                      generatingAI ||
                      !form.name.trim()
                    }
                    className="flex-shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingAI
                      ? "✨ Génération..."
                      : "✨ Générer avec IA"}
                  </button>
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">
                    Description
                  </label>

                  {form.description && (
                    <span className="text-xs text-emerald-600 font-semibold">
                      ✓ Description prête
                    </span>
                  )}
                </div>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  rows="5"
                  placeholder="La description du plat apparaîtra ici..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200 resize-none"
                />

                <div className="flex justify-between mt-2">
                  <p className="text-xs text-slate-400">
                    Vous pouvez modifier manuellement le
                    texte généré par l&apos;IA.
                  </p>

                  <p className="text-xs text-slate-400">
                    {
                      form.description.length
                    }{" "}
                    caractères
                  </p>
                </div>
              </div>

              {/* BUTTONS */}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg"
                >
                  {editingProduct
                    ? "💾 Enregistrer"
                    : "+ Ajouter le plat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;