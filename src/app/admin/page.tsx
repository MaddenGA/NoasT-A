"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guard = {
  id: string;
  name: string;
};

export default function AdminPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [newGuard, setNewGuard] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadGuards();
  }, []);

  const loadGuards = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("guards")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load guards", error);
      alert("Failed to load guards");
      setLoading(false);
      return;
    }

    setGuards(data || []);
    setLoading(false);
  };

  const addGuard = async (e: FormEvent) => {
    e.preventDefault();

    const name = newGuard.trim();

    if (!name) {
      alert("Please enter a guard name");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("guards").insert([
      {
        name,
      },
    ]);

    if (error) {
      console.error("Failed to add guard", error);
      alert("Failed to add guard");
      setSaving(false);
      return;
    }

    setNewGuard("");
    await loadGuards();
    setSaving(false);
  };

  const removeGuard = async (id: string, name: string) => {
    const confirmed = window.confirm(`Remove ${name}?`);

    if (!confirmed) return;

    setRemovingId(id);

    const { error } = await supabase.from("guards").delete().eq("id", id);

    if (error) {
      console.error("Failed to remove guard", error);
      alert("Failed to remove guard");
      setRemovingId(null);
      return;
    }

    await loadGuards();
    setRemovingId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  };

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
              Admin Configuration
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
              Guard Management Console
            </h1>

            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                maxWidth: 650,
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Manage active guards for the attendance platform. Add new guards,
              remove old records, and keep the check-in dashboard aligned with
              the latest site roster.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
              alignSelf: "start",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
              Overview
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              {guards.length} guard{guards.length === 1 ? "" : "s"}
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
                <div style={{ fontSize: 13, opacity: 0.8 }}>Loaded</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
                  {loading ? "..." : guards.length}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.8 }}>Status</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.14)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#86efac",
                    }}
                  />
                  Admin live
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
            display: "grid",
            gridTemplateColumns: "0.95fr 1.25fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 28,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e5e7eb",
              padding: 28,
            }}
          >
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
              Add New Guard
            </div>

            <h2
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 30,
                lineHeight: 1.1,
              }}
            >
              Create guard profile
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: 24,
                color: "#6b7280",
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              Add a guard here and they will immediately appear on the main
              attendance dashboard for check-in and check-out.
            </p>

            <form onSubmit={addGuard}>
              <label
                htmlFor="guardName"
                style={{
                  display: "block",
                  marginBottom: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Guard name
              </label>

              <input
                id="guardName"
                type="text"
                value={newGuard}
                onChange={(e) => setNewGuard(e.target.value)}
                placeholder="Enter full name"
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  fontSize: 18,
                  borderRadius: 18,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  outline: "none",
                  marginBottom: 18,
                  boxSizing: "border-box",
                }}
              />

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  fontSize: 16,
                  fontWeight: 700,
                  background: saving
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #0b8d87 0%, #0f766e 100%)",
                  color: "white",
                  borderRadius: 16,
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                  boxShadow: saving
                    ? "none"
                    : "0 12px 24px rgba(15, 118, 110, 0.2)",
                }}
              >
                {saving ? "Saving..." : "Add Guard"}
              </button>
            </form>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 28,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
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
                  Guard Directory
                </div>

                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 0,
                    fontSize: 30,
                    lineHeight: 1.1,
                  }}
                >
                  Existing Guards
                </h2>
              </div>

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
                {guards.length} total loaded
              </div>
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
                Loading guards...
              </div>
            ) : guards.length === 0 ? (
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
                No guards have been added yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {guards.map((guard) => (
                  <div
                    key={guard.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 16,
                      alignItems: "center",
                      padding: 18,
                      borderRadius: 22,
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #0b8d87 0%, #0f766e 100%)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 18,
                        boxShadow: "0 10px 20px rgba(15, 118, 110, 0.16)",
                      }}
                    >
                      {getInitials(guard.name)}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          marginBottom: 6,
                        }}
                      >
                        {guard.name}
                      </div>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 14,
                          color: "#4b5563",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#22c55e",
                          }}
                        />
                        Available on attendance dashboard
                      </div>
                    </div>

                    <button
                      onClick={() => removeGuard(guard.id, guard.name)}
                      disabled={removingId === guard.id}
                      style={{
                        padding: "12px 18px",
                        fontSize: 14,
                        fontWeight: 700,
                        background:
                          removingId === guard.id ? "#cbd5e1" : "#fee2e2",
                        color:
                          removingId === guard.id ? "#475569" : "#b91c1c",
                        borderRadius: 14,
                        border: "none",
                        cursor:
                          removingId === guard.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {removingId === guard.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}