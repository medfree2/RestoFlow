import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function Layout() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] flex">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center">
          <h2 className="font-bold text-xl">Restaurant Management</h2>

          <div className="ml-auto flex items-center gap-3">
            <span>🔔</span>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              👨
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;