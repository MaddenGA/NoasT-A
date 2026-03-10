"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guard = {
  id: string;
  name: string;
};

type AttendanceRecord = {
  id: string;
  guard_id: string;
  check_in: string;
  check_out: string | null;
};

export default function Home() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [selectedGuard, setSelectedGuard] = useState("");
  const [selectedGuardStatus, setSelectedGuardStatus] =
    useState<AttendanceRecord | null>(null);
  const [guardsOnSite, setGuardsOnSite] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadGuards();
    loadGuardsOnSite();
  }, []);

  useEffect(() => {
    if (selectedGuard) {
      loadSelectedGuardStatus(selectedGuard);
    } else {
      setSelectedGuardStatus(null);
    }
  }, [selectedGuard]);

  const loadGuards = async () => {
    const { data, error } = await supabase
      .from("guards")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load guards", error);
      return;
    }

    setGuards(data || []);
  };

  const loadSelectedGuardStatus = async (guardId: string) => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("guard_id", guardId)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Failed to load guard status", error);
      return;
    }

    if (data && data.length > 0) {
      setSelectedGuardStatus(data[0]);
    } else {
      setSelectedGuardStatus(null);
    }
  };

  const loadGuardsOnSite = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .is("check_out", null)
      .order("check_in", { ascending: false });

    if (error) {
      console.error("Failed to load guards on site", error);
      return;
    }

    setGuardsOnSite(data || []);
  };

  const getGuardName = (guardId: string) => {
    const guard = guards.find((g) => g.id === guardId);
    return guard ? guard.name : guardId;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const checkIn = async () => {
    if (!selectedGuard) {
      alert("Please select a guard");
      return;
    }

    const { data: existingShift } = await supabase
      .from("attendance")
      .select("*")
      .eq("guard_id", selectedGuard)
      .is("check_out", null)
      .limit(1);

    if (existingShift && existingShift.length > 0) {
      alert("Guard is already checked in. Please check out first.");
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
    loadSelectedGuardStatus(selectedGuard);
    loadGuardsOnSite();
  };

  const checkOut = async () => {
    if (!selectedGuard) {
      alert("Please select a guard");
      return;
    }

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("guard_id", selectedGuard)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      alert("No open check-in found for this guard");
      return;
    }

    const openShift = data[0];

    const { error } = await supabase
      .from("attendance")
      .update({
        check_out: new Date().toISOString(),
      })
      .eq("id", openShift.id);

    if (error) {
      console.error("Check-out failed", error);
      alert("Check-out failed");
      return;
    }

    alert("Checked out successfully");
    loadSelectedGuardStatus(selectedGuard);
    loadGuardsOnSite();
  };

  return (
    <main style={{ padding: 40, fontFamily: "Arial", maxWidth: 700 }}>
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

        {selectedGuard && (
          <div
            style={{
              marginBottom: 20,
              padding: 15,
              borderRadius: 8,
              background: "#f3f4f6",
            }}
          >
            <strong>Status:</strong>{" "}
            {selectedGuardStatus ? (
              <>
                Checked in at{" "}
                {formatDateTime(selectedGuardStatus.check_in)}
              </>
            ) : (
              "Not currently checked in"
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={checkIn}
            disabled={!!selectedGuardStatus}
            style={{
              padding: "15px 30px",
              fontSize: 16,
              background: selectedGuardStatus ? "#9ca3af" : "#2563eb",
              color: "white",
              borderRadius: 8,
              border: "none",
              cursor: selectedGuardStatus ? "not-allowed" : "pointer",
              opacity: selectedGuardStatus ? 0.7 : 1,
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
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Currently On Site</h2>

        {guardsOnSite.length === 0 ? (
          <p>No guards currently checked in.</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {guardsOnSite.map((record) => (
              <li key={record.id} style={{ marginBottom: 8 }}>
                <strong>{getGuardName(record.guard_id)}</strong> — checked in at{" "}
                {formatDateTime(record.check_in)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}