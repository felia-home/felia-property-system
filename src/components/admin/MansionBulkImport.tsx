'use client';

import { useState, useRef } from 'react';

interface MansionEntry {
  name: string;
  city: string;    // 区名 (parts[0])
  address: string; // 町名 (parts[1])
  files: File[];
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

const ALLOWED_EXTS = /\.(jpe?g|png|webp|gif)$/i;

function isImageFile(file: File): boolean {
  return (
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
    ALLOWED_EXTS.test(file.name)
  );
}

function parseFilesToMansions(files: FileList): MansionEntry[] {
  const map = new Map<string, MansionEntry>();

  for (const file of Array.from(files)) {
    if (!isImageFile(file)) continue;
    const parts = (file.webkitRelativePath || file.name).split('/');
    // 必要構成: 区名/町名/マンション名/画像.jpg = 4パーツ以上
    if (parts.length < 4) continue;
    const ward = parts[0];        // 区名
    const town = parts[1];        // 町名
    const mansionName = parts[2]; // マンション名
    const key = `${ward}/${town}/${mansionName}`;
    if (!map.has(key)) {
      map.set(key, { name: mansionName, city: ward, address: town, files: [] });
    }
    map.get(key)!.files.push(file);
  }

  return Array.from(map.values());
}

interface Props {
  onComplete?: () => void;
}

export default function MansionBulkImport({ onComplete }: Props) {
  const [mansions, setMansions] = useState<MansionEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const parsed = parseFilesToMansions(files);
    setMansions(parsed);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleImport = async () => {
    if (!mansions.length) return;
    setUploading(true);
    setResult(null);

    try {
      const importData: {
        name: string;
        city: string;
        address: string;
        images: { url: string; filename: string }[];
      }[] = [];

      for (let i = 0; i < mansions.length; i++) {
        const m = mansions[i];
        setProgress(`${i + 1}/${mansions.length}棟目: 「${m.name}」の画像をアップロード中...`);

        const uploadedImages: { url: string; filename: string }[] = [];
        for (const file of m.files) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('folder', 'mansions');
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.url) uploadedImages.push({ url: data.url, filename: file.name });
          }
        }

        importData.push({ name: m.name, city: m.city, address: m.address, images: uploadedImages });
      }

      setProgress('データベースに登録中...');
      const res = await fetch('/api/mansions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mansions: importData }),
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) onComplete?.();
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  const totalImages = mansions.reduce((s, m) => s + m.files.length, 0);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0deda', padding: 20, marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#1a1a1a' }}>フォルダ一括インポート</h3>
      <p style={{ fontSize: 12, color: '#706e68', marginBottom: 14 }}>
        フォルダ構成: 区名フォルダ / 町名フォルダ / マンション名フォルダ / 画像.jpg
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #d0cec8', borderRadius: 8, padding: '28px 20px',
          textAlign: 'center', cursor: 'pointer', fontSize: 13, color: '#706e68',
          background: mansions.length ? '#f0f7f2' : '#fafaf8', marginBottom: 14,
          transition: 'background 0.2s',
        }}
      >
        {mansions.length > 0 ? (
          <>
            <div style={{ fontSize: 26, marginBottom: 4 }}>✓</div>
            <div style={{ fontWeight: 600, color: '#234f35', fontSize: 14 }}>
              {mansions.length}棟のマンションを検出
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: '#706e68' }}>画像合計 {totalImages}枚</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>クリックして再選択</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div>フォルダをドラッグ&ドロップ、またはクリックして選択</div>
            <div style={{ fontSize: 11, marginTop: 6, color: '#9ca3af' }}>
              構成: 区名フォルダ / 町名フォルダ / マンション名フォルダ / 画像.jpg
            </div>
          </>
        )}
      </div>

      {/* @ts-expect-error webkitdirectory is non-standard */}
      <input
        ref={inputRef}
        type="file"
        webkitdirectory="true"
        multiple
        style={{ display: 'none' }}
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {/* Preview table */}
      {mansions.length > 0 && !uploading && !result && (
        <div style={{ marginBottom: 14, maxHeight: 200, overflowY: 'auto', border: '1px solid #e0deda', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f7f6f2' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, color: '#706e68' }}>区名</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, color: '#706e68' }}>町名</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, color: '#706e68' }}>マンション名</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: '#706e68' }}>画像数</th>
              </tr>
            </thead>
            <tbody>
              {mansions.map((m, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 10px', color: '#706e68' }}>{m.city}</td>
                  <td style={{ padding: '6px 10px', color: '#706e68' }}>{m.address}</td>
                  <td style={{ padding: '6px 10px', color: '#1a1a1a', fontWeight: 500 }}>{m.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: '#706e68' }}>{m.files.length}枚</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div style={{ padding: '10px 14px', background: '#f0f7f2', borderRadius: 8, fontSize: 13, color: '#234f35', marginBottom: 12 }}>
          {progress}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12,
          background: result.created > 0 ? '#f0f7f2' : '#fff8e1',
        }}>
          <div style={{ fontWeight: 600, color: result.created > 0 ? '#234f35' : '#e65100' }}>
            {result.created}棟を登録しました
            {result.skipped > 0 && `（${result.skipped}棟は既存のためスキップ）`}
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#c0392b' }}>
              {result.errors.join('、')}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleImport}
          disabled={!mansions.length || uploading}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: mansions.length && !uploading ? '#234f35' : '#d0cec8',
            color: '#fff', border: 'none',
            cursor: mansions.length && !uploading ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          {uploading ? 'インポート中...' : `${mansions.length}棟をインポート`}
        </button>
        <button
          onClick={() => { setMansions([]); setResult(null); }}
          disabled={uploading}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            border: '1px solid #e0deda', background: '#fff',
            cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          リセット
        </button>
      </div>
    </div>
  );
}
