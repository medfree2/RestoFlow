import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
      isActive
        ? "bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg"
        : "hover:bg-white/10"
    }`;

  return (
    <aside className="hidden lg:flex w-[242px] min-h-screen bg-[#0f1b2d] text-white flex-col">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl">
            🍴
          </div>

          <div>
            <h1 className="text-xl font-bold">Restaurant</h1>
            <p className="text-sm text-slate-300">Gestion Intelligente</p>
          </div>
        </div>
      </div>

      <nav className="px-3 mt-4 space-y-2">
        <NavLink to="/dashboard" className={linkClass}>
          <span>🏠</span>
          <span>Tableau de bord</span>
        </NavLink>

        <NavLink to="/menu" className={linkClass}>
          <span>🍔</span>
          <span>Menu</span>
        </NavLink>

        <NavLink to="/commandes" className={linkClass}>
          <span>🧾</span>
          <span>Commandes</span>
        </NavLink>

        <NavLink to="/stock" className={linkClass}>
          <span>📦</span>
          <span>Stock</span>
        </NavLink>

        <NavLink to="/clients" className={linkClass}>
          <span>👥</span>
          <span>Clients</span>
        </NavLink>

        <NavLink to="/rapports" className={linkClass}>
          <span>📊</span>
          <span>Rapports</span>
        </NavLink>
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-black p-5">
          <p className="text-xl font-bold">
            Une meilleure gestion pour un restaurant plus performant !
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;