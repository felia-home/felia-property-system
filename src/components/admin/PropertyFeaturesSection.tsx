'use client';

import { PROPERTY_FEATURES, type Portal } from '@/lib/propertyFeatures';

interface Props {
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
  readOnly?: boolean;
}

const PORTAL_BG: Record<Portal, string> = {
  S: '#21a12a',
  A: '#cc0000',
  Y: '#ee6600',
};

export default function PropertyFeaturesSection({ selectedFeatures, onChange, readOnly }: Props) {
  // ラベル ⇔ ID マップ（旧データの日本語ラベルとの後方互換のため）
  const labelToId = new Map<string, string>();
  const idToLabel = new Map<string, string>();
  for (const cat of PROPERTY_FEATURES) {
    for (const item of cat.items) {
      labelToId.set(item.label, item.id);
      idToLabel.set(item.id, item.label);
    }
  }

  const isChecked = (id: string, label: string): boolean =>
    selectedFeatures.includes(id) || selectedFeatures.includes(label);

  const toggle = (id: string, label: string) => {
    if (readOnly) return;
    if (isChecked(id, label)) {
      // id とラベル両方を除外（古いデータ移行のため）
      onChange(selectedFeatures.filter(f => f !== id && f !== label));
    } else {
      onChange([...selectedFeatures, id]);
    }
  };

  const clearAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  // 重複カウント回避: id とラベルの両方含まれるケースは一方だけカウント
  const selectedCount = (() => {
    const seen = new Set<string>();
    for (const f of selectedFeatures) {
      const canonical = labelToId.get(f) ?? f;
      seen.add(canonical);
    }
    return seen.size;
  })();

  return (
    <div style={{ marginTop: 24 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
          設備・仕様
          {selectedCount > 0 && (
            <span style={{
              marginLeft: 8, fontSize: 12, background: '#e3f2fd',
              color: '#1565c0', padding: '2px 8px', borderRadius: 10,
            }}>
              {selectedCount}件選択中
            </span>
          )}
        </h3>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#666' }}>
              <span style={{ display: 'inline-block', background: '#21a12a', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, marginRight: 2 }}>S</span>SUUMO
              <span style={{ display: 'inline-block', background: '#cc0000', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, marginLeft: 6, marginRight: 2 }}>A</span>athome
              <span style={{ display: 'inline-block', background: '#ee6600', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, marginLeft: 6, marginRight: 2 }}>Y</span>Yahoo!
            </span>
            <button
              type="button"
              onClick={clearAll}
              style={{ fontSize: 12, padding: '3px 10px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: 4, fontFamily: 'inherit' }}
            >
              クリア
            </button>
          </div>
        )}
      </div>

      {/* カテゴリ別チェックボックス */}
      {PROPERTY_FEATURES.map(category => (
        <div key={category.id} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 13, fontWeight: 'bold', color: '#333',
            borderBottom: '1px solid #ddd', paddingBottom: 4, marginBottom: 8,
          }}>
            {category.label}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px 12px',
          }}>
            {category.items.map(item => {
              const checked = isChecked(item.id, item.label);
              return (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    cursor: readOnly ? 'default' : 'pointer',
                    opacity: readOnly && !checked ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id, item.label)}
                      disabled={readOnly}
                      style={{ cursor: readOnly ? 'default' : 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, lineHeight: '1.3' }}>{item.label}</span>
                  </div>
                  {item.portals.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, paddingLeft: 18 }}>
                      {item.portals.map(p => (
                        <span
                          key={p}
                          style={{
                            fontSize: 9, fontWeight: 'bold', color: '#fff',
                            background: PORTAL_BG[p],
                            padding: '0 4px', borderRadius: 2, lineHeight: '14px',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
