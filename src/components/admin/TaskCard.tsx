"use client";

export interface TaskCardProperty {
  id: string;
  label: string;
  sub?: string;
}

export interface TaskCardProps {
  step: number;
  icon: string;
  title: string;
  subtitle: string;
  count: number;
  urgent?: boolean;
  color: string;
  bg: string;
  properties: TaskCardProperty[];
  href: string;
}

export function TaskCard({
  step,
  icon,
  title,
  subtitle,
  count,
  urgent,
  color,
  bg,
  properties,
  href,
}: TaskCardProps) {
  const hasItems = count > 0;
  const borderColor = urgent && hasItems ? color + "88" : "#e0deda";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: urgent && hasItems ? `0 0 0 1px ${color}22` : "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: hasItems ? bg : "#f8f7f5",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid #e8e4e0",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: hasItems ? color : "#ccc",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: hasItems ? color : "#aaa",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {icon} {title}
          </div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>
            {subtitle}
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: hasItems ? color : "#d0cec8",
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          {count}
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2, color: "#aaa" }}>
            件
          </span>
        </div>
      </div>

      {/* Property list */}
      <div style={{ padding: "8px 14px", flex: 1 }}>
        {!hasItems ? (
          <div
            style={{
              fontSize: 11,
              color: "#bbb",
              textAlign: "center",
              padding: "10px 0",
            }}
          >
            対応なし ✓
          </div>
        ) : (
          <>
            {properties.slice(0, 3).map((p) => (
              <a
                key={p.id}
                href={`/admin/properties/${p.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  padding: "5px 0",
                  borderBottom: "1px solid #f5f5f0",
                }}
              >
                <div style={{ fontSize: 12, color: "#3a2a1a", fontWeight: 500 }}>
                  {p.label}
                </div>
                {p.sub && (
                  <div style={{ fontSize: 10, color: "#aaa" }}>{p.sub}</div>
                )}
              </a>
            ))}
            {count > 3 && (
              <a
                href={href}
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#888",
                  textDecoration: "none",
                  padding: "5px 0",
                  textAlign: "right",
                }}
              >
                …他{count - 3}件
              </a>
            )}
          </>
        )}
      </div>

      {/* Footer link */}
      {hasItems && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid #f2f1ed",
            background: bg + "44",
          }}
        >
          <a
            href={href}
            style={{
              fontSize: 12,
              color,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            対応する →
          </a>
        </div>
      )}
    </div>
  );
}
