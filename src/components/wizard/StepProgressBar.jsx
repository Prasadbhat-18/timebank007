export default function StepProgressBar({ steps, currentStep }) {
  return (
    <div className="mx-auto mb-8 flex w-full max-w-sm items-center" style={{ display: "flex", width: "100%", maxWidth: 420, margin: "0 auto 1.75rem", alignItems: "center", justifyContent: "space-between" }}>
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center" style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div className="flex flex-col items-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < currentStep ? 'bg-emerald-600 text-white' : i === currentStep ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: i < currentStep ? "var(--em, #10b981)" : i === currentStep ? "var(--purple, #6366f1)" : "rgba(255,255,255,0.08)",
                color: i <= currentStep ? "#ffffff" : "var(--text-muted, #94a3b8)",
                border: i === currentStep ? "2px solid var(--purple, #6366f1)" : "1px solid rgba(255,255,255,0.1)",
                boxShadow: i === currentStep ? "0 0 12px rgba(99, 102, 241, 0.4)" : "none",
                transition: "all 0.25s ease",
              }}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className="mt-1 w-16 text-center text-[10px] text-slate-500" style={{ marginTop: 6, width: 64, textAlign: "center", fontSize: 10.5, color: i === currentStep ? "var(--text, #fff)" : "var(--text-muted, #94a3b8)", fontWeight: i === currentStep ? 700 : 500 }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 flex-1 transition-colors ${i < currentStep ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ margin: "0 4px", height: 2, flex: 1, background: i < currentStep ? "var(--em, #10b981)" : "rgba(255,255,255,0.08)", transition: "all 0.25s ease" }} />
          )}
        </div>
      ))}
    </div>
  );
}
