"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PIN = "1234";

export default function AdminPage() {

  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [guards, setGuards] = useState<any[]>([]);
  const [newGuard, setNewGuard] = useState("");

  useEffect(() => {
    if (authenticated) {
      loadGuards();
    }
  }, [authenticated]);

  async function loadGuards() {
    const { data, error } = await supabase
      .from("guards")
      .select("*");

    if (!error && data) {
      setGuards(data);
    }
  }

  function login() {
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
    } else {
      alert("Incorrect PIN");
    }
  }

  async function addGuard() {
    const name = newGuard.trim();
    if (!name) return;

    const { error } = await supabase
      .from("guards")
      .insert([{ name }]);

    if (error) {
      alert(error.message);
      return;
    }

    setNewGuard("");
    loadGuards();
  }

  async function removeGuard(id: number) {
    await supabase
      .from("guards")
      .delete()
      .eq("id", id);

    loadGuards();
  }

  if (!authenticated) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Admin Login</h1>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
        />
        <button onClick={login}>Login</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Admin Panel</h1>

      <h3>Add Guard</h3>

      <input
        value={newGuard}
        onChange={(e) => setNewGuard(e.target.value)}
        placeholder="Guard name"
      />

      <button onClick={addGuard}>Add</button>

      <h3 style={{ marginTop: 30 }}>Existing Guards</h3>

      {guards.map((g) => (
        <div key={g.id} style={{ marginTop: 10 }}>
          {g.name}

          <button
            onClick={() => removeGuard(g.id)}
            style={{ marginLeft: 10 }}
          >
            Remove
          </button>
        </div>
      ))}
    </main>
  );
}