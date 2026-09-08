import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const PRODUCTS_API = "http://localhost:5000/api/products";
const ORDERS_API = "http://localhost:5000/api/orders";
const CUSTOMERS_API = "http://localhost:5000/api/customers";

const statusStyles = {
  "En attente": "bg-blue-100 text-blue-700",
  "En préparation": "bg-amber-100 text-amber-700",
  Prête: "bg-violet-100 text-violet-700",
  Terminée: "bg-emerald-100 text-emerald-700",
  Annulée: "bg-rose-100 text-rose-700",
};

function Commandes() {
  const { authFetch, logout } = useAuth();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Espèces");

  const [selectedItems, setSelectedItems] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");

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
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        productsResponse,
        ordersResponse,
        customersResponse,
      ] = await Promise.all([
        authFetch(PRODUCTS_API),
        authFetch(ORDERS_API),
        authFetch(CUSTOMERS_API),
      ]);

      await checkAuthResponse(productsResponse);
      await checkAuthResponse(ordersResponse);
      await checkAuthResponse(customersResponse);

      if (
        !productsResponse.ok ||
        !ordersResponse.ok ||
        !customersResponse.ok
      ) {
        throw new Error(
          "Erreur lors du chargement des données"
        );
      }

      const productsData =
        await productsResponse.json();

      const ordersData =
        await ordersResponse.json();

      const customersData =
        await customersResponse.json();

      setProducts(productsData);
      setOrders(ordersData);
      setCustomers(customersData);
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
    loadData();
  }, []);

  // =====================================================
  // OPEN ORDER MODAL
  // =====================================================

  const openNewOrder = () => {
    setSelectedCustomerId("");
    setNewCustomerName("");
    setPaymentMethod("Espèces");
    setSelectedItems([]);

    setShowForm(true);
  };

  const closeOrderModal = () => {
    setShowForm(false);

    setSelectedCustomerId("");
    setNewCustomerName("");
    setPaymentMethod("Espèces");
    setSelectedItems([]);
  };

  // =====================================================
  // SELECT PRODUCT
  // =====================================================

  const addProduct = (product) => {
    if (Number(product.stock) <= 0) {
      return;
    }

    const existingItem =
      selectedItems.find(
        (item) =>
          item.product === product._id
      );

    if (existingItem) {
      if (
        existingItem.quantity >=
        Number(product.stock)
      ) {
        return;
      }

      setSelectedItems((items) =>
        items.map((item) =>
          item.product === product._id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        )
      );

      return;
    }

    setSelectedItems((items) => [
      ...items,
      {
        product: product._id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        maxStock: Number(product.stock),
      },
    ]);
  };

  // =====================================================
  // CHANGE QUANTITY
  // =====================================================

  const changeQuantity = (
    productId,
    amount
  ) => {
    setSelectedItems((items) =>
      items
        .map((item) => {
          if (
            item.product !== productId
          ) {
            return item;
          }

          const newQuantity =
            item.quantity + amount;

          if (
            newQuantity >
            item.maxStock
          ) {
            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeItem = (productId) => {
    setSelectedItems((items) =>
      items.filter(
        (item) =>
          item.product !== productId
      )
    );
  };

  // =====================================================
  // TOTAL
  // =====================================================

  const total = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) =>
        sum +
        Number(item.price) *
          Number(item.quantity),
      0
    );
  }, [selectedItems]);

  const totalItems =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity),
      0
    );

  // =====================================================
  // SELECTED CUSTOMER
  // =====================================================

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer._id ===
        selectedCustomerId
    ) || null;

  // =====================================================
  // CREATE ORDER
  // =====================================================

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    let customerName = "";
    let customerId = null;

    if (
      selectedCustomerId === "new"
    ) {
      customerName =
        newCustomerName.trim();

      if (!customerName) {
        alert(
          "Veuillez saisir le nom du nouveau client."
        );

        return;
      }
    } else {
      const customer =
        customers.find(
          (item) =>
            item._id ===
            selectedCustomerId
        );

      if (!customer) {
        alert(
          "Veuillez sélectionner un client."
        );

        return;
      }

      customerName =
        customer.name;

      customerId =
        customer._id;
    }

    if (
      selectedItems.length === 0
    ) {
      alert(
        "Ajoutez au moins un plat."
      );

      return;
    }

    try {
      const response =
        await authFetch(
          ORDERS_API,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customerName,
              customerId,

              paymentMethod,

              items:
                selectedItems.map(
                  (item) => ({
                    product:
                      item.product,

                    quantity:
                      item.quantity,
                  })
                ),
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
          data.message ||
            "Erreur lors de la création"
        );
      }

      setOrders(
        (currentOrders) => [
          data,
          ...currentOrders,
        ]
      );

      closeOrderModal();

      // Stock changed + a new customer may have been created.
      const [
        productsResponse,
        customersResponse,
      ] = await Promise.all([
        authFetch(PRODUCTS_API),
        authFetch(CUSTOMERS_API),
      ]);

      await checkAuthResponse(
        productsResponse
      );

      await checkAuthResponse(
        customersResponse
      );

      if (productsResponse.ok) {
        const productsData =
          await productsResponse.json();

        setProducts(
          productsData
        );
      }

      if (customersResponse.ok) {
        const customersData =
          await customersResponse.json();

        setCustomers(
          customersData
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible de créer la commande."
      );
    }
  };

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const updateStatus = async (
    orderId,
    status
  ) => {
    try {
      const response =
        await authFetch(
          `${ORDERS_API}/${orderId}/status`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              status,
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
          data.message ||
            "Erreur lors de la modification"
        );
      }

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              order._id ===
              orderId
                ? data
                : order
          )
      );

      // Stock can change when an order is cancelled/reactivated.
      const productsResponse =
        await authFetch(
          PRODUCTS_API
        );

      await checkAuthResponse(
        productsResponse
      );

      if (
        productsResponse.ok
      ) {
        const productsData =
          await productsResponse.json();

        setProducts(
          productsData
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible de modifier le statut."
      );

      await loadData();
    }
  };

  // =====================================================
  // DELETE ORDER
  // =====================================================

  const deleteOrder = async (
    orderId
  ) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer cette commande ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      const response =
        await authFetch(
          `${ORDERS_API}/${orderId}`,
          {
            method: "DELETE",
          }
        );

      await checkAuthResponse(
        response
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de supprimer la commande"
        );
      }

      setOrders(
        (currentOrders) =>
          currentOrders.filter(
            (order) =>
              order._id !==
              orderId
          )
      );

      // Deleting an order may restore stock.
      const productsResponse =
        await authFetch(
          PRODUCTS_API
        );

      await checkAuthResponse(
        productsResponse
      );

      if (
        productsResponse.ok
      ) {
        const productsData =
          await productsResponse.json();

        setProducts(
          productsData
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible de supprimer la commande."
      );
    }
  };

  // =====================================================
  // FILTER ORDERS
  // =====================================================

  const filteredOrders =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const customerName =
            order.customer?.name ||
            order.customerName ||
            "";

          const matchesSearch =
            order.orderNumber
              ?.toLowerCase()
              .includes(
                searchText
              ) ||
            customerName
              .toLowerCase()
              .includes(
                searchText
              );

          const matchesStatus =
            statusFilter ===
              "Tous" ||
            order.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      orders,
      search,
      statusFilter,
    ]);

  // =====================================================
  // STATS
  // =====================================================

  const totalSales =
    orders
      .filter(
        (order) =>
          order.status ===
          "Terminée"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.total || 0
          ),
        0
      );

  const pendingOrders =
    orders.filter(
      (order) =>
        order.status ===
          "En attente" ||
        order.status ===
          "En préparation" ||
        order.status ===
          "Prête"
    ).length;

  const completedOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Terminée"
    ).length;

  const cancelledOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Annulée"
    ).length;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-5">
          🧾
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement des commandes
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
              COMMANDES CONNECTÉES
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Gestion des commandes 🧾
          </h1>

          <p className="text-slate-500 mt-2">
            Créez, suivez et gérez les commandes du restaurant.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50"
          >
            🔄 Actualiser
          </button>

          <button
            onClick={openNewOrder}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg"
          >
            + Nouvelle commande
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4">
          ⚠ {error}
        </div>
      )}

      {/* STATS */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-blue-400 to-indigo-600">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
            🧾
          </div>

          <p className="text-white/80 text-sm">
            Total commandes
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {orders.length}
          </h2>
        </div>

        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-300 to-orange-400">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-5">
            ⏳
          </div>

          <p className="text-orange-900/70 text-sm">
            En cours
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {pendingOrders}
          </h2>
        </div>

        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-emerald-400 to-teal-600">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
            ✅
          </div>

          <p className="text-white/80 text-sm">
            Terminées
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {completedOrders}
          </h2>

          <p className="text-xs text-white/70 mt-2">
            {totalSales.toFixed(2)} DH
          </p>
        </div>

        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-pink-400 to-rose-600">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
            ❌
          </div>

          <p className="text-white/80 text-sm">
            Annulées
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {cancelledOrders}
          </h2>
        </div>
      </div>

      {/* FILTERS */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Rechercher une commande ou un client..."
              className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none"
          >
            <option value="Tous">
              Tous les statuts
            </option>

            <option value="En attente">
              En attente
            </option>

            <option value="En préparation">
              En préparation
            </option>

            <option value="Prête">
              Prête
            </option>

            <option value="Terminée">
              Terminée
            </option>

            <option value="Annulée">
              Annulée
            </option>
          </select>
        </div>
      </div>

      {/* ORDERS TABLE */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            📋 Liste des commandes
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {filteredOrders.length} commande(s) affichée(s)
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-6xl mb-4">
              🧾
            </div>

            <h3 className="text-xl font-bold">
              Aucune commande
            </h3>

            <p className="text-slate-500 mt-2">
              Créez votre première commande.
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

                  <th className="text-left px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map(
                  (order) => {
                    const customerName =
                      order.customer?.name ||
                      order.customerName ||
                      "Client";

                    return (
                      <tr
                        key={order._id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold">
                            {order.orderNumber}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            ID{" "}
                            {order._id.slice(
                              -6
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              👤
                            </div>

                            <div>
                              <p className="font-semibold">
                                {customerName}
                              </p>

                              {order.customer?.phone && (
                                <p className="text-xs text-slate-400">
                                  {
                                    order
                                      .customer
                                      .phone
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {order.items?.map(
                              (
                                item,
                                index
                              ) => (
                                <p
                                  key={`${order._id}-${index}`}
                                  className="text-xs"
                                >
                                  {
                                    item.quantity
                                  }{" "}
                                  ×{" "}
                                  {
                                    item.name
                                  }
                                </p>
                              )
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {Number(
                            order.total ||
                              0
                          ).toFixed(
                            2
                          )}{" "}
                          DH
                        </td>

                        <td className="px-5 py-4">
                          {order.paymentMethod}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={
                              order.status
                            }
                            onChange={(e) =>
                              updateStatus(
                                order._id,
                                e.target.value
                              )
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none ${
                              statusStyles[
                                order.status
                              ] ||
                              "bg-slate-100"
                            }`}
                          >
                            <option value="En attente">
                              En attente
                            </option>

                            <option value="En préparation">
                              En préparation
                            </option>

                            <option value="Prête">
                              Prête
                            </option>

                            <option value="Terminée">
                              Terminée
                            </option>

                            <option value="Annulée">
                              Annulée
                            </option>
                          </select>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {new Date(
                            order.createdAt
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
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              deleteOrder(
                                order._id
                              )
                            }
                            className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl font-semibold hover:bg-rose-100"
                          >
                            🗑 Supprimer
                          </button>
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

      {/* CREATE ORDER MODAL */}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 p-6 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold tracking-widest text-pink-600">
                  NOUVELLE COMMANDE
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  Créer une commande 🧾
                </h2>
              </div>

              <button
                onClick={closeOrderModal}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleCreateOrder
              }
            >
              <div className="grid lg:grid-cols-[1.45fr_0.8fr]">
                {/* LEFT */}

                <div className="p-6 border-r border-slate-100">
                  {/* CUSTOMER */}

                  <div className="mb-7">
                    <h3 className="text-lg font-bold mb-4">
                      👤 Client
                    </h3>

                    <label className="block text-sm font-semibold mb-2">
                      Sélectionner un client
                    </label>

                    <select
                      value={
                        selectedCustomerId
                      }
                      onChange={(e) => {
                        setSelectedCustomerId(
                          e.target.value
                        );

                        if (
                          e.target.value !==
                          "new"
                        ) {
                          setNewCustomerName(
                            ""
                          );
                        }
                      }}
                      required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      <option value="">
                        Choisir un client
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={
                              customer._id
                            }
                            value={
                              customer._id
                            }
                          >
                            {
                              customer.name
                            }
                            {customer.phone
                              ? ` - ${customer.phone}`
                              : ""}
                          </option>
                        )
                      )}

                      <option value="new">
                        ➕ Nouveau client
                      </option>
                    </select>

                    {selectedCustomerId ===
                      "new" && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold mb-2">
                          Nom du nouveau client
                        </label>

                        <input
                          type="text"
                          value={
                            newCustomerName
                          }
                          onChange={(e) =>
                            setNewCustomerName(
                              e.target.value
                            )
                          }
                          required
                          placeholder="Ex : Ahmed Benali"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                        />
                      </div>
                    )}

                    {selectedCustomer && (
                      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                            👤
                          </div>

                          <div>
                            <p className="font-bold">
                              {
                                selectedCustomer.name
                              }
                            </p>

                            <p className="text-sm text-slate-500">
                              {selectedCustomer.phone ||
                                "Téléphone non renseigné"}
                            </p>

                            {selectedCustomer.email && (
                              <p className="text-xs text-slate-400">
                                {
                                  selectedCustomer.email
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRODUCTS */}

                  <h3 className="text-lg font-bold mb-4">
                    🍽️ Choisir les plats
                  </h3>

                  {products.length ===
                  0 ? (
                    <div className="p-10 text-center bg-slate-50 rounded-2xl">
                      Aucun plat disponible.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {products.map(
                        (product) => {
                          const stock =
                            Number(
                              product.stock ||
                                0
                            );

                          return (
                            <button
                              key={
                                product._id
                              }
                              type="button"
                              disabled={
                                stock <= 0
                              }
                              onClick={() =>
                                addProduct(
                                  product
                                )
                              }
                              className={`text-left border rounded-2xl p-4 transition ${
                                stock <= 0
                                  ? "opacity-40 cursor-not-allowed bg-slate-50"
                                  : "border-slate-200 hover:border-pink-400 hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                                  🍲
                                </div>

                                <div className="flex-1">
                                  <p className="font-bold">
                                    {
                                      product.name
                                    }
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {
                                      product.category
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex justify-between">
                                <span className="font-bold text-pink-600">
                                  {Number(
                                    product.price
                                  ).toFixed(
                                    2
                                  )}{" "}
                                  DH
                                </span>

                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    stock === 0
                                      ? "bg-rose-100 text-rose-700"
                                      : stock <= 5
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  Stock:{" "}
                                  {stock}
                                </span>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* CART */}

                <div className="p-6 bg-slate-50">
                  <h3 className="text-lg font-bold mb-5">
                    🛒 Commande
                  </h3>

                  {selectedItems.length ===
                  0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                      <div className="text-5xl mb-3">
                        🛒
                      </div>

                      <p className="font-semibold">
                        Panier vide
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        Sélectionnez un plat.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map(
                        (item) => (
                          <div
                            key={
                              item.product
                            }
                            className="bg-white border border-slate-100 rounded-2xl p-4"
                          >
                            <div className="flex justify-between gap-3">
                              <div>
                                <p className="font-bold">
                                  {
                                    item.name
                                  }
                                </p>

                                <p className="text-sm text-slate-500">
                                  {item.price.toFixed(
                                    2
                                  )}{" "}
                                  DH
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    item.product
                                  )
                                }
                                className="text-rose-500"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeQuantity(
                                      item.product,
                                      -1
                                    )
                                  }
                                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold"
                                >
                                  −
                                </button>

                                <span className="w-8 text-center font-bold">
                                  {
                                    item.quantity
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    changeQuantity(
                                      item.product,
                                      1
                                    )
                                  }
                                  disabled={
                                    item.quantity >=
                                    item.maxStock
                                  }
                                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>

                              <p className="font-bold">
                                {(
                                  item.price *
                                  item.quantity
                                ).toFixed(
                                  2
                                )}{" "}
                                DH
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* PAYMENT */}

                  <div className="mt-6">
                    <label className="block text-sm font-semibold mb-2">
                      Mode de paiement
                    </label>

                    <select
                      value={
                        paymentMethod
                      }
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value
                        )
                      }
                      className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3"
                    >
                      <option value="Espèces">
                        💵 Espèces
                      </option>

                      <option value="Carte">
                        💳 Carte
                      </option>
                    </select>
                  </div>

                  {/* TOTAL */}

                  <div className="mt-6 bg-slate-900 text-white rounded-2xl p-5">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>
                        Articles
                      </span>

                      <span>
                        {totalItems}
                      </span>
                    </div>

                    <div className="h-px bg-white/10 my-4" />

                    <div className="flex justify-between items-end">
                      <span className="font-semibold">
                        Total
                      </span>

                      <span className="text-3xl font-bold">
                        {total.toFixed(
                          2
                        )}{" "}
                        DH
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      selectedItems.length ===
                        0 ||
                      !selectedCustomerId
                    }
                    className="w-full mt-5 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ Créer la commande
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Commandes;