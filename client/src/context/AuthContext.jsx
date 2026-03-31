import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("adc_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (email, password, mode = "login", name = "") => {
    const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
    const payload = mode === "register" ? { name, email, password } : { email, password };

    const { data } = await api.post(endpoint, payload);
    localStorage.setItem("adc_token", data.token);
    localStorage.setItem("adc_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("adc_token");
    localStorage.removeItem("adc_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
