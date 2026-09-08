import { useState } from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();

  const {
    login,
    isAuthenticated,
    loading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  // =====================================================
  // ALREADY CONNECTED
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">
            🍴
          </div>

          <p className="text-slate-400">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Veuillez saisir votre identifiant et votre mot de passe."
      );

      return;
    }

    try {
      setSubmitting(true);

      await login(
        email.trim(),
        password
      );

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.message ||
          "Impossible de se connecter."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ================================================= */}
      {/* LEFT SIDE */}
      {/* ================================================= */}

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* BACKGROUND */}

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950" />

        {/* DECORATION */}

        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />

        {/* CONTENT */}

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-3xl shadow-xl">
              🍴
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                RestoFlow
              </h1>

              <p className="text-slate-400 text-sm">
                Gestion intelligente de restaurant
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-orange-300 text-sm mb-7">
              <span>
                ✨
              </span>

              Gestion & Intelligence Artificielle
            </div>

            <h2 className="text-5xl font-bold text-white leading-tight">
              Gérez votre restaurant

              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                intelligemment.
              </span>
            </h2>

            <p className="text-slate-400 text-lg mt-6 leading-relaxed">
              Commandes, réservations, clients,
              stock, ventes et assistance par
              intelligence artificielle dans une
              seule application.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <Feature
                icon="📊"
                title="Ventes"
                text="Analyse des performances"
              />

              <Feature
                icon="🧾"
                title="Commandes"
                text="Gestion en temps réel"
              />

              <Feature
                icon="📅"
                title="Réservations"
                text="Organisation simplifiée"
              />

              <Feature
                icon="✨"
                title="IA"
                text="Recommandations intelligentes"
              />
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Restaurant Management System
          </p>
        </div>
      </div>

      {/* ================================================= */}
      {/* RIGHT SIDE */}
      {/* ================================================= */}

      <div className="w-full lg:w-1/2 bg-slate-50 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* MOBILE LOGO */}

          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">
              🍴
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                RestoFlow
              </h1>

              <p className="text-xs text-slate-500">
                Restaurant Management
              </p>
            </div>
          </div>

          {/* HEADER */}

          <div className="mb-8">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-xl mb-5">
              🔐
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Connexion
            </h2>

            <p className="text-slate-500 mt-2">
              Connectez-vous pour accéder à la
              gestion du restaurant.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 px-4 py-3.5 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
              <span>
                ⚠️
              </span>

              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            {/* IDENTIFIANT */}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Identifiant
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  👤
                </span>

                <input
                  type="text"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  🔑
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-16 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {showPassword
                    ? "Cacher"
                    : "Voir"}
                </button>
              </div>
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold shadow-lg shadow-orange-500/20 transition hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting
                ? "Connexion..."
                : "Se connecter"}
            </button>
          </form>

          {/* LOGIN INFO */}

          <div className="mt-5 p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <p className="text-xs font-bold text-orange-700">
              Compte administrateur
            </p>

            <div className="mt-2 text-sm text-slate-600">
              <p>
                Identifiant :{" "}
                <strong>
                  admin
                </strong>
              </p>

              <p className="mt-1">
                Mot de passe :{" "}
                <strong>
                  admin
                </strong>
              </p>
            </div>
          </div>

          {/* SECURITY */}

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>
              🔒
            </span>

            <span>
              Accès sécurisé à votre espace de
              gestion
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// FEATURE COMPONENT
// =====================================================

function Feature({
  icon,
  title,
  text,
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="text-2xl mb-3">
        {icon}
      </div>

      <p className="text-white font-semibold">
        {title}
      </p>

      <p className="text-slate-500 text-xs mt-1">
        {text}
      </p>
    </div>
  );
}

export default Login;