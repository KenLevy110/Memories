import { serviceName } from "@memories/shared";
import "./App.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

function App() {
  return (
    <main
      className="memories-splash"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "1.5rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem" }}>Memories</h1>
        <p style={{ margin: 0, color: "#444" }}>
          Record photos, voice, and transcriptions. Shared package:{" "}
          <code>{serviceName}</code>
        </p>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.9rem", color: "#666" }}>
          API: <code>{apiBase}</code>
        </p>
      </div>
    </main>
  );
}

export default App;
