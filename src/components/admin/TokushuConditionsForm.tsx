'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type TokushuConditions,
  type SortType,
  type TokushuFlag,
  FLAG_OPTIONS,
  AREA_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SORT_OPTIONS,
} from '@/lib/tokushuConditions';

interface PreviewProperty {
  id: string;
  name: string;
  price: number;
  property_type: string;
  address: string;
  thumbnail: string | null;
}

interface Props {
  conditions: TokushuConditions;
  sortType: SortType;
  displayLimit: number;
  onChange: (conditions: TokushuConditions, sortType: SortType, displayLimit: number) => void;
}

export default function TokushuConditionsForm({ conditions, sortType, displayLimit, onChange }: Props) {
  const [preview, setPreview] = useState<{ total: number; properties: PreviewProperty[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPreview = useCallback(async (cond: TokushuConditions, sort: SortType, limit: number) => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/tokushu-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: cond, sort_type: sort, display_limit: limit }),
      });
      const data = await res.json();
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchPreview(conditions, sortType, displayLimit), 600);
    return () => clearTimeout(timer);
  }, [conditions, sortType, displayLimit, fetchPreview]);

  const updateConditions = (patch: Partial<TokushuConditions>) =>
    onChange({ ...conditions, ...patch }, sortType, displayLimit);

  const toggleFlag = (flag: TokushuFlag) => {
    const flags = conditions.flags ?? [];
    updateConditions({ flags: flags.includes(flag) ? flags.filter(f => f !== flag) : [...flags, flag] });
  };
  const toggleArea = (area: string) => {
    const areas = conditions.areas ?? [];
    updateConditions({ areas: areas.includes(area) ? areas.filter(a => a !== area) : [...areas, area] });
  };
  const toggleType = (type: string) => {
    const types = conditions.property_types ?? [];
    updateConditions({ property_types: types.includes(type) ? types.filter(t => t !== type) : [...types, type] });
  };

  const sectionStyle: React.CSSProperties = {
    background: '#f8f9fa', border: '1px solid #e0e0e0',
    borderRadius: 8, padding: 16, marginBottom: 16,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 'bold',
    color: '#555', marginBottom: 6, marginTop: 14,
  };
  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', border: '1px solid #ccc',
    borderRadius: 4, fontSize: 13, width: 120, fontFamily: 'inherit',
  };
  const checkLabelStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    marginRight: 12, marginBottom: 4, fontSize: 13, cursor: 'pointer',
  };

  return (
    <div>
      {/* 絞り込み条件 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4, color: '#333' }}>
          絞り込み条件
          <span style={{ fontSize: 11, fontWeight: 'normal', color: '#888', marginLeft: 8 }}>
            フラグはAND条件 / エリア・種別はOR条件
          </span>
        </div>

        {/* フラグ */}
        <div>
          <span style={labelStyle}>フラグ</span>
          <div>
            {FLAG_OPTIONS.map(opt => (
              <label key={opt.value} style={checkLabelStyle}>
                <input
                  type="checkbox"
                  checked={(conditions.flags ?? []).includes(opt.value)}
                  onChange={() => toggleFlag(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 物件種別 */}
        <div>
          <span style={labelStyle}>物件種別</span>
          <div>
            {PROPERTY_TYPE_OPTIONS.map(opt => (
              <label key={opt.value} style={checkLabelStyle}>
                <input
                  type="checkbox"
                  checked={(conditions.property_types ?? []).includes(opt.value)}
                  onChange={() => toggleType(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* エリア */}
        <div>
          <span style={labelStyle}>エリア（区市）</span>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '4px 8px', maxHeight: 150, overflowY: 'auto',
            border: '1px solid #e0e0e0', borderRadius: 4, padding: 8, background: '#fff',
          }}>
            {AREA_OPTIONS.map(area => (
              <label key={area} style={{ ...checkLabelStyle, fontSize: 12, marginRight: 0, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={(conditions.areas ?? []).includes(area)}
                  onChange={() => toggleArea(area)}
                />
                {area}
              </label>
            ))}
          </div>
        </div>

        {/* 価格帯 */}
        <div>
          <span style={labelStyle}>価格帯（万円）</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              placeholder="下限"
              value={conditions.price_min ?? ''}
              onChange={e => updateConditions({ price_min: e.target.value ? Number(e.target.value) : null })}
              style={inputStyle}
            />
            <span style={{ fontSize: 13, color: '#666' }}>〜</span>
            <input
              type="number"
              placeholder="上限"
              value={conditions.price_max ?? ''}
              onChange={e => updateConditions({ price_max: e.target.value ? Number(e.target.value) : null })}
              style={inputStyle}
            />
            <span style={{ fontSize: 12, color: '#888' }}>万円</span>
          </div>
        </div>

        {/* 写真枚数 */}
        <div>
          <span style={labelStyle}>写真あり</span>
          <label style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={(conditions.photo_min ?? 0) > 0}
              onChange={e => updateConditions({ photo_min: e.target.checked ? 1 : null })}
            />
            写真がある物件のみ
          </label>
        </div>
      </div>

      {/* 表示設定 */}
      <div style={{ ...sectionStyle, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', width: '100%', marginBottom: -8, color: '#333' }}>
          表示設定
        </div>
        <div>
          <span style={{ ...labelStyle, marginTop: 8 }}>並び順</span>
          <select
            value={sortType}
            onChange={e => onChange(conditions, e.target.value as SortType, displayLimit)}
            style={{ ...inputStyle, width: 160 }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={{ ...labelStyle, marginTop: 8 }}>表示件数上限</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1}
              max={100}
              value={displayLimit}
              onChange={e => onChange(conditions, sortType, Math.min(100, Math.max(1, Number(e.target.value))))}
              style={inputStyle}
            />
            <span style={{ fontSize: 12, color: '#888' }}>件まで</span>
          </div>
        </div>
      </div>

      {/* プレビュー */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>条件に合致する物件</span>
          {previewLoading ? (
            <span style={{ fontSize: 12, color: '#999' }}>取得中...</span>
          ) : preview != null && (
            <span style={{
              fontSize: 13, fontWeight: 'bold', padding: '3px 12px', borderRadius: 12,
              background: preview.total > 0 ? '#e3f2fd' : '#fff3e0',
              color: preview.total > 0 ? '#1565c0' : '#e65100',
            }}>
              {preview.total}件該当
              {preview.total > displayLimit && `（上限${displayLimit}件表示）`}
            </span>
          )}
        </div>

        {preview && preview.properties.length > 0 ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8, maxHeight: 320, overflowY: 'auto',
          }}>
            {preview.properties.map(p => (
              <div key={p.id} style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                <div style={{
                  height: 72, background: '#f0f0f0',
                  backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!p.thumbnail && <span style={{ fontSize: 10, color: '#bbb' }}>画像なし</span>}
                </div>
                <div style={{ padding: '4px 6px' }}>
                  <div style={{ fontSize: 10, color: '#333', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name || p.address}
                  </div>
                  <div style={{ fontSize: 11, color: '#e53935', fontWeight: 'bold' }}>
                    {p.price?.toLocaleString()}万円
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : preview && preview.total === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999', fontSize: 13, border: '1px dashed #ddd', borderRadius: 4, background: '#fff' }}>
            条件に合致する物件がありません
          </div>
        ) : !previewLoading && (
          <div style={{ textAlign: 'center', padding: 24, color: '#bbb', fontSize: 12 }}>
            条件を設定するとプレビューが表示されます
          </div>
        )}
      </div>
    </div>
  );
}
