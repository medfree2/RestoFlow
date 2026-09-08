import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import Commandes from "./pages/Commandes";
import Reservations from "./pages/Reservations";
import Stock from "./pages/Stock";
import Clients from "./pages/Clients";
import Rapports from "./pages/Rapports";
import Login from "./pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// =====================================================
// MAIN LAYOUT
// =====================================================

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // =====================================================
  // NAVIGATION
  // =====================================================

  const navItems = [
    {
      name: "Centre de pilotage",
      path: "/",
      icon: "🎯",
    },
    {
      name: "Menu",
      path: "/menu",
      icon: "🍽️",
    },
    {
      name: "Commandes",
      path: "/commandes",
      icon: "🧾",
    },
    {
      name: "Réservations",
      path: "/reservations",
      icon: "📅",
    },
    {
      name: "Stock",
      path: "/stock",
      icon: "📦",
    },
    {
      name: "Clients",
      path: "/clients",
      icon: "👥",
    },
    {
      name: "Rapports",
      path: "/rapports",
      icon: "📈",
    },
  ];

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // ROLE LABEL
  // =====================================================

  const getRoleLabel = (role) => {
    if (role === "admin") {
      return "Administrateur";
    }

    if (role === "manager") {
      return "Manager";
    }

    return "Employé";
  };

  // =====================================================
  // ROLE STYLE
  // =====================================================

  const getRoleStyle = (role) => {
    if (role === "admin") {
      return "bg-orange-500/15 text-orange-300 border-orange-400/20";
    }

    if (role === "manager") {
      return "bg-violet-500/15 text-violet-300 border-violet-400/20";
    }

    return "bg-blue-500/15 text-blue-300 border-blue-400/20";
  };

  // =====================================================
  // LAYOUT
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ================================================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ================================================= */}

      <aside className="hidden lg:flex w-[270px] h-screen fixed left-0 top-0 bg-slate-950 text-white flex-col z-40 overflow-hidden">
        {/* LOGO */}

        <div className="flex-shrink-0 px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
              🍴
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">
                RestoFlow
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                Gestion intelligente
              </p>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* NAVIGATION */}
        {/* ================================================= */}

        <nav className="flex-1 min-h-0 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[11px] font-bold tracking-[0.18em] text-slate-500">
            NAVIGATION
          </p>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-pink-950/20"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`
              }
            >
              <span className="text-xl flex-shrink-0">
                {item.icon}
              </span>

              <span className="font-semibold text-sm truncate">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* ================================================= */}
        {/* USER AREA */}
        {/* ================================================= */}

        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-slate-950">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            {/* USER */}

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex-shrink-0 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-lg font-bold">
                {user?.name
                  ? user.name
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {user?.name ||
                    "Utilisateur"}
                </p>

                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            {/* ROLE */}

            <div className="mt-3">
              <span
                className={`inline-flex px-3 py-1 rounded-full border text-[11px] font-semibold ${getRoleStyle(
                  user?.role
                )}`}
              >
                {getRoleLabel(
                  user?.role
                )}
              </span>
            </div>

            <div className="h-px bg-white/10 my-3" />

            {/* SYSTEM STATUS */}

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <p className="text-xs font-semibold text-emerald-300">
                Système actif
              </p>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Données & API connectées
            </p>

            {/* LOGOUT */}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-300 text-sm font-semibold hover:bg-rose-500/20 hover:text-rose-200 transition"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================= */}
      {/* MAIN APPLICATION */}
      {/* ================================================= */}

      <div className="flex-1 lg:ml-[270px] min-w-0">
        {/* ================================================= */}
        {/* MOBILE HEADER */}
        {/* ================================================= */}

        <header className="lg:hidden sticky top-0 z-30 bg-slate-950 text-white border-b border-white/10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                  🍴
                </div>

                <div className="min-w-0">
                  <p className="font-bold">
                    RestoFlow
                  </p>

                  <p className="text-xs text-slate-400 truncate">
                    {user?.name ||
                      "Utilisateur"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/10 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition"
              >
                🚪 Quitter
              </button>
            </div>

            {/* MOBILE NAVIGATION */}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {navItems.map(
                (item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={
                      item.path ===
                      "/"
                    }
                    className={({
                      isActive,
                    }) =>
                      `flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                          : "bg-white/10 text-slate-300 hover:bg-white/15"
                      }`
                    }
                  >
                    {item.icon}{" "}
                    {item.name}
                  </NavLink>
                )
              )}
            </div>
          </div>
        </header>

        {/* ================================================= */}
        {/* PAGE CONTENT */}
        {/* ================================================= */}

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// =====================================================
// APP
// =====================================================

function App() {
  return (
    <Routes>
      {/* ================================================= */}
      {/* PUBLIC */}
      {/* ================================================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* ================================================= */}
      {/* PROTECTED APPLICATION */}
      {/* ================================================= */}

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* CENTRE DE PILOTAGE */}

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* MENU */}

        <Route
          path="/menu"
          element={<Menu />}
        />

        {/* ORDERS */}

        <Route
          path="/commandes"
          element={<Commandes />}
        />

        {/* RESERVATIONS */}

        <Route
          path="/reservations"
          element={<Reservations />}
        />

        {/* STOCK */}

        <Route
          path="/stock"
          element={<Stock />}
        />

        {/* CUSTOMERS */}

        <Route
          path="/clients"
          element={<Clients />}
        />

        {/* REPORTS */}

        <Route
          path="/rapports"
          element={<Rapports />}
        />
      </Route>

      {/* ================================================= */}
      {/* 404 */}
      {/* ================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

// =====================================================
// EXPORT
// =====================================================

export default App;