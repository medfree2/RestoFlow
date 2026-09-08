import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const RESERVATIONS_API =
  "http://localhost:5000/api/reservations";

const CUSTOMERS_API =
  "http://localhost:5000/api/customers";

const statusStyles = {
  "En attente": "bg-amber-100 text-amber-700",
  Confirmée: "bg-blue-100 text-blue-700",
  Installée: "bg-violet-100 text-violet-700",
  Terminée: "bg-emerald-100 text-emerald-700",
  Annulée: "bg-rose-100 text-rose-700",
};

function Reservations() {
  const { authFetch, logout } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("Tous");

  const [dateFilter, setDateFilter] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingReservation,
    setEditingReservation,
  ] = useState(null);

  const [customerMode, setCustomerMode] =
    useState("existing");

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    date: "",
    time: "",
    guests: 2,
    tableNumber: "",
    status: "En attente",
    notes: "",
  });

  // =====================================================
  // AUTH RESPONSE
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
        reservationsResponse,
        customersResponse,
      ] = await Promise.all([
        authFetch(RESERVATIONS_API),
        authFetch(CUSTOMERS_API),
      ]);

      await checkAuthResponse(
        reservationsResponse
      );

      await checkAuthResponse(
        customersResponse
      );

      if (
        !reservationsResponse.ok ||
        !customersResponse.ok
      ) {
        throw new Error(
          "Erreur lors du chargement des données"
        );
      }

      const reservationsData =
        await reservationsResponse.json();

      const customersData =
        await customersResponse.json();

      setReservations(reservationsData);
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
  // HELPERS
  // =====================================================

  const formatDateInput = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    return new Date(
      dateValue
    ).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getTodayString = () => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // STATS
  // =====================================================

  const todayString =
    getTodayString();

  const todayReservations =
    reservations.filter(
      (reservation) =>
        formatDateInput(
          reservation.date
        ) === todayString
    );

  const waitingReservations =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "En attente"
    ).length;

  const confirmedReservations =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "Confirmée"
    ).length;

  const activeReservations =
    reservations.filter(
      (reservation) =>
        reservation.status !==
          "Annulée" &&
        reservation.status !==
          "Terminée"
    ).length;

  const todayGuests =
    todayReservations
      .filter(
        (reservation) =>
          reservation.status !==
          "Annulée"
      )
      .reduce(
        (sum, reservation) =>
          sum +
          Number(
            reservation.guests || 0
          ),
        0
      );

  // =====================================================
  // FILTER
  // =====================================================

  const filteredReservations =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return reservations.filter(
        (reservation) => {
          const customerName =
            reservation.customer?.name ||
            reservation.customerName ||
            "";

          const phone =
            reservation.customer?.phone ||
            reservation.phone ||
            "";

          const matchesSearch =
            customerName
              .toLowerCase()
              .includes(
                searchText
              ) ||
            phone
              .toLowerCase()
              .includes(
                searchText
              ) ||
            String(
              reservation.tableNumber ||
                ""
            ).includes(
              searchText
            );

          const matchesStatus =
            statusFilter ===
              "Tous" ||
            reservation.status ===
              statusFilter;

          const matchesDate =
            !dateFilter ||
            formatDateInput(
              reservation.date
            ) === dateFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesDate
          );
        }
      );
    }, [
      reservations,
      search,
      statusFilter,
      dateFilter,
    ]);

  // =====================================================
  // FORM
  // =====================================================

  const resetForm = () => {
    setEditingReservation(
      null
    );

    setCustomerMode(
      "existing"
    );

    setSelectedCustomerId(
      ""
    );

    setForm({
      customerName: "",
      phone: "",
      date: todayString,
      time: "19:00",
      guests: 2,
      tableNumber: "",
      status: "En attente",
      notes: "",
    });
  };

  const openNewReservation =
    () => {
      resetForm();
      setShowForm(true);
    };

  const openEditReservation =
    (reservation) => {
      setEditingReservation(
        reservation
      );

      const hasCustomer =
        Boolean(
          reservation.customer?._id
        );

      setCustomerMode(
        hasCustomer
          ? "existing"
          : "new"
      );

      setSelectedCustomerId(
        reservation.customer?._id ||
          ""
      );

      setForm({
        customerName:
          reservation.customer?.name ||
          reservation.customerName ||
          "",

        phone:
          reservation.customer?.phone ||
          reservation.phone ||
          "",

        date:
          formatDateInput(
            reservation.date
          ),

        time:
          reservation.time || "",

        guests:
          Number(
            reservation.guests || 1
          ),

        tableNumber:
          reservation.tableNumber ??
          "",

        status:
          reservation.status ||
          "En attente",

        notes:
          reservation.notes || "",
      });

      setShowForm(true);
    };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleCustomerChange =
    (customerId) => {
      setSelectedCustomerId(
        customerId
      );

      const customer =
        customers.find(
          (item) =>
            item._id ===
            customerId
        );

      if (customer) {
        setForm((current) => ({
          ...current,
          customerName:
            customer.name || "",
          phone:
            customer.phone || "",
        }));
      }
    };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    let customerName =
      form.customerName.trim();

    let customerId = null;

    if (
      customerMode ===
      "existing"
    ) {
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

      customerId =
        customer._id;

      customerName =
        customer.name;
    }

    if (!customerName) {
      alert(
        "Le nom du client est obligatoire."
      );

      return;
    }

    if (
      !form.date ||
      !form.time
    ) {
      alert(
        "La date et l'heure sont obligatoires."
      );

      return;
    }

    if (
      !Number.isInteger(
        Number(form.guests)
      ) ||
      Number(form.guests) < 1
    ) {
      alert(
        "Nombre de personnes invalide."
      );

      return;
    }

    try {
      const isEditing =
        Boolean(
          editingReservation
        );

      const url =
        isEditing
          ? `${RESERVATIONS_API}/${editingReservation._id}`
          : RESERVATIONS_API;

      const response =
        await authFetch(
          url,
          {
            method:
              isEditing
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                customerId,
                customerName,
                phone:
                  form.phone,

                date:
                  form.date,

                time:
                  form.time,

                guests:
                  Number(
                    form.guests
                  ),

                tableNumber:
                  form.tableNumber ===
                  ""
                    ? null
                    : Number(
                        form.tableNumber
                      ),

                status:
                  form.status,

                notes:
                  form.notes,
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
            "Erreur lors de l'enregistrement de la réservation"
        );
      }

      if (isEditing) {
        setReservations(
          (current) =>
            current.map(
              (reservation) =>
                reservation._id ===
                data._id
                  ? data
                  : reservation
            )
        );
      } else {
        setReservations(
          (current) =>
            [
              ...current,
              data,
            ].sort(
              (a, b) => {
                const dateCompare =
                  new Date(
                    a.date
                  ) -
                  new Date(
                    b.date
                  );

                if (
                  dateCompare !==
                  0
                ) {
                  return dateCompare;
                }

                return String(
                  a.time
                ).localeCompare(
                  String(
                    b.time
                  )
                );
              }
            )
        );
      }

      // Refresh customers because a reservation
      // may have created a new customer.
      const customersResponse =
        await authFetch(
          CUSTOMERS_API
        );

      await checkAuthResponse(
        customersResponse
      );

      if (
        customersResponse.ok
      ) {
        const customersData =
          await customersResponse.json();

        setCustomers(
          customersData
        );
      }

      closeForm();
    } catch (err) {
      console.error(err);

      alert(
        err.message ||
          "Impossible d'enregistrer la réservation."
      );
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const updateStatus = async (
    reservationId,
    status
  ) => {
    try {
      const response =
        await authFetch(
          `${RESERVATIONS_API}/${reservationId}/status`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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
            "Erreur lors de la modification du statut"
        );
      }

      setReservations(
        (current) =>
          current.map(
            (reservation) =>
              reservation._id ===
              reservationId
                ? data
                : reservation
          )
      );
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
  // DELETE
  // =====================================================

  const deleteReservation =
    async (
      reservation
    ) => {
      const confirmation =
        window.confirm(
          `Supprimer la réservation de ${
            reservation.customer
              ?.name ||
            reservation.customerName
          } ?`
        );

      if (!confirmation) {
        return;
      }

      try {
        const response =
          await authFetch(
            `${RESERVATIONS_API}/${reservation._id}`,
            {
              method:
                "DELETE",
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
              "Impossible de supprimer la réservation"
          );
        }

        setReservations(
          (current) =>
            current.filter(
              (item) =>
                item._id !==
                reservation._id
            )
        );
      } catch (err) {
        console.error(err);

        alert(
          err.message ||
            "Impossible de supprimer la réservation."
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
          📅
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Chargement des réservations
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
              RÉSERVATIONS CONNECTÉES
            </p>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Réservations 📅
          </h1>

          <p className="text-slate-500 mt-2">
            Gérez les réservations, les clients,
            les tables et le nombre de personnes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition"
          >
            🔄 Actualiser
          </button>

          <button
            onClick={
              openNewReservation
            }
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg"
          >
            + Nouvelle réservation
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-100">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              📅
            </div>

            <p className="text-white/80 text-sm">
              Total réservations
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {reservations.length}
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-cyan-400 to-sky-600 shadow-lg shadow-cyan-100">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              🗓️
            </div>

            <p className="text-white/80 text-sm">
              Aujourd&apos;hui
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {
                todayReservations.length
              }
            </h2>

            <p className="text-xs text-white/70 mt-2">
              {todayGuests} personne(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-100">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-5">
              ⏳
            </div>

            <p className="text-orange-900/70 text-sm">
              En attente
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {
                waitingReservations
              }
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-100">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              ✅
            </div>

            <p className="text-white/80 text-sm">
              Confirmées
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {
                confirmedReservations
              }
            </h2>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-purple-100">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-5">
              🍽️
            </div>

            <p className="text-white/80 text-sm">
              Actives
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {
                activeReservations
              }
            </h2>
          </div>
        </div>
      </div>

      {/* TODAY */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-violet-900 text-white p-6 mb-6">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <p className="text-xs text-violet-300 font-bold tracking-widest">
              PROGRAMME DU JOUR
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {
                todayReservations.length
              }{" "}
              réservation(s) aujourd&apos;hui
            </h2>

            <p className="text-slate-300 mt-2">
              {todayGuests} personne(s) attendue(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {todayReservations.length ===
            0 ? (
              <div className="bg-white/10 rounded-xl px-4 py-3 text-slate-300">
                Aucune réservation aujourd&apos;hui
              </div>
            ) : (
              todayReservations
                .slice(0, 4)
                .map(
                  (
                    reservation
                  ) => (
                    <div
                      key={
                        reservation._id
                      }
                      className="bg-white/10 rounded-xl px-4 py-3"
                    >
                      <p className="font-bold">
                        {
                          reservation.time
                        }
                      </p>

                      <p className="text-xs text-slate-300">
                        {reservation
                          .customer
                          ?.name ||
                          reservation.customerName}
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        </div>
      </div>

      {/* FILTERS */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="grid lg:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
              placeholder="Rechercher client, téléphone ou table..."
              className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(
                e.target.value
              )
            }
            className="border border-slate-200 rounded-xl px-4 py-3 outline-none"
          />

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

            <option value="Confirmée">
              Confirmée
            </option>

            <option value="Installée">
              Installée
            </option>

            <option value="Terminée">
              Terminée
            </option>

            <option value="Annulée">
              Annulée
            </option>
          </select>
        </div>

        {(dateFilter ||
          statusFilter !== "Tous" ||
          search) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setStatusFilter(
                  "Tous"
                );
              }}
              className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            📋 Liste des réservations
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {
              filteredReservations.length
            }{" "}
            réservation(s) affichée(s)
          </p>
        </div>

        {filteredReservations.length ===
        0 ? (
          <div className="py-16 text-center">
            <div className="text-6xl mb-4">
              📅
            </div>

            <h3 className="text-xl font-bold">
              Aucune réservation
            </h3>

            <p className="text-slate-500 mt-2">
              Créez une nouvelle réservation ou modifiez vos filtres.
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
                    Date
                  </th>

                  <th className="text-left px-5 py-4">
                    Heure
                  </th>

                  <th className="text-left px-5 py-4">
                    Personnes
                  </th>

                  <th className="text-left px-5 py-4">
                    Table
                  </th>

                  <th className="text-left px-5 py-4">
                    Statut
                  </th>

                  <th className="text-left px-5 py-4">
                    Notes
                  </th>

                  <th className="text-left px-5 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredReservations.map(
                  (
                    reservation
                  ) => {
                    const customerName =
                      reservation
                        .customer
                        ?.name ||
                      reservation.customerName ||
                      "Client";

                    const phone =
                      reservation
                        .customer
                        ?.phone ||
                      reservation.phone ||
                      "";

                    return (
                      <tr
                        key={
                          reservation._id
                        }
                        className="border-t border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center text-xl">
                              👤
                            </div>

                            <div>
                              <p className="font-bold">
                                {
                                  customerName
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {phone ||
                                  "Téléphone non renseigné"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatDisplayDate(
                            reservation.date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold">
                            🕒{" "}
                            {
                              reservation.time
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-lg">
                            {
                              reservation.guests
                            }
                          </span>{" "}
                          👥
                        </td>

                        <td className="px-5 py-4">
                          {reservation.tableNumber ? (
                            <span className="px-3 py-1.5 rounded-xl bg-orange-100 text-orange-700 font-bold">
                              Table{" "}
                              {
                                reservation.tableNumber
                              }
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Non assignée
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={
                              reservation.status
                            }
                            onChange={(e) =>
                              updateStatus(
                                reservation._id,
                                e.target
                                  .value
                              )
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none ${
                              statusStyles[
                                reservation
                                  .status
                              ] ||
                              "bg-slate-100"
                            }`}
                          >
                            <option value="En attente">
                              En attente
                            </option>

                            <option value="Confirmée">
                              Confirmée
                            </option>

                            <option value="Installée">
                              Installée
                            </option>

                            <option value="Terminée">
                              Terminée
                            </option>

                            <option value="Annulée">
                              Annulée
                            </option>
                          </select>
                        </td>

                        <td className="px-5 py-4 max-w-[220px]">
                          <p className="truncate text-slate-500">
                            {reservation.notes ||
                              "Aucune note"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                openEditReservation(
                                  reservation
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                            >
                              ✏️ Modifier
                            </button>

                            <button
                              onClick={() =>
                                deleteReservation(
                                  reservation
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                            >
                              🗑
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

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">
            <div className="sticky top-0 z-20 bg-white p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-violet-600">
                  {editingReservation
                    ? "MODIFICATION"
                    : "NOUVELLE RÉSERVATION"}
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  {editingReservation
                    ? "Modifier la réservation ✏️"
                    : "Créer une réservation 📅"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="p-6"
            >
              <div className="grid lg:grid-cols-2 gap-6">
                {/* CUSTOMER */}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold mb-4">
                      👤 Client
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode(
                            "existing"
                          );

                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              customerName:
                                "",
                              phone:
                                "",
                            })
                          );
                        }}
                        className={`p-3 rounded-xl border font-semibold ${
                          customerMode ===
                          "existing"
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200"
                        }`}
                      >
                        Client existant
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode(
                            "new"
                          );

                          setSelectedCustomerId(
                            ""
                          );

                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              customerName:
                                "",
                              phone:
                                "",
                            })
                          );
                        }}
                        className={`p-3 rounded-xl border font-semibold ${
                          customerMode ===
                          "new"
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200"
                        }`}
                      >
                        Nouveau client
                      </button>
                    </div>

                    {customerMode ===
                    "existing" ? (
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Sélectionner un client
                        </label>

                        <select
                          value={
                            selectedCustomerId
                          }
                          onChange={(
                            e
                          ) =>
                            handleCustomerChange(
                              e.target
                                .value
                            )
                          }
                          required
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-violet-200"
                        >
                          <option value="">
                            Choisir un client
                          </option>

                          {customers.map(
                            (
                              customer
                            ) => (
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
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-semibold mb-2">
                            Nom du client *
                          </label>

                          <input
                            type="text"
                            value={
                              form.customerName
                            }
                            onChange={(
                              e
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  customerName:
                                    e
                                      .target
                                      .value,
                                })
                              )
                            }
                            required
                            placeholder="Ex : Ahmed Benali"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-semibold mb-2">
                            Téléphone
                          </label>

                          <input
                            type="text"
                            value={
                              form.phone
                            }
                            onChange={(
                              e
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  phone:
                                    e
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Ex : 0612345678"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                          />
                        </div>
                      </>
                    )}

                    {customerMode ===
                      "existing" &&
                      selectedCustomerId && (
                        <div className="mt-4 bg-violet-50 border border-violet-100 rounded-2xl p-4">
                          <p className="font-bold">
                            {
                              form.customerName
                            }
                          </p>

                          <p className="text-sm text-slate-500 mt-1">
                            {form.phone ||
                              "Téléphone non renseigné"}
                          </p>
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Notes
                    </label>

                    <textarea
                      rows="5"
                      value={
                        form.notes
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,
                            notes:
                              e.target
                                .value,
                          })
                        )
                      }
                      placeholder="Ex : anniversaire, préférence près de la fenêtre..."
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200 resize-none"
                    />
                  </div>
                </div>

                {/* RESERVATION */}

                <div>
                  <h3 className="text-lg font-bold mb-4">
                    📅 Détails de la réservation
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Date *
                      </label>

                      <input
                        type="date"
                        value={
                          form.date
                        }
                        onChange={(
                          e
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              date:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Heure *
                      </label>

                      <input
                        type="time"
                        value={
                          form.time
                        }
                        onChange={(
                          e
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              time:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Nombre de personnes *
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          form.guests
                        }
                        onChange={(
                          e
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              guests:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Numéro de table
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          form.tableNumber
                        }
                        onChange={(
                          e
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              tableNumber:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Ex : 5"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-2">
                      Statut
                    </label>

                    <select
                      value={
                        form.status
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,
                            status:
                              e.target
                                .value,
                          })
                        )
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="En attente">
                        En attente
                      </option>

                      <option value="Confirmée">
                        Confirmée
                      </option>

                      <option value="Installée">
                        Installée
                      </option>

                      <option value="Terminée">
                        Terminée
                      </option>

                      <option value="Annulée">
                        Annulée
                      </option>
                    </select>
                  </div>

                  <div className="mt-6 bg-slate-900 text-white rounded-2xl p-5">
                    <p className="text-xs text-slate-300">
                      Résumé
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-xs text-slate-300">
                          Date
                        </p>

                        <p className="font-bold mt-1">
                          {form.date
                            ? new Date(
                                `${form.date}T00:00:00`
                              ).toLocaleDateString(
                                "fr-FR"
                              )
                            : "-"}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-xs text-slate-300">
                          Heure
                        </p>

                        <p className="font-bold mt-1">
                          {form.time ||
                            "-"}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-xs text-slate-300">
                          Personnes
                        </p>

                        <p className="font-bold mt-1">
                          {form.guests ||
                            0}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-xs text-slate-300">
                          Table
                        </p>

                        <p className="font-bold mt-1">
                          {form.tableNumber ||
                            "Non assignée"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-7 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg"
                >
                  {editingReservation
                    ? "💾 Enregistrer"
                    : "✅ Créer la réservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reservations;