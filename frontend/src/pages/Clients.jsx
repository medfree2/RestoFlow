import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import Recommendations from "./Recommendations";

const API_URL = `${API_BASE_URL}/api/customers`;

function ClientsContent() {
  const { authFetch, logout } = useAuth();

  const checkAuthResponse = async (response) => {
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

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await authFetch(API_URL);

      await checkAuthResponse(response);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des clients");
      }

      const data = await response.json();

      setCustomers(data);
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
    loadCustomers();
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredCustomers = useMemo(() => {
    const searchText = search
      .trim()
      .toLowerCase();

    return customers.filter((customer) => {
      return (
        customer.name
          ?.toLowerCase()
          .includes(searchText) ||
        customer.phone
          ?.toLowerCase()
          .includes(searchText) ||
        customer.email
          ?.toLowerCase()
          .includes(searchText)
      );
    });
  }, [customers, search]);

  // =====================================================
  // STATS
  // =====================================================

  const totalCustomers = customers.length;

  const totalSpent = customers.reduce(
    (sum, customer) =>
      sum +
      Number(customer.totalSpent || 0),
    0
  );

  const totalOrders = customers.reduce(
    (sum, customer) =>
      sum +
      Number(customer.totalOrders || 0),
    0
  );

  const averageSpent =
    totalCustomers > 0
      ? totalSpent / totalCustomers
      : 0;

  const bestCustomer =
    [...customers].sort(
      (a, b) =>
        Number(b.totalSpent || 0) -
        Number(a.totalSpent || 0)
    )[0] || null;

  // =====================================================
  // FORM
  // =====================================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const openAddModal = () => {
    setEditingCustomer(null);

    setForm({
      name: "",
      phone: "",
      email: "",
    });

    setShowForm(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });

    setShowForm(true);
  };

  // =====================================================
  // ADD / UPDATE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method =
        editingCustomer
          ? "PUT"
          : "POST";

      const url =
        editingCustomer
          ? `${API_URL}/${editingCustomer._id}`
          : API_URL;

      const response = await authFetch(url, {
        method,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
        }),
      });

      await checkAuthResponse(response);

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de l'enregistrement"
        );
      }

      await loadCustomers();

      setShowForm(false);
      setEditingCustomer(null);

      setForm({
        name: "",
        phone: "",
        email: "",
      });
    } catch (err) {
      console.error(err);

      alert(err.message);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    customer
  ) => {
    const confirmation =
      window.confirm(
        `Supprimer le client "${customer.name}" ?`
      );

    if (!confirmation) {
      return;
    }

    try {
      const response =
        await authFetch(
          `${API_URL}/${customer._id}`,
          {
            method: "DELETE",
          }
        );

      await checkAuthResponse(response);

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de la suppression"
        );
      }

      setCustomers(
        (currentCustomers) =>
          currentCustomers.filter(
            (item) =>
              item._id !== customer._id
          )
      );
    } catch (err) {
      console.error(err);

      alert(err.message);
    }
  };

  // =====================================================
  // CUSTOMER LEVEL
  // =====================================================

  const getCustomerLevel = (
    customer
  ) => {
    const spent =
      Number(
        customer.totalSpent || 0
      );

    if (spent >= 1000) {
      return {
        label: "VIP",
        className:
          "bg-violet-100 text-violet-700",
        icon: "👑",
      };
    }

    if (spent >= 500) {
      return {
        label: "Fidèle",
        className:
          "bg-emerald-100 text-emerald-700",
        icon: "⭐",
      };
    }

    return {
      label: "Standard",
      className:
        "bg-slate-100 text-slate-600",
      icon: "👤",
    };
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          👥
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement des clients
        </h2>

        <p className="text-slate-500 mt-2">
          Récupération des données MongoDB...
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7">
      {/* HEADER */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

            <p className="text-xs font-bold tracking-widest text-emerald-600">
              GESTION CLIENTS
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Gestion des clients 👥
          </h1>

          <p className="text-slate-500 mt-2">
            Gérez vos clients et analysez leur activité.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadCustomers}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition"
          >
            🔄 Actualiser
          </button>

          <button
            onClick={openAddModal}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg"
          >
            + Ajouter un client
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 p-4">
          ⚠ {error}
        </div>
      )}

      {/* STATS */}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              👥
            </div>

            <p className="text-sm text-white/80">
              Total clients
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {totalCustomers}
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              💰
            </div>

            <p className="text-sm text-white/80">
              Dépenses totales
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {totalSpent.toFixed(2)} DH
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/20" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-5">
              🧾
            </div>

            <p className="text-sm text-orange-900/70">
              Commandes clients
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {totalOrders}
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-purple-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              📊
            </div>

            <p className="text-sm text-white/80">
              Dépense moyenne
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {averageSpent.toFixed(2)} DH
            </h2>
          </div>
        </div>
      </div>

      {/* BEST CUSTOMER */}

      {bestCustomer &&
        Number(
          bestCustomer.totalSpent ||
            0
        ) > 0 && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-violet-900 text-white p-6 mb-6">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 flex items-center justify-center text-4xl">
                  👑
                </div>

                <div>
                  <p className="text-xs tracking-widest text-amber-300 font-bold">
                    MEILLEUR CLIENT
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    {bestCustomer.name}
                  </h2>

                  <p className="text-slate-300 text-sm mt-1">
                    {bestCustomer.totalOrders} commande(s)
                  </p>
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-sm text-slate-300">
                  Total dépensé
                </p>

                <p className="text-3xl font-bold text-emerald-400">
                  {Number(
                    bestCustomer.totalSpent ||
                      0
                  ).toFixed(2)}{" "}
                  DH
                </p>
              </div>
            </div>
          </div>
        )}

      {/* SEARCH */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Rechercher par nom, téléphone ou email..."
            className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>
      </div>

      {/* CUSTOMER TABLE */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              👥 Liste des clients
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {filteredCustomers.length} client(s) affiché(s)
            </p>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-6xl mb-4">
              👤
            </div>

            <h3 className="text-xl font-bold">
              Aucun client
            </h3>

            <p className="text-slate-500 mt-2">
              Ajoutez un client ou créez une commande avec un nouveau nom.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-4">
                    Client
                  </th>

                  <th className="text-left px-5 py-4">
                    Contact
                  </th>

                  <th className="text-left px-5 py-4">
                    Niveau
                  </th>

                  <th className="text-left px-5 py-4">
                    Commandes
                  </th>

                  <th className="text-left px-5 py-4">
                    Dépenses
                  </th>

                  <th className="text-left px-5 py-4">
                    Dernière commande
                  </th>

                  <th className="text-left px-5 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map(
                  (customer) => {
                    const level =
                      getCustomerLevel(
                        customer
                      );

                    return (
                      <tr
                        key={customer._id}
                        className="border-t border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center text-xl">
                              👤
                            </div>

                            <div>
                              <p className="font-bold">
                                {customer.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                Client depuis{" "}
                                {customer.createdAt
                                  ? new Date(
                                      customer.createdAt
                                    ).toLocaleDateString(
                                      "fr-FR"
                                    )
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p>
                              📞{" "}
                              {customer.phone ||
                                "Non renseigné"}
                            </p>

                            <p className="text-slate-500 text-xs">
                              ✉️{" "}
                              {customer.email ||
                                "Non renseigné"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${level.className}`}
                          >
                            {level.icon}{" "}
                            {level.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-xl font-bold">
                              {customer.totalOrders ||
                                0}
                            </p>

                            <p className="text-xs text-slate-400">
                              {customer.completedOrders ||
                                0}{" "}
                              terminée(s)
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-emerald-600">
                            {Number(
                              customer.totalSpent ||
                                0
                            ).toFixed(2)}{" "}
                            DH
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {customer.lastOrderDate
                            ? new Date(
                                customer.lastOrderDate
                              ).toLocaleString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Aucune"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                openEditModal(
                                  customer
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                            >
                              ✏️ Modifier
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  customer
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                            >
                              🗑 Supprimer
                            </button>
                          </div>
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

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold tracking-widest text-pink-600">
                  {editingCustomer
                    ? "MODIFICATION"
                    : "NOUVEAU CLIENT"}
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  {editingCustomer
                    ? "Modifier le client ✏️"
                    : "Ajouter un client 👤"}
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nom du client *
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex : Ahmed Benali"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Téléphone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ex : 0612345678"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Ex : client@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCustomer(null);
                  }}
                  className="flex-1 px-5 py-3 rounded-xl bg-slate-100 font-semibold"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg"
                >
                  {editingCustomer
                    ? "💾 Enregistrer"
                    : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// =====================================================
// CLIENTS + AI RECOMMENDATIONS
// =====================================================

function Clients() {
  const [activeTab, setActiveTab] =
    useState("clients");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-5 lg:px-7 pt-5 lg:pt-7">
        <div className="inline-flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setActiveTab("clients")
            }
            className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
              activeTab === "clients"
                ? "bg-slate-950 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            👥 Liste des clients
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("recommendations")
            }
            className={`px-5 py-3 rounded-xl text-sm font-bold transition ${
              activeTab === "recommendations"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            🤖 Recommandations IA
          </button>
        </div>
      </div>

      {activeTab === "clients" ? (
        <ClientsContent />
      ) : (
        <Recommendations />
      )}
    </div>
  );
}

export default Clients;
