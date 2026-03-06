"use client";

import { useState } from "react";

const ADMIN_PIN = "1234";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [guards, setGuards] = useState<string[]>(["John", "Peter", "Musa"]);
  const [newGuard, setNewGuard] = useState("");

  function login() {
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
    } else {
      alert("Incorrect PIN");
    }
  }

  function addGuard() {
    const name = newGuard.trim();
    if (!name) return;
    setGuards([...guards, name]);
    setNewGuard("");
  }

  function removeGuard(name: string) {
    setGuards(guards.filter((g) => g !== name));
  }

  if (!authenticated) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial" }}>
        <h1>Admin Login</h1>

        <input
          type="password"
          placeholder="Enter admin PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />

        <div style={{ marginTop: 20 }}>
          <button onClick={login}>Login</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Admin Panel</h1>

      <h3>Add Guard</h3>

      <input
        placeholder="Guard name"
        value={newGuard}
        onChange={(e) => setNewGuard(e.target.value)}
        style={{ padding: 10 }}
      />

      <button onClick={addGuard} style={{ marginLeft: 10 }}>
        Add
      </button>

      <h3 style={{ marginTop: 30 }}>Existing Guards</h3>

      {guards.map((g) => (
        <div key={g} style={{ marginTop: 10 }}>
          {g}
          <button onClick={() => removeGuard(g)} style={{ marginLeft: 10 }}>
            Remove
          </button>
        </div>
      ))}
    </main>
  );
}