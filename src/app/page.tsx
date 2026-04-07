"use client";

import { useEffect, useMemo, useState } from "react";
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

const SA_TIMEZONE = "Africa/Johannesburg";

export default function Home() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [selectedGuard, setSelectedGuard] = useState("");
  const [selectedGuardStatus, setSelectedGuardStatus] =
    useState<AttendanceRecord | null>(null);
  const [guardsOnSite, setGuardsOnSite] = useState<AttendanceRecord[]>([]);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadGuards();
    loadGuardsOnSite();
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedGuard) {
      loadSelectedGuardStatus(selectedGuard);
    } else {
      setSelectedGuardStatus(null);
    }
  }, [selectedGuard]);

  async function loadGuards() {
    const { data, error } = await supabase
      .from("guards")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error) setGuards(data || []);
  }

  async function loadSelectedGuardStatus(guardId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("guard_id", guardId)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    if (!error) {
      setSelectedGuardStatus(data && data.length > 0 ? data[0] : null);
    }
  }

  async function loadGuardsOnSite() {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .is("check_out", null)
      .order("check_in", { ascending: false });

    if (!error) setGuardsOnSite(data || []);
  }

  function getGuardName(guardId: string) {
    return guards.find((g) => g.id === guardId)?.name || "Unknown Guard";
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("en-ZA", {
      timeZone: SA_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTimeOnly(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-ZA", {
      timeZone: SA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCurrentDate(date: Date) {
    return date.toLocaleDateString("en-ZA", {
      timeZone: SA_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatCurrentTime(date: Date) {
    return date.toLocaleTimeString("en-ZA", {
      timeZone: SA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getShiftMinutes(checkIn: string) {
    const start = new Date(checkIn).getTime();
    return Math.max(0, Math.floor((now.getTime() - start) / 60000));
  }

  function formatMinutesAsHours(minutes: number) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  }

  const onSiteWithDuration = useMemo(() => {
    return guardsOnSite.map((record) => ({
      ...record,
      guardName: getGuardName(record.guard_id),
      minutesOnShift: getShiftMinutes(record.check_in),
    }));
  }, [guardsOnSite, guards, now]);

  const maxMinutes = Math.max(
    ...onSiteWithDuration.map((g) => g.minutesOnShift),
    1
  );

  async function checkIn() {
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
      alert("Guard is already checked in.");
      return;
    }

    const { error } = await supabase.from("attendance").insert([
      {
        guard_id: selectedGuard,
        check_in: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Check-in failed");
      return;
    }

    await loadSelectedGuardStatus(selectedGuard);
    await loadGuardsOnSite();
  }

  async function checkOut() {
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
      alert("No open shift found.");
      return;
    }

    const { error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", data[0].id);

    if (error) {
      alert("Check-out failed");
      return;
    }

    await loadSelectedGuardStatus(selectedGuard);
    await loadGuardsOnSite();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f5f9",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#111827",
      }}
    >
      <section
        style={{
          background:
            "linear-gradient(135deg, #066b6d 0%, #0b8d87 45%, #0f766e 100%)",
          color: "white",
          padding: "40px 24px 120px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#86efac",
                  display: "inline-block",
                }}
              />
              Security Operations Dashboard
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 48,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: -1.2,
              }}
            >
              Naos Attendance MVP
            </h1>

            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                maxWidth: 650,
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Live workforce attendance monitoring with real-time check-in
              status, shift visibility, and an operational view of who is
              currently on site.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 8 }}>
              Today
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {mounted ? formatCurrentDate(now) : "Loading date..."}
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              {mounted ? formatCurrentTime(now) : "--:--:--"}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>On Site Now</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {guardsOnSite.length}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Total Guards</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {guards.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          maxWidth: 1200,
          margin: "-80px auto 0 auto",
          padding: "0 24px 40px 24px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 28,
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
            border: "1px solid #e5e7eb",
            padding: 28,
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 28 }}>Guard Check-In Console</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 24,
            }}
          >
            <div>
              <label
                htmlFor="guard"
                style={{
                  display: "block",
                  marginBottom: 10,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Select Guard
              </label>

              <select
                id="guard"
                value={selectedGuard}
                onChange={(e) => setSelectedGuard(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  fontSize: 18,
                  borderRadius: 18,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
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

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={checkIn}
                  disabled={!selectedGuard || !!selectedGuardStatus}
                  style={{
                    padding: "16px 28px",
                    fontSize: 16,
                    fontWeight: 700,
                    background:
                      !selectedGuard || !!selectedGuardStatus
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #0b8d87 0%, #0f766e 100%)",
                    color: "white",
                    borderRadius: 16,
                    border: "none",
                    minWidth: 150,
                  }}
                >
                  Check In
                </button>

                <button
                  onClick={checkOut}
                  disabled={!selectedGuard || !selectedGuardStatus}
                  style={{
                    padding: "16px 28px",
                    fontSize: 16,
                    fontWeight: 700,
                    background:
                      !selectedGuard || !selectedGuardStatus
                        ? "#cbd5e1"
                        : "#1f2937",
                    color: "white",
                    borderRadius: 16,
                    border: "none",
                    minWidth: 150,
                  }}
                >
                  Check Out
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 22,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f766e",
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Current Shift Summary
              </div>

              {selectedGuard ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
                    {getGuardName(selectedGuard)}
                  </div>

                  {selectedGuardStatus ? (
                    <>
                      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                        Checked in at
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
                        {formatDateTime(selectedGuardStatus.check_in)}
                      </div>

                      <div
                        style={{
                          display: "inline-flex",
                          padding: "10px 14px",
                          borderRadius: 999,
                          background: "#dcfce7",
                          color: "#166534",
                          fontWeight: 700,
                        }}
                      >
                        On shift for{" "}
                        {formatMinutesAsHours(
                          getShiftMinutes(selectedGuardStatus.check_in)
                        )}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background: "#eef2ff",
                        color: "#4338ca",
                        fontWeight: 600,
                      }}
                    >
                      Ready to start a new shift for this guard.
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "#eef2ff",
                    color: "#4338ca",
                    fontWeight: 600,
                  }}
                >
                  Select a guard to view live shift status.
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 28,
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e5e7eb",
              padding: 28,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 28 }}>Currently On Site</h2>

            {onSiteWithDuration.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: "#f8fafc",
                  color: "#6b7280",
                  fontSize: 15,
                  border: "1px solid #e5e7eb",
                }}
              >
                No guards are currently checked in.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {onSiteWithDuration.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.9fr 0.8fr",
                      gap: 16,
                      alignItems: "center",
                      padding: 18,
                      borderRadius: 20,
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
                        {record.guardName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        Checked in
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {formatTimeOnly(record.check_in)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        Time on shift
                      </div>
                      <div style={{ fontWeight: 800, color: "#0f766e" }}>
                        {formatMinutesAsHours(record.minutesOnShift)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 28,
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e5e7eb",
              padding: 28,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 28 }}>
              Time on Shift
            </h2>

            {onSiteWithDuration.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: "#f8fafc",
                  color: "#6b7280",
                  fontSize: 15,
                  border: "1px solid #e5e7eb",
                }}
              >
                No active shift data to display.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                {onSiteWithDuration.map((record) => {
                  const widthPct = (record.minutesOnShift / maxMinutes) * 100;

                  return (
                    <div key={record.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 14,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{record.guardName}</span>
                        <span style={{ color: "#0f766e", fontWeight: 800 }}>
                          {formatMinutesAsHours(record.minutesOnShift)}
                        </span>
                      </div>

                      <div
                        style={{
                          height: 14,
                          width: "100%",
                          background: "#e5e7eb",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${widthPct}%`,
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, #34d399 0%, #0f766e 100%)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}