'use client'

import { useState, useRef, useCallback } from 'react'

interface UploadedImage {
  url: string
  name: string
}

interface MultiImageUploaderProps {
  folder?: string
  onUpload: (urls: string[]) => void
  maxFiles?: number
}

export default function MultiImageUploader({
  folder = 'general',
  onUpload,
  maxFiles = 10,
}: MultiImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setError('画像ファイルのみアップロードできます')
      return
    }
    if (imageFiles.length > maxFiles) {
      setError(`一度にアップロードできるのは${maxFiles}枚までです`)
      return
    }

    setUploading(true)
    setError(null)
    const results: UploadedImage[] = []

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      setProgress(`アップロード中... ${i + 1} / ${imageFiles.length}`)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (res.ok && data.url) {
          results.push({ url: data.url, name: file.name })
        } else {
          setError(`${file.name} のアップロードに失敗しました`)
        }
      } catch {
        setError(`${file.name} のアップロードに失敗しました`)
      }
    }

    setUploadedImages((prev) => [...prev, ...results])
    onUpload(results.map((r) => r.url))
    setProgress(null)
    setUploading(false)
  }, [folder, maxFiles, onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    uploadFiles(files)
  }, [uploadFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    uploadFiles(files)
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      {/* ドロップゾーン */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#5BAD52' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '32px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: isDragging ? '#f0fdf4' : '#fafafa',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
        {uploading ? (
          <p style={{ fontSize: '14px', color: '#5BAD52', fontWeight: '600', margin: 0 }}>
            {progress}
          </p>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: '#374151', fontWeight: '600', margin: '0 0 4px' }}>
              ここに画像をドラッグ＆ドロップ
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              または クリックしてファイルを選択（複数可・最大{maxFiles}枚）
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
              JPEG・PNG・WebP・GIF / 各10MBまで
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* エラー */}
      {error && (
        <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>
          ⚠ {error}
        </p>
      )}

      {/* アップロード済み画像一覧 */}
      {uploadedImages.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', margin: '0 0 8px' }}>
            アップロード済み（{uploadedImages.length}枚）
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {uploadedImages.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  style={{
                    width: '80px', height: '80px',
                    objectFit: 'cover', borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    width: '20px', height: '20px',
                    backgroundColor: '#dc2626', color: '#fff',
                    border: 'none', borderRadius: '50%',
                    cursor: 'pointer', fontSize: '11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
