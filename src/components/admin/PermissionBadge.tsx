import { PERMISSIONS, Permission } from "@/lib/permissions";

export default function PermissionBadge({ permission }: { permission: string }) {
  const p = PERMISSIONS[permission as Permission];
  if (!p) return <span style={{ fontSize: 11, color: "#888" }}>{permission}</span>;
  return (
    <span style={{
      background: p.bg,
      color: p.color,
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 20,
      whiteSpace: "nowrap",
    }}>
      {p.label}
    </span>
  );
}
