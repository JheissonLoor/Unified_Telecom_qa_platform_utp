import { useState } from "react";
import { api, session } from "./api";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import type { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  async function login(username: string, password: string) {
    const result = await api.login(username, password);
    session.token = result.access_token;
    setUser(result.user);
  }

  function logout() {
    session.token = null;
    setUser(null);
  }

  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={login} />;
}
