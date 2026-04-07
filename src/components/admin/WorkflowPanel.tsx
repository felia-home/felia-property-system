"use client";

// WorkflowPanel — step-by-step visual guide for property detail page
// Shows current step, progress bar, and "やること" checklist

export type WorkflowStep = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  tasks: string[];
};

const STEPS: WorkflowStep[] = [
  {
    key: "DRAFT",
    label: "情報入力",
    icon: "✏️",
    color: "#757575",
    bg: "#f5f5f5",
    tasks: ["価格を入力する", "所在地（市区町村）を入力する", "最寄駅・徒歩分数を入力する", "物件種別を選択する"],
  },
  {
    key: "AD_REQUEST",
    label: "広告確認",
    icon: "📨",
    color: "#e65100",
    bg: "#fff3e0",
    tasks: ["広告確認書を印刷・送付する", "元付業者から承諾を得る", "承諾方法・担当者名を記録する"],
  },
  {
    key: "AD_OK",
    label: "写真・原稿",
    icon: "📷",
    color: "#6a1b9a",
    bg: "#f3e5f5",
    tasks: ["現地で外観写真を撮影する", "室内写真を5枚以上撮影する", "間取り図を登録する", "広告文をAI生成または手入力する"],
  },
  {
    key: "READY_TO_PUBLISH",
    label: "掲載準備",
    icon: "🔧",
    color: "#1565c0",
    bg: "#e3f2fd",
    tasks: ["写真・原稿を最終確認する", "掲載先（HP/ポータル）を設定する", "掲載準備完了にする"],
  },
  {
    key: "PUBLISHED",
    label: "掲載中",
    icon: "🟢",
    color: "#1b5e20",
    bg: "#e8f5e9",
    tasks: ["問い合わせに対応する", "物確（物件確認）を受ける", "定期的に情報を更新する"],
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(status: string): number {
  const idx = STEP_KEYS.indexOf(status);
  if (idx >= 0) return idx;
  // Terminal states
  if (["SOLD_ALERT", "SOLD", "CLOSED"].includes(status)) return STEPS.length;
  if (status === "AD_NG") return 1;
  return 0;
}

interface WorkflowPanelProps {
  status: string;
  photoCount?: number;
  hasCopy?: boolean;
  adConfirmedAt?: string | null;
}

export function WorkflowPanel({
  status,
  photoCount = 0,
  hasCopy = false,
  adConfirmedAt = null,
}: WorkflowPanelProps) {
  const currentIdx = getStepIndex(status);
  const isTerminal = ["AD_NG", "SOLD", "CLOSED"].includes(status);
  const isSoldAlert = status === "SOLD_ALERT";

  const currentStep = STEPS[currentIdx] ?? STEPS[STEPS.length - 1];

  // Dynamic checklist completion
  const getTaskDone = (stepKey: string, task: string): boolean => {
    if (stepKey === "AD_REQUEST" && task.includes("承諾")) return !!adConfirmedAt;
    if (stepKey === "AD_OK" && task.includes("写真")) return photoCount >= 5;
    if (stepKey === "AD_OK" && task.includes("広告文")) return hasCopy;
    return false;
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e0deda",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {/* Progress bar */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f2f1ed" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {STEPS.map((step, idx) => {
            const done = !isTerminal && currentIdx > idx;
            const active = !isTerminal && currentIdx === idx;
            const future = !isTerminal && currentIdx < idx;

            return (
              <div
                key={step.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: idx < STEPS.length - 1 ? 1 : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: done
                        ? "#234f35"
                        : active
                        ? step.color
                        : "#f2f1ed",
                      border: `2px solid ${
                        done ? "#234f35" : active ? step.color : "#d0cec8"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: done ? 14 : 13,
                      transition: "all .2s",
                      color: done || active ? "#fff" : "#aaa",
                      fontWeight: 700,
                    }}
                  >
                    {done ? "✓" : active ? idx + 1 : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: active ? 700 : 400,
                      color: active
                        ? step.color
                        : done
                        ? "#234f35"
                        : "#bbb",
                      whiteSpace: "nowrap",
                      letterSpacing: "-.01em",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      margin: "0 4px",
                      marginBottom: 16,
                      background: done ? "#234f35" : "#e0deda",
                      transition: "background .2s",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Terminal / sold alert badge */}
          {(isTerminal || isSoldAlert) && (
            <div style={{ marginLeft: 12 }}>
              <span
                style={{
                  background:
                    status === "AD_NG"
                      ? "#ffebee"
                      : status === "SOLD_ALERT"
                      ? "#fce4ec"
                      : "#efebe9",
                  color:
                    status === "AD_NG"
                      ? "#c62828"
                      : status === "SOLD_ALERT"
                      ? "#b71c1c"
                      : "#4e342e",
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {status === "AD_NG"
                  ? "❌ 広告不可"
                  : status === "SOLD_ALERT"
                  ? "🔔 成約アラート"
                  : status === "SOLD"
                  ? "🏡 成約済み"
                  : "🔒 掲載終了"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current step tasks */}
      {!isTerminal && currentStep && currentIdx < STEPS.length && (
        <div style={{ padding: "12px 18px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: currentStep.color,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {currentStep.icon} {currentStep.label} — やること
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentStep.tasks.map((task) => {
              const done = getTaskDone(currentStep.key, task);
              return (
                <div
                  key={task}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: done ? "#aaa" : "#3a2a1a",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{done ? "✅" : "◻"}</span>
                  {task}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isSoldAlert && (
        <div
          style={{
            padding: "12px 18px",
            background: "#fff5f5",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#b71c1c",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            🔔 成約アラート — やること
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["元付業者に成約状況を確認する", "成約確定の場合は担当者に報告する", "掲載を継続する場合は「掲載中」に戻す"].map(
              (t) => (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#3a2a1a",
                  }}
                >
                  <span>◻</span>
                  {t}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
