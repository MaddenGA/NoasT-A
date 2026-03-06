"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PIN = "1234";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [guards, setGuards] = useState<string[]>([]);
  const [newGuard, setNewGuard] = useState("");

  useEffect(() => {
    if (authenticated) {
      loadGuards();
    }
  }, [authenticated]);

  async function loadGuards() {
    const { data, error } = await supabase
      .from("guards")
      .select("name")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading guards:", error);
      return;
    }

    if (data) {
      setGuards(data.map((g) => g.name));
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

    const { error } = await supabase.from("guards").insert([{ name }]);

    if (error) {
      console.error("Error adding guard:", error);
      alert("Could not add guard. The name may already exist.");
      return;
    }

    setNewGuard("");
    loadGuards();
  }

  async function removeGuard(name: string) {
    const { error } = await supabase
      .from("guards")
      .update({ active: false })
      .eq("name", name);

    if (error) {
      console.error("Error removing guard:", error);
      alert("Could not remove guard.");
      return;
    }

    loadGuards();
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