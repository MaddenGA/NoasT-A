export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Naos Attendance MVP</h1>
      <p>Security guard time and attendance system</p>

      <div style={{ marginTop: 40 }}>
        <button
          style={{
            padding: "15px 30px",
            fontSize: 18,
            background: "#1e40af",
            color: "white",
            borderRadius: 8,
            border: "none",
          }}
        >
          Check In
        </button>
      </div>
    </main>
  );
}
