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

type ViewMode = "day" | "week" | "month";

type DayCell = {
  dateKey: string;
  hasAttendance: boolean;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalMinutes: number;
  records: AttendanceRecord[];
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeekMonday(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(date: Date) {
  const start = startOfWeekMonday(date);
  const d = new Date(start);
  d.setDate(start.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function formatDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function formatDayName(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "short",
  });
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeOnly(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutesAsHours(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

function dateKey(date: Date) {
  return formatDateInputValue(date);
}

function eachDayBetween(start: Date, end: Date) {
  const dates: Date[] = [];
  const current = startOfDay(start);
  const last = startOfDay(end);

  while (current <= last) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function HistoryPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const range = useMemo(() => {
    if (viewMode === "day") {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };
    }

    if (viewMode === "week") {
      return {
        start: startOfWeekMonday(selectedDate),
        end: endOfWeekSunday(selectedDate),
      };
    }

    return {
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate),
    };
  }, [viewMode, selectedDate]);

  const visibleDates = useMemo(() => {
    return eachDayBetween(range.start, range.end);
  }, [range]);

  useEffect(() => {
    loadGuards();
  }, []);

  useEffect(() => {
    loadAttendanceForRange();
  }, [range.start.getTime(), range.end.getTime()]);

  const loadGuards = async () => {
    const { data, error } = await supabase
      .from("guards")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load guards", error);
      alert("Failed to load guards");
      return;
    }

    setGuards(data || []);
  };

  const loadAttendanceForRange = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .gte("check_in", range.start.toISOString())
      .lte("check_in", range.end.toISOString())
      .order("check_in", { ascending: true });

    if (error) {
      console.error("Failed to load attendance", error);
      alert("Failed to load attendance");
      setLoading(false);
      return;
    }

    setAttendance(data || []);
    setLoading(false);
  };

  const roster = useMemo(() => {
    const map: Record<string, Record<string, DayCell>> = {};

    for (const guard of guards) {
      map[guard.id] = {};
      for (const d of visibleDates) {
        map[guard.id][dateKey(d)] = {
          dateKey: dateKey(d),
          hasAttendance: false,
          firstCheckIn: null,
          lastCheckOut: null,
          totalMinutes: 0,
          records: [],
        };
      }
    }

    for (const record of attendance) {
      const recordDate = new Date(record.check_in);
      const key = dateKey(recordDate);

      if (!map[record.guard_id] || !map[record.guard_id][key]) continue;

      const cell = map[record.guard_id][key];
      cell.records.push(record);
      cell.hasAttendance = true;

      if (!cell.firstCheckIn || new Date(record.check_in) < new Date(cell.firstCheckIn)) {
        cell.firstCheckIn = record.check_in;
      }

      if (record.check_out) {
        if (!cell.lastCheckOut || new Date(record.check_out) > new Date(cell.lastCheckOut)) {
          cell.lastCheckOut = record.check_out;
        }
      }

      const start = new Date(record.check_in).getTime();
      const end = record.check_out ? new Date(record.check_out).getTime() : Date.now();
      cell.totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
    }

    return map;
  }, [guards, attendance, visibleDates]);

  const stats = useMemo(() => {
    const totalShifts = attendance.length;
    const openShifts = attendance.filter((a) => !a.check_out).length;
    const closedShifts = attendance.filter((a) => !!a.check_out).length;

    const activeGuards = new Set(attendance.map((a) => a.guard_id)).size;

    return {
      totalShifts,
      openShifts,
      closedShifts,
      activeGuards,
    };
  }, [attendance]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "day") {
      return formatDateLong(range.start);
    }

    if (viewMode === "week") {
      return `${formatDateLong(range.start)} – ${formatDateLong(range.end)}`;
    }

    return range.start.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  }, [range, viewMode]);

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
            gridTemplateColumns: "1.35fr 1fr",
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
              Attendance Roster
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
                maxWidth: 700,
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Review guard attendance in a roster format across day, week, or
              month views. Track who worked, when they checked