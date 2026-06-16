// flow.jsx — Ponti FlowWidget: one informed consent → in-flight → success.
// Covers every write (create / add / edit / delete / settle). Settle's single
// gate covers the atomic approve+settle batch (one consent per user intent).
// Tone variants: "calm" (sober/Stripe), "wink" (warm edge), "playful" (game-ish).

const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

// Step scripts — plain language, no crypto jargon. "Signing" becomes the human
// "making sure it's you". Approving is its own explicit button (the confirm gate);
// these steps are what happens *after* you approve — never an auto-accept.
function stepsFor(kind, tone) {
  const send = kind === "settle" ? "Sending the money"
    : kind === "delete" ? "Removing it"
    : kind === "create" ? "Setting it up"
    : "Saving it down";
  if (tone === "playful") return ["Getting ready", "Making sure it's you", send, "Almost there"];
  if (tone === "wink")    return ["Getting ready", "Checking it's you", send, "Wrapping up"];
  return ["Preparing", "Confirming it's you", send, "Finishing"];
}

// The CTA (confirmLabel) is always the explicit approval button — set per action
// in the launchers ("Settle 28.00 USDC", "Add expense", …). Tone only flavors the
// soft copy around the numbers; the numbers themselves stay calm.
//
// PHRASE ROTATION: confirmSub / runningNote / doneTitle are ARRAYS. One variant is
// picked at random per flow open (stable for that open via a ref). The done line
// reads from the flow's doneSub[Wink|Playful], which may ALSO be an array. To add
// more variety, just push strings to these arrays — no other wiring needed.
// (Tech note for handoff: rotation is client-side, presentational only.)
// PER-ACTION done-subtitle pools (wink). DECIDED Jun 16: confirmSub / runningNote /
// doneTitle are SHARED by state; doneSub is PER ACTION and a DISTINCT pool from
// doneTitle (it never repeats a title). {name} = counterparty nickname (flow.who).
const DONE_SUB_WINK = {
  create: [
    "Your shared tab with {name} is ready.",
    "You and {name} are connected — start adding what you spend.",
  ],
  add: [
    "On the tab — the balance just updated.",
    "Added. Future-you will thank present-you.",
  ],
  edit: [
    "Updated — the balance recalculated to match.",
    "Fixed. The tab remembers the new details.",
  ],
  delete: [
    "Removed — the history still notes it was there.",
    "Gone from the balance; the trail keeps the record.",
  ],
  settle: [
    "You and {name} are even again.",
    "Balance back to zero — nothing owed either way.",
  ],
};
function doneSubPool(f, fallback) {
  const pool = DONE_SUB_WINK[f.kind] || (f.doneSub ? [f.doneSub] : [fallback || "All set."]);
  const name = f.who || "them";
  return pool.map((s) => s.replace(/\{name\}/g, name));
}

const COPY = {
  calm: {
    confirmSub: [
      "You approve once. Ponti never holds your money.",
      "One approval, then it's done. Your money never touches Ponti.",
    ],
    runningNote: [
      "This takes a few seconds. You can keep it open.",
      "A few seconds. Feel free to keep this open.",
    ],
    doneTitle: ["All set", "Done"],
    doneSub: (f) => f.doneSub || "Done.",
  },
  wink: {
    confirmSub: [
      "Just the two of you and the math. Your money, not ours.",
      "You, them, and the numbers. We never hold a cent.",
      "One approval and it's logged. Ponti never touches the money.",
      "You're in control — one tap, and we keep the count.",
    ],
    runningNote: [
      "Hang tight — this only takes a moment.",
      "One sec — putting it where it belongs.",
      "Almost there — you can keep this open.",
    ],
    doneTitle: ["Squared away", "Sorted", "All set", "Done"],
    doneSub: (f) => doneSubPool(f),
  },
  playful: {
    confirmSub: [
      "One tap and you're even. We'll do the boring part.",
      "Tap once; we'll sweat the details.",
      "You approve, we crunch the rest. Deal?",
    ],
    runningNote: [
      "Doing the math so you don't have to…",
      "Carrying the ones…",
      "Making the numbers behave…",
    ],
    doneTitle: ["Done and dusted", "Nailed it", "That's a wrap"],
    doneSub: (f) => f.doneSubPlayful || f.doneSub || "That's that.",
  },
};

// pick a stable random element (or pass-through non-arrays)
function rotPick(v) { return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v; }

function ConsentRow({ label, value, strong }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12,
      padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: strong ? 16 : 14, fontWeight: strong ? 700 : 600,
        color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// calm / wink progress: labelled bar
function BarProgress({ steps, idx }) {
  const pct = ((idx + 1) / steps.length) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0 4px" }}>
      <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: "var(--accent)", borderRadius: 999,
          transition: "width .5s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Spinner />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{steps[idx]}…</span>
      </div>
    </div>
  );
}

// playful progress: point-to-point node track, accent token travels across
function NodeTrack({ steps, idx }) {
  const n = steps.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0 2px" }}>
      <div style={{ position: "relative", height: 26, margin: "0 11px" }}>
        <div style={{ position: "absolute", top: 11, left: 0, right: 0, height: 4, borderRadius: 999, background: "var(--surface-2)" }} />
        <div style={{ position: "absolute", top: 11, left: 0, height: 4, borderRadius: 999, background: "var(--accent)",
          width: `${(idx / (n - 1)) * 100}%`, transition: "width .55s cubic-bezier(.5,1.4,.4,1)" }} />
        {steps.map((_, i) => {
          const left = `${(i / (n - 1)) * 100}%`;
          const reached = i <= idx;
          return (
            <div key={i} style={{ position: "absolute", top: 3, left, transform: "translateX(-50%)",
              width: i === idx ? 22 : 14, height: i === idx ? 22 : 14, marginTop: i === idx ? -1 : 3,
              borderRadius: "50%", background: reached ? "var(--accent)" : "var(--surface)",
              boxShadow: reached ? "none" : "inset 0 0 0 2px var(--border)",
              transition: "all .4s", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i === idx && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-ink)" }} />}
            </div>
          );
        })}
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, color: "var(--ink)", textAlign: "center" }}>{steps[idx]}…</span>
    </div>
  );
}

function Spinner({ s = 18 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" style={{ animation: "ponti-spin .8s linear infinite" }}>
      <circle cx="9" cy="9" r="7" stroke="var(--surface-2)" strokeWidth="2.4" fill="none" />
      <path d="M9 2a7 7 0 016.06 3.5" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function FlowSheet({ flow, tone = "calm", placement = "sheet", outcome = "ok", onClose, onComplete }) {
  const [phase, setPhase] = useStateF("confirm"); // confirm | running | done | error-send | error-receipt
  const [idx, setIdx] = useStateF(0);
  const [show, setShow] = useStateF(false);
  const timers = useRefF([]);
  const c = COPY[tone] || COPY.calm;
  const steps = stepsFor(flow.kind, tone);
  // rotation: pick one variant per open, stable for this flow's lifecycle
  const picked = useRefF(null);
  if (!picked.current) picked.current = {
    confirmSub: rotPick(c.confirmSub),
    runningNote: rotPick(c.runningNote),
    doneTitle: rotPick(c.doneTitle),
    doneSub: rotPick(c.doneSub(flow)),
  };

  useEffectF(() => { const t = setTimeout(() => setShow(true), 10); return () => clearTimeout(t); }, []);
  useEffectF(() => () => timers.current.forEach(clearTimeout), []);

  function run() {
    setPhase("running"); setIdx(0);
    // send-failed stops early (the write never lands); receipt-failed and ok run
    // the full track (the write did land — only the confirmation/refresh lags).
    const n = outcome === "send-failed" ? Math.min(2, steps.length) : steps.length;
    for (let i = 1; i < n; i++) {
      timers.current.push(setTimeout(((k) => () => setIdx(k))(i), i * 720));
    }
    const finalPhase = outcome === "send-failed" ? "error-send"
      : outcome === "receipt-failed" ? "error-receipt" : "done";
    timers.current.push(setTimeout(() => setPhase(finalPhase), n * 720 + 250));
  }

  function close(done) {
    setShow(false);
    setTimeout(() => { onClose(); if (done) onComplete && onComplete(); }, 240);
  }

  // placement: "sheet" (mobile, rises from bottom) | "modal" (centered card) | "side" (right rail)
  const place = placement;
  const containerAlign = place === "modal" ? "center" : place === "side" ? "stretch" : "flex-end";
  const containerJustify = place === "side" ? "flex-end" : "center";
  const hidden = place === "modal" ? "translateY(10px) scale(.97)"
    : place === "side" ? "translateX(101%)"
    : "translateY(101%)";
  const sheetStyle = place === "modal"
    ? { width: "min(440px, calc(100% - 48px))", borderRadius: 20, padding: "22px 26px 26px",
        boxShadow: "0 30px 80px -24px rgba(0,0,0,.5), 0 0 0 1px var(--border)",
        opacity: show ? 1 : 0, transition: "transform .3s cubic-bezier(.32,.72,0,1), opacity .24s" }
    : place === "side"
    ? { width: "min(430px, 92%)", height: "100%", borderRadius: "22px 0 0 22px", padding: "22px 26px 30px",
        boxShadow: "-20px 0 60px -20px rgba(0,0,0,.4)", transition: "transform .34s cubic-bezier(.32,.72,0,1)" }
    : { width: "100%", borderRadius: "22px 22px 0 0", padding: "12px 20px 30px",
        boxShadow: "0 -10px 40px rgba(0,0,0,.18)", transition: "transform .3s cubic-bezier(.32,.72,0,1)" };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, display: "flex",
      alignItems: containerAlign, justifyContent: containerJustify }}>
      {/* scrim — receipt-failed is already saved, so dismissing it commits */}
      <div onClick={() => phase !== "running" && close(phase === "error-receipt")} style={{ position: "absolute", inset: 0,
        background: "rgba(20,14,18,.46)", opacity: show ? 1 : 0, transition: "opacity .24s",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      {/* sheet / modal / side panel */}
      <div style={{ position: "relative", background: "var(--bg)", boxSizing: "border-box",
        transform: show ? "translateX(0) translateY(0) scale(1)" : hidden, ...sheetStyle }}>
        {place === "sheet" && <div style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border)", margin: "0 auto 14px" }} />}

        {phase === "confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)",
              letterSpacing: "-0.02em" }}>{flow.title}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", marginBottom: 8 }}>{picked.current.confirmSub}</span>
            <div style={{ margin: "4px 0 6px" }}>
              {flow.rows.map((r, i) => <ConsentRow key={i} {...r} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", margin: "4px 0 12px" }}>
              <span style={{ display: "inline-flex" }}>{I.shield("var(--accent)")}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5 }}>
                {flow.kind === "settle"
                  ? `The money goes straight to ${flow.who || "them"}. Ponti never holds it.`
                  : "Free to record. Nothing moves until you choose to settle."}
              </span>
            </div>
            <Button variant="primary" full onClick={run}>{flow.confirmLabel}</Button>
            <Button variant="quiet" full onClick={() => close(false)} style={{ marginTop: 2 }}>Cancel</Button>
          </div>
        )}

        {phase === "running" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)",
              letterSpacing: "-0.02em" }}>{flow.runningTitle || flow.title}</span>
            {tone === "playful" ? <NodeTrack steps={steps} idx={idx} /> : <BarProgress steps={steps} idx={idx} />}
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", textAlign: tone === "playful" ? "center" : "left" }}>
              {picked.current.runningNote}
            </span>
          </div>
        )}

        {phase === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "6px 0 2px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--accent-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ponti-pop .4s cubic-bezier(.3,1.5,.5,1)" }}>
              {I.check("var(--accent)", 26)}
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)",
              letterSpacing: "-0.02em" }}>{picked.current.doneTitle}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>{picked.current.doneSub}</span>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: "var(--font-ui)", fontSize: 13,
              fontWeight: 600, color: "var(--accent)", textDecoration: "none", marginTop: 2 }}>View receipt ↗</a>
            <Button variant="primary" full onClick={() => close(true)} style={{ marginTop: 8 }}>Done</Button>
          </div>
        )}

        {/* send-failed: nothing happened — wink, never red, retryable */}
        {phase === "error-send" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "6px 0 2px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--surface-2)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--muted)", lineHeight: 1 }}>!</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>That didn't go through</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", textAlign: "center", maxWidth: 300 }}>
              Nothing moved and nothing's lost — give it another go.
            </span>
            <Button variant="primary" full onClick={run} style={{ marginTop: 8 }}>Try again</Button>
            <Button variant="quiet" full onClick={() => close(false)} style={{ marginTop: 2 }}>Cancel</Button>
          </div>
        )}

        {/* receipt-failed: it DID go through — no failure framing, no re-send */}
        {phase === "error-receipt" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "6px 0 2px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--accent-soft)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {I.check("var(--accent)", 26)}
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>It's saved — just catching up</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
              <Spinner s={14} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", textAlign: "center", maxWidth: 300 }}>
                Your change went through. We're still waiting on the confirmation to show — it'll appear on its own.
              </span>
            </div>
            <Button variant="primary" full onClick={() => close(true)} style={{ marginTop: 8 }}>Done</Button>
            <a href="#" onClick={(e) => { e.preventDefault(); close(true); }} style={{ fontFamily: "var(--font-ui)", fontSize: 13,
              fontWeight: 600, color: "var(--muted)", textDecoration: "none", marginTop: 2 }}>Reload to see the latest</a>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FlowSheet });
