"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [guards, setGuards] = useState<any[]>([]);
  const [selectedGuard, setSelectedGuard] = useState("");

  useEffect(() => {
    loadGuards();
  }, []);

  const loadGuards = async () => {
    const { data, error } = await supabase
      .from("guards")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load guards", error);
      return;
    }

    setGuards(data || []);
  };

  const checkIn = async () => {
    if (!selectedGuard) {
      alert("Please select a guard");
      return;
    }

    const { error } = await supabase.from("attendance").insert([
      {
        guard_id: selectedGuard,
        check_in: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Check-in failed", error);
      alert("Check-in failed");
      return;
    }

    alert("Checked in successfully");
  };

  const checkOut = async () => {
    if (!selectedGuard) {
      alert("Please select a guard");
      return;
    }

    const { data, error: findError } = await supabase
      .from("attendance")
      .select("*")
      .eq("guard_id", selectedGuard)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    if (findError) {
      console.error("Failed to find open shift", findError);
      alert("Check-out failed");
      return;
    }

    if (!data || data.length === 0) {
      alert("No open check-in found for this guard");
      return;
    }

    const openShift = data[0];

    const { error: updateError } = await supabase
      .from("attendance")
      .update({
        check_out: new Date().toISOString(),
      })
      .eq("id", openShift.id);

    if (updateError) {
      console.error("Check-out failed", updateError);
      alert("Check-out failed");
      return;
    }

    alert("Checked out successfully");
  };

  return (
    <main style={{ padding: 40, fontFamily: "Arial", maxWidth: 500 }}>
      <h1>Naos Attendance MVP</h1>
      <p>Security guard time and attendance system</p>

      <div style={{ marginTop: 30 }}>
        <label
          htmlFor="guard"
          style={{ display: "block", marginBottom: 8 }}
        >
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
            <option key={guard.id} value={guard.id}>
              {guard.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={checkIn}
            style={{
              padding: "15px 30px",
              fontSize: 16,
              background: "#2563eb",
              color: "white",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Check In
          </button>

          <button
            onClick={checkOut}
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
            Selected guard ID: <strong>{selectedGuard}</strong>
          </p>
        )}
      </div>
    </main>
  );
}