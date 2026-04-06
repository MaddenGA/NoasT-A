"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guard = {
  id: string;
  name: string;
};

type Attendance = {
  id: string;
  guard_id: string;
  check_in: string;
  check_out: string | null;
};

type ViewMode = "day" | "week" | "month";

const SA_TIMEZONE = "Africa/Johannesburg";

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return startOfDay(date);
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getDateRange(mode: ViewMode, date: Date) {
  if (mode === "day") return { start: startOfDay(date), end: endOfDay(date) };
  if (mode === "week") return { start: startOfWeek(date), end: endOfWeek(date) };
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SA_TIMEZONE,
  });
}

function formatRangeLabel(mode: ViewMode, start: Date, end: Date) {
  if (mode === "day") {
    return formatDateLong(start);
  }

  if (mode === "week") {
    return `${start.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: SA_TIMEZONE,
    })} - ${end.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: SA_TIMEZONE,
    })}`;
  }

  return start.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: SA_TIMEZONE,
  });
}

function formatMinutesAsHours(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

function formatDateTimeSA(dateString: string) {
  return new Date(dateString).toLocaleString("en-ZA", {
    timeZone: SA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  const range = useMemo(() => getDateRange(view, selectedDate), [view, selectedDate]);
  const days = useMemo(() => eachDay(range.start, range.end), [range]);

  useEffect(() => {
    setMounted(true);
    loadGuards();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [range.start.getTime(), range.end.getTime()]);

  async function loadGuards() {
    const { data, error } = await supabase.from("guards").select("*").order("name");

    if (error) {
      console.error("Failed to load guards", error);
      return;
    }

    setGuards(data || []);
  }

  async function loadAttendance() {
    setLoading(true);

    const res = await fetch("/api/attendance");
    const data = await res.json();

    if (Array.isArray(data)) {
      const filtered = data.filter((r: Attendance) => {
        const checkIn = new Date(r.check_in);
        return checkIn >= range.start && checkIn <= range.end;
      });
      setRecords(filtered);
    } else {
      console.error("Attendance API error:", data);
      setRecords([]);
    }

    setLoading(false);
  }

  const guardNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    guards.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [guards]);

  function getRecordMinutes(record: Attendance) {
    const start = new Date(record.check_in).getTime();

    if (record.check_out) {
      const end = new Date(record.check_out).getTime();
      return Math.max(0, Math.floor((end - start) / 60000));
    }

    if (!mounted) return 0;

    return Math.max(0, Math.floor((now.getTime() - start) / 60000));
  }

  const roster = useMemo(() => {
    const map: Record<string, Record<string, Attendance[]>> = {};

    guards.forEach((g) => {
      map[g.id] = {};
      days.forEach((d) => {
        map[g.id][formatDateKey(d)] = [];
      });
    });

    records.forEach((r) => {
      const key = formatDateKey(new Date(r.check_in));
      if (map[r.guard_id] && map[r.guard_id][key]) {
        map[r.guard_id][key].push(r);
      }
    });

    return map;
  }, [guards, records, days]);

  const stats = useMemo(() => {
    let workedMinutes = 0;
    const activeGuards = new Set<string>();

    records.forEach((r) => {
      activeGuards.add(r.guard_id);
      workedMinutes += getRecordMinutes(r);
    });

    return {
      totalGuards: guards.length,
      activeGuards: activeGuards.size,
      shiftRecords: records.length,
      workedHours: Math.floor(workedMinutes / 60),
    };
  }, [records, guards, mounted, now]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(view, range.start, range.end),
    [view, range.start, range.end]
  );

  function exportToCsv() {
    const header = [
      "Guard",
      ...days.map((d) =>
        d.toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: SA_TIMEZONE,
        })
      ),
      "Total Hours",
    ];

    const rows = guards.map((g) => {
      let totalMinutes = 0;

      const row = days.map((d) => {
        const key = formatDateKey(d);
        const entries = roster[g.id]?.[key] || [];

        let minutes = 0;
        entries.forEach((e) => {
          minutes += getRecordMinutes(e);
        });

        totalMinutes += minutes;
        return minutes > 0 ? formatMinutesAsHours(minutes) : "-";
      });

      return [
        guardNameMap[g.id] || "Unknown",
        ...row,
        formatMinutesAsHours(totalMinutes),
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeRange = rangeLabel.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    link.href = url;
    link.setAttribute("download", `attendance_roster_${view}_${safeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
          color: "white",
          padding: "40px 24px 120px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
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
                background: "rgba(255,255,255,0.12)",
                fontSize: 13,
                fontWeight: 700,
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
              Attendance Reporting
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 44,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: -1.1,
              }}
            >
              History & Roster View
            </h1>

            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                maxWidth: 720,
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Review attendance in a roster format across day, week, and month
              views. Track participation, worked hours, and coverage across your
              guard team.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
              alignSelf: "start",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
              Selected Range
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: 20,
              }}
            >
              {rangeLabel}
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
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Guards</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {stats.totalGuards}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Active Guards</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {stats.activeGuards}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Shift Records</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {stats.shiftRecords}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Worked Hours</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                  {stats.workedHours}h
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          maxWidth: 1280,
          margin: "-80px auto 0 auto",
          padding: "0 24px 40px 24px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 28,
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.10)",
            border: "1px solid #e5e7eb",
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0f766e",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 6,
                }}
              >
                Roster Controls
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  lineHeight: 1.1,
                  letterSpacing: -0.6,
                }}
              >
                View Attendance by Period
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "#ecfdf5",
                  color: "#166534",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {loading ? "Refreshing roster..." : `${view.toUpperCase()} view active`}
              </div>

              <button
                onClick={exportToCsv}
                style={{
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  background: "#111827",
                  color: "#ffffff",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Export to Excel
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                style={{
                  padding: "12px 18px",
                  borderRadius: 14,
                  border: view === mode ? "2px solid #111827" : "1px solid #d1d5db",
                  background: view === mode ? "#111827" : "#ffffff",
                  color: view === mode ? "#ffffff" : "#111827",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}

            <input
              type="date"
              value={formatDateKey(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
                color: "#111827",
                background: "#fff",
              }}
            />
          </div>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "center",
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f766e",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Attendance Matrix
              </div>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 0,
                  fontSize: 30,
                  lineHeight: 1.1,
                }}
              >
                Guard Roster
              </h2>
            </div>

            <button
              onClick={loadAttendance}
              style={{
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 700,
                background: "#ecfeff",
                color: "#0f766e",
                borderRadius: 14,
                border: "1px solid #a5f3fc",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
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
              Loading roster data...
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                borderRadius: 20,
                border: "1px solid #e5e7eb",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  minWidth: 980,
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        position: "sticky",
                        left: 0,
                        background: "#f8fafc",
                        zIndex: 2,
                        textAlign: "left",
                        padding: "16px 14px",
                        fontSize: 16,
                        fontWeight: 800,
                        borderBottom: "1px solid #e5e7eb",
                        minWidth: 220,
                      }}
                    >
                      Guard
                    </th>

                    {days.map((d, i) => (
                      <th
                        key={i}
                        style={{
                          background: "#f8fafc",
                          padding: "14px 10px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          minWidth: 84,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            fontWeight: 700,
                            marginBottom: 4,
                            textTransform: "uppercase",
                          }}
                        >
                          {d.toLocaleDateString("en-ZA", {
                            weekday: "short",
                            timeZone: SA_TIMEZONE,
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#111827",
                          }}
                        >
                          {d.toLocaleDateString("en-ZA", {
                            day: "numeric",
                            timeZone: SA_TIMEZONE,
                          })}
                        </div>
                      </th>
                    ))}

                    <th
                      style={{
                        background: "#f8fafc",
                        padding: "14px 10px",
                        textAlign: "center",
                        borderBottom: "1px solid #e5e7eb",
                        minWidth: 110,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          fontWeight: 700,
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Summary
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        Total
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {guards.map((g) => {
                    let totalMinutes = 0;

                    return (
                      <tr key={g.id}>
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            background: "#ffffff",
                            zIndex: 1,
                            padding: "14px",
                            fontWeight: 700,
                            fontSize: 16,
                            borderBottom: "1px solid #f1f5f9",
                            borderRight: "1px solid #f1f5f9",
                            minWidth: 220,
                          }}
                        >
                          {guardNameMap[g.id] || "Unknown"}
                        </td>

                        {days.map((d, i) => {
                          const key = formatDateKey(d);
                          const entries = roster[g.id]?.[key] || [];

                          let minutes = 0;
                          entries.forEach((e) => {
                            minutes += getRecordMinutes(e);
                          });

                          totalMinutes += minutes;

                          return (
                            <td
                              key={i}
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                borderBottom: "1px solid #f1f5f9",
                                borderRight: "1px solid #f8fafc",
                                background: minutes > 0 ? "#dcfce7" : "#f8fafc",
                                color: minutes > 0 ? "#166534" : "#94a3b8",
                                fontWeight: minutes > 0 ? 800 : 600,
                                fontSize: 15,
                              }}
                              title={
                                entries.length > 0
                                  ? entries
                                      .map(
                                        (e) =>
                                          `${formatDateTimeSA(e.check_in)} → ${
                                            e.check_out
                                              ? formatDateTimeSA(e.check_out)
                                              : "Still on shift"
                                          }`
                                      )
                                      .join("\n")
                                  : "No recorded shift"
                              }
                            >
                              {minutes > 0 ? formatMinutesAsHours(minutes) : "-"}
                            </td>
                          );
                        })}

                        <td
                          style={{
                            padding: "10px",
                            fontWeight: 800,
                            background: "#0ea5e9",
                            color: "white",
                            textAlign: "center",
                            borderBottom: "1px solid #f1f5f9",
                            fontSize: 16,
                          }}
                        >
                          {formatMinutesAsHours(totalMinutes)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}