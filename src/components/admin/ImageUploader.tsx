"use client";
import { useState, useRef } from "react";

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  folder?: string;
  currentUrl?: string;
  label?: string;
}

export default function ImageUploader({
  onUpload,
  folder = "general",
  currentUrl,
  label = "画像をアップロード",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    // ローカルプレビューを即時表示
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        setPreview(currentUrl ?? null);
        // inputをリセット
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      onUpload(data.url!);
    } catch {
      setError("通信エラーが発生しました");
      setPreview(currentUrl ?? null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {preview && (
        <div style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden", background: "#f5f5f5" }}>
          <img
            src={preview}
            alt="プレビュー"
            style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: "100%",
          padding: "8px 16px",
          background: uploading ? "#e0e0e0" : "#f5f5f5",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          cursor: uploading ? "not-allowed" : "pointer",
          fontSize: 13,
          color: "#374151",
          fontFamily: "inherit",
          textAlign: "center",
        }}
      >
        {uploading ? "アップロード中..." : `📁 ${label}`}
      </button>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 4, margin: "4px 0 0" }}>
        JPEG・PNG・WebP・GIF / 最大10MB
      </p>
    </div>
  );
}
