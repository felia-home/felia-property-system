"use client";
import { useRef, useState } from "react";

// BulkPhotoUpload — STEP4 ドラッグ&ドロップ一括写真アップロード

interface UploadedFile {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface BulkPhotoUploadProps {
  propertyId: string;
  onUploaded?: (count: number) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function BulkPhotoUpload({ propertyId, onUploaded }: BulkPhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const imageFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    const newEntries: UploadedFile[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleUploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);
    let done = doneCount;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const fd = new FormData();
        fd.append("file", files[i].file);
        fd.append("property_id", propertyId);
        const res = await fetch(`/api/properties/${propertyId}/images`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? `HTTP ${res.status}`);
        }
        done++;
        setDoneCount(done);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (e) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error: e instanceof Error ? e.message : "エラー",
                }
              : f
          )
        );
      }
    }

    setUploading(false);
    onUploaded?.(done);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const totalDone = files.filter((f) => f.status === "done").length;

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#234f35" : "#d0cec8"}`,
          borderRadius: 12,
          background: dragging ? "#f0f7f3" : "#fafaf8",
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all .15s",
          marginBottom: 16,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
        <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: dragging ? "#234f35" : "#5a4a3a", marginBottom: 4 }}>
          {dragging ? "ここにドロップ" : "写真をドラッグ＆ドロップ"}
        </div>
        <div style={{ fontSize: 12, color: "#aaa" }}>
          またはクリックしてファイルを選択（複数可）
        </div>
        <div style={{ fontSize: 11, color: "#ccc", marginTop: 6 }}>
          JPG / PNG / WEBP 対応
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {files.map((f, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `2px solid ${
                    f.status === "done"
                      ? "#2e7d32"
                      : f.status === "error"
                      ? "#c62828"
                      : f.status === "uploading"
                      ? "#1565c0"
                      : "#e0deda"
                  }`,
                  background: "#f5f5f5",
                }}
              >
                <img
                  src={f.preview}
                  alt={f.file.name}
                  style={{
                    width: "100%",
                    height: 80,
                    objectFit: "cover",
                    display: "block",
                    opacity: f.status === "uploading" ? 0.5 : 1,
                  }}
                />

                {/* Status overlay */}
                {f.status !== "pending" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      background:
                        f.status === "uploading" ? "rgba(0,0,0,.3)" : "transparent",
                    }}
                  >
                    {f.status === "done" && (
                      <div
                        style={{
                          background: "#2e7d32",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </div>
                    )}
                    {f.status === "uploading" && (
                      <span style={{ color: "#fff", fontSize: 12 }}>...</span>
                    )}
                    {f.status === "error" && (
                      <div
                        style={{
                          background: "#c62828",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </div>
                    )}
                  </div>
                )}

                {/* Remove button (pending only) */}
                {f.status === "pending" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,.5)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "inherit",
                    }}
                  >
                    ✕
                  </button>
                )}

                {/* File size */}
                <div
                  style={{
                    padding: "2px 4px",
                    fontSize: 9,
                    color: "#888",
                    background: "rgba(255,255,255,.9)",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatBytes(f.file.size)}
                </div>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleUploadAll}
              disabled={uploading || pendingCount === 0}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                background:
                  uploading || pendingCount === 0 ? "#aaa" : "#234f35",
                color: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: uploading || pendingCount === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {uploading
                ? "アップロード中..."
                : `📤 ${pendingCount}枚をアップロード`}
            </button>
            {totalDone > 0 && (
              <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>
                ✅ {totalDone}枚完了
              </span>
            )}
            {files.some((f) => f.status === "error") && (
              <span style={{ fontSize: 12, color: "#c62828" }}>
                {files.filter((f) => f.status === "error").length}件エラー
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
