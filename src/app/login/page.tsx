"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1c1b18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 48, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1c1b18", letterSpacing: ".04em" }}>Felia Home</div>
          <div style={{ fontSize: 11, color: "#706e68", letterSpacing: ".14em", marginTop: 4 }}>PROPERTY MANAGEMENT</div>
        </div>

        {error && (
          <div style={{ background: "#ffebee", border: "1px solid #f44336", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 20 }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="yamada@felia-home.co.jp"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: loading ? "#888" : "#234f35", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 20 }}>
          パスワードを忘れた場合はADMIN権限者にお問い合わせください
        </p>
      </div>
    </div>
  );
}
