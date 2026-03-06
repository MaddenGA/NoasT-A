"use client";

import { useState } from "react";

const guards = ["Guard 1", "Guard 2", "Guard 3"];

export default function Home() {
  const [selectedGuard, setSelectedGuard] = useState("");

  return (
    <main style={{ padding: 40, fontFamily: "Arial", maxWidth: 500 }}>
      <h1>Naos Attendance MVP</h1>
      <p>Security guard time and attendance system</p>

      <div style={{ marginTop: 30 }}>
        <label htmlFor="guard" style={{ display: "block", marginBottom: 8 }}>
          Select Guard
        </label>

        <select
          id="guard"
          value={selectedGuard}
          onChange={(e) => setSelectedGuard(e.target.value)}
          style={{
            padding: "12px",
            fontSize: 16,
            width: "100%",
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 20,
          }}
        >
          <option value="">Choose a guard</option>
          {guards.map((guard) => (
            <option key={guard} value={guard}>
              {guard}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          style={{
            padding: "15px 30px",
            fontSize: 16,
            background: "#1e40af",
            color: "white",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Check In
        </button>

        <button
          style={{
            padding: "15px 30px",
            fontSize: 16,
            background: "#374151",
            color: "white",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Check Out
        </button>
      </div>

      {selectedGuard && (
        <p style={{ marginTop: 20 }}>
          Selected guard: <strong>{selectedGuard}</strong>
        </p>
      )}
    </main>
  );
}