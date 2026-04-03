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

export default function HistoryPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [
      { data: guardsData },
      { data: attendanceData },
    ] = await Promise.all([
      supabase.from("guards").select("id, name"),
      supabase.from("attendance").select("*").order("check_in", { ascending: false }),
    ]);

    setGuards(guardsData || []);
    setAttendance(attendanceData || []);
    setLoading(false);
  };

  const getGuardName = (id: string) => {
    return guards.find((g) => g.id === id)?.name || "Unknown";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getDuration = (start: string, end: string | null) => {
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const mins = Math.floor((e - s) / 60000);

    const h = Math.floor(mins / 60);
    const m = mins % 60;

    return `${h}h ${m}m`;
  };

  const stats = useMemo(() => {
    return {
      total: attendance.length,
      open: attendance.filter((a) => !a.check_out).length,
      closed: attendance.filter((a) => a.check_out).length,
    };
  }, [attendance]);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>Attendance History</h1>

      <div style={{ display: "flex", gap: 20, margin: "20px 0" }}>
        <div>Total: {stats.total}</div>
        <div>Open: {stats.open}</div>
        <div>Closed: {stats.closed}</div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {attendance.map((record) => (
            <div
              key={record.id}
              style={{
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {getGuardName(record.guard_id)}
              </div>

              <div>Check-in: {formatDate(record.check_in)}</div>

              <div>
                Check-out:{" "}
                {record.check_out
                  ? formatDate(record.check_out)
                  : "Still on shift"}
              </div>

              <div>
                Duration: {getDuration(record.check_in, record.check_out)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}