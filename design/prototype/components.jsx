// components.jsx — Ponti shared primitives + icons (Direction B "Puente")
// All visual values come from CSS vars set on the themed root; consume via var().

const money = (n) => {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return s;
};

// ── Brand ──────────────────────────────────────────────
function Wordmark({ size = 22, color = "var(--ink)" }) {
  return (
    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size,
      letterSpacing: "-0.03em", color, lineHeight: 1 }}>ponti</span>
  );
}
function Mark({ s = 28 }) {
  return (
    <svg width={s} height={s * 0.46} viewBox="0 0 100 46" fill="none" style={{ display: "block" }}>
      <line x1="14" y1="23" x2="86" y2="23" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="14" cy="23" r="11" fill="var(--ink)" />
      <circle cx="86" cy="23" r="11" fill="var(--accent)" />
    </svg>
  );
}

// ── Icons (simple shapes only) ─────────────────────────
const I = {
  plus: (c = "currentColor") => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 3v12M3 9h12" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  check: (c = "currentColor", w = 18) => <svg width={w} height={w} viewBox="0 0 18 18"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  arrowIn: (c = "currentColor", w = 16) => <svg width={w} height={w} viewBox="0 0 18 18" fill="none" style={{ display: "block" }}><path d="M9 3.2V12.6M4.6 8.1L9 12.8 13.4 8.1" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowOut: (c = "currentColor", w = 16) => <svg width={w} height={w} viewBox="0 0 18 18" fill="none" style={{ display: "block" }}><path d="M9 14.8V5.4M4.6 9.9L9 5.2 13.4 9.9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  left: (c = "currentColor") => <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12 4l-6 6 6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  right: (c = "currentColor") => <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  dots: (c = "currentColor") => <svg width="18" height="5" viewBox="0 0 18 5"><circle cx="2.5" cy="2.5" r="2" fill={c}/><circle cx="9" cy="2.5" r="2" fill={c}/><circle cx="15.5" cy="2.5" r="2" fill={c}/></svg>,
  shield: (c = "currentColor") => <svg width="15" height="17" viewBox="0 0 15 17" fill="none"><path d="M7.5 1l6 2.2v4.3c0 4-2.6 7-6 8.4C4.1 14.5 1.5 11.5 1.5 7.5V3.2L7.5 1z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 8.3l1.8 1.8L10.2 6.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pencil: (c = "currentColor") => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.8l2.7 2.7M2 12l1-3.2 6.8-6.8 2.2 2.2L5.2 11 2 12z" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash: (c = "currentColor") => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M5 3.5V2.2h4v1.3M3.6 3.5l.5 8h5.8l.5-8" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  globe: (c = "currentColor") => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.6" stroke={c} strokeWidth="1.1"/><path d="M.9 6.5h11.2M6.5.9c1.7 1.6 2.6 3.6 2.6 5.6S8.2 10.9 6.5 12.1C4.8 10.5 3.9 8.5 3.9 6.5S4.8 2.1 6.5.9z" stroke={c} strokeWidth="1.1"/></svg>,
  copy: (c = "currentColor") => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="4.5" y="4.5" width="8" height="8" rx="2" stroke={c} strokeWidth="1.3"/><path d="M2.5 9.5V3a1.5 1.5 0 011.5-1.5h6" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  share: (c = "currentColor") => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5v8M4.5 4l3-3 3 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7.5v4.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V7.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>,
  scan: (c = "currentColor") => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5V3.5A1.5 1.5 0 013.5 2H5M11 2h1.5A1.5 1.5 0 0114 3.5V5M14 11v1.5a1.5 1.5 0 01-1.5 1.5H11M5 14H3.5A1.5 1.5 0 012 12.5V11" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  logout: (c = "currentColor") => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2.5H3.5A1.5 1.5 0 002 4a1.5 1.5 0 000 .5v7a1.5 1.5 0 001.5 1.5H6M9.5 4.5L12.5 7.5l-3 3M12.5 7.5H6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  camera: (c = "currentColor") => <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M2 5.2A1.2 1.2 0 013.2 4h1.4l.9-1.2h4l.9 1.2h1.4A1.2 1.2 0 0113 5.2v5.6A1.2 1.2 0 0111.8 12H3.2A1.2 1.2 0 012 10.8V5.2z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><circle cx="7.5" cy="8" r="2.1" stroke={c} strokeWidth="1.3"/></svg>,
  lock: (c = "currentColor") => <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><rect x="3" y="6.4" width="9" height="6.2" rx="1.5" stroke={c} strokeWidth="1.3"/><path d="M5 6.4V5a2.5 2.5 0 015 0v1.4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  external: (c = "currentColor") => <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M6.5 3H3.5A1.5 1.5 0 002 4.5v7A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5v-3M9 2.5h3.5V6M12.5 2.5L7 8" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sun: (c = "currentColor", w = 16) => <svg width={w} height={w} viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3.4" stroke={c} strokeWidth="1.5"/><path d="M9 1.6v1.9M9 14.5v1.9M1.6 9h1.9M14.5 9h1.9M3.8 3.8l1.3 1.3M12.9 12.9l1.3 1.3M14.2 3.8l-1.3 1.3M5.1 12.9l-1.3 1.3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  moon: (c = "currentColor", w = 16) => <svg width={w} height={w} viewBox="0 0 18 18" fill="none"><path d="M15 10.6A6.6 6.6 0 117.4 3 5.1 5.1 0 0015 10.6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
};

// ── Atoms ──────────────────────────────────────────────
function Avatar({ initial, tone = "accent", size = 44 }) {
  const accent = tone === "accent";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flex: "0 0 auto",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: size * 0.4,
      background: accent ? "var(--accent-soft)" : "var(--surface-2)",
      color: accent ? "var(--accent)" : "var(--muted)",
    }}>{initial}</div>
  );
}

// Editable profile avatar: click to upload a real photo (persisted), initial as fallback.
function AvatarUpload({ initial, tone = "accent", size = 52, storageKey = "ponti_avatar", editable = true }) {
  const [src, setSrc] = React.useState(() => { try { return localStorage.getItem(storageKey) || ""; } catch (e) { return ""; } });
  const inputRef = React.useRef(null);
  const accent = tone === "accent";
  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setSrc(r.result); try { localStorage.setItem(storageKey, r.result); } catch (err) {} };
    r.readAsDataURL(f);
  };
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <button onClick={() => editable && inputRef.current && inputRef.current.click()}
        aria-label="Change profile photo"
        style={{ all: "unset", cursor: editable ? "pointer" : "default", display: "block",
          width: size, height: size, borderRadius: "50%", overflow: "hidden",
          background: src ? `center/cover no-repeat url(${src})` : (accent ? "var(--accent-soft)" : "var(--surface-2)") }}>
        {!src && (
          <span style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: size * 0.4,
            color: accent ? "var(--accent)" : "var(--muted)" }}>{initial}</span>
        )}
      </button>
      {editable && (
        <span onClick={() => inputRef.current && inputRef.current.click()}
          style={{ position: "absolute", right: -1, bottom: -1, width: size * 0.36, height: size * 0.36,
            minWidth: 18, minHeight: 18, borderRadius: "50%", cursor: "pointer",
            background: "var(--accent)", color: "var(--accent-ink)", border: "2px solid var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>{I.camera("var(--accent-ink)")}</span>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
    </div>
  );
}

// Read-only account email row — shown, never editable here.
function AccountEmail({ email }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <span style={{ display: "inline-flex", color: "var(--muted)" }}>{I.lock("var(--muted)")}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
          letterSpacing: "0.02em", textTransform: "uppercase" }}>Account email</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>Used to sign in</span>
    </div>
  );
}

function Num({ children, size = 16, weight = 700, color = "var(--ink)", display = false }) {
  return (
    <span className="tnum" style={{
      fontFamily: display ? "var(--font-display)" : "var(--font-ui)",
      fontWeight: weight, fontSize: size, color, letterSpacing: display ? "-0.02em" : "-0.012em",
      fontVariantNumeric: "tabular-nums lining-nums",
    }}>{children}</span>
  );
}

function Button({ children, variant = "primary", full = false, onClick, disabled, style = {} }) {
  const base = {
    fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, lineHeight: 1,
    border: "none", cursor: disabled ? "default" : "pointer", borderRadius: "var(--radius-sm)",
    padding: "14px 18px", width: full ? "100%" : "auto", display: "inline-flex",
    alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap", lineHeight: 1.15,
    transition: "filter .15s, opacity .15s",
    opacity: disabled ? 0.5 : 1, WebkitTapHighlightColor: "transparent", ...style,
  };
  const variants = {
    primary: { background: "var(--accent-strong)", color: "var(--accent-ink)" },
    ghost: { background: "var(--surface-2)", color: "var(--ink)", boxShadow: "inset 0 0 0 1px var(--border)" },
    outline: { background: "transparent", color: "var(--ink)", boxShadow: "inset 0 0 0 1.5px var(--accent)" },
    soft: { background: "var(--accent-soft)", color: "var(--accent)" },
    quiet: { background: "transparent", color: "var(--muted)", padding: "10px 12px" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}
    onMouseDown={(e) => e.preventDefault()}>{children}</button>;
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { background: "var(--surface-2)", color: "var(--muted)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)" },
    ok: { background: "var(--surface-2)", color: "var(--muted)" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)",
      fontSize: 12, fontWeight: 600, padding: "4px 9px", borderRadius: 999, ...tones[tone] }}>{children}</span>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)" }}>{hint}</span>}
    </label>
  );
}

function Input(props) {
  return <input {...props} style={{
    fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--ink)", background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "13px 14px",
    width: "100%", outline: "none", ...props.style,
  }} />;
}

function Skeleton({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ── Appearance toggle (in-app light/dark) ──────────────
// Real product control (not the Tweaks panel). Shares state with the theme so
// the choice persists. Segmented Light/Dark, matching the app's other segmented
// controls; the active side lifts onto a surface card with an accent icon.
function ThemeToggle({ dark, onChange }) {
  const opts = [["light", "Light", I.sun], ["dark", "Dark", I.moon]];
  return (
    <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--surface-2)",
      border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
      {opts.map(([k, lbl, icon]) => {
        const on = (k === "dark") === !!dark;
        return (
          <button key={k} onClick={() => onChange(k === "dark")} aria-pressed={on}
            style={{ all: "unset", cursor: "pointer", flex: 1, display: "inline-flex", alignItems: "center",
              justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: "calc(var(--radius-sm) - 2px)",
              fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, transition: "background .15s, color .15s",
              background: on ? "var(--surface)" : "transparent",
              color: on ? "var(--ink)" : "var(--muted)",
              boxShadow: on ? "var(--shadow)" : "none" }}>
            {icon(on ? "var(--accent)" : "var(--muted)", 16)} {lbl}
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 2px" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: ".07em",
        textTransform: "uppercase", color: "var(--muted)" }}>{children}</span>
      {right}
    </div>
  );
}

// ── Group row (Home list) ──────────────────────────────
function balanceWords(balance) {
  if (balance === 0) return { line: "Settled up", sign: "", amount: "", owe: false };
  if (balance > 0) return { line: "owes you", sign: "+", amount: money(balance), owe: false };
  return { line: "you owe", sign: "−", amount: money(balance), owe: true };
}

// ── Directional flow chip — LOCKED balance-direction treatment (Option A) ──
// Arrow (↓ in · ↑ out · ✓ settled) + word, in a pill. The accent reinforces the
// "you owe" side only (it carries a pending Settle action); "owes you" + settled
// stay neutral. Honors the money rule: this is a label element, never the number,
// so no amount is ever colored. The chip carries direction → drop the +/− sign.
function DirChip({ balance, size = "md", label }) {
  const dir = balance === 0 ? "settled" : balance < 0 ? "out" : "in";
  const isAccent = dir === "out";
  const word = label != null ? label
    : dir === "settled" ? "settled up" : dir === "out" ? "you owe" : "owes you";
  const fs = size === "sm" ? 11.5 : size === "lg" ? 13 : 12.5;
  const pad = size === "sm" ? "3px 8px 3px 6px" : "5px 11px 5px 8px";
  const c = isAccent ? "var(--accent)" : "var(--muted)";
  const icon = dir === "in" ? I.arrowIn(c, fs + 3) : dir === "out" ? I.arrowOut(c, fs + 3) : I.check(c, fs + 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)",
      fontSize: fs, fontWeight: 600, padding: pad, borderRadius: 999, whiteSpace: "nowrap",
      background: isAccent ? "var(--accent-soft)" : "var(--surface-2)", color: c }}>{icon}{word}</span>
  );
}

function GroupRow({ g, onClick }) {
  const b = balanceWords(g.balance);
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 13,
      padding: "13px 14px", background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", width: "100%", boxSizing: "border-box",
      WebkitTapHighlightColor: "transparent",
    }}>
      <Avatar initial={g.initial} tone={g.tone} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{g.nickname}</span>
          {g.crossBorder && <span style={{ color: "var(--muted)", display: "inline-flex" }}>{I.globe("var(--muted)")}</span>}
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>{g.lastActivity ? `Last active ${g.lastActivity}` : "No activity yet"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {g.balance === 0
          ? <DirChip balance={0} size="sm" />
          : <>
              <Num size={16} weight={700}>{b.amount}</Num>
              <DirChip balance={g.balance} size="sm" />
            </>}
      </div>
    </button>
  );
}

// ── Faux QR (rounded modules + finder squares; deterministic from value) ──
function QRCode({ value = "ponti", size = 168, fg = "var(--ink)" }) {
  const N = 23;
  let seed = 2166136261;
  for (const ch of value) seed = ((seed ^ ch.charCodeAt(0)) * 16777619) >>> 0;
  const rnd = (i) => { let h = (seed + i * 2654435761) >>> 0; h ^= h >>> 13; h = (h * 1274126177) >>> 0; return ((h >>> 16) & 1023) / 1023; };
  const cell = size / N;
  const inBox = (x, y, ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
  const isFinder = (x, y) => inBox(x, y, 0, 0) || inBox(x, y, N - 7, 0) || inBox(x, y, 0, N - 7);
  const finderOn = (x, y) => {
    const f = (ox, oy) => { const dx = x - ox, dy = y - oy; if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
      const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6; const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4; return ring || core; };
    const a = f(0, 0); if (a !== null) return a; const b = f(N - 7, 0); if (b !== null) return b; const c = f(0, N - 7); return c === null ? false : c;
  };
  const rects = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const on = isFinder(x, y) ? finderOn(x, y) : rnd(y * N + x) > 0.52;
    if (on) rects.push(<rect key={x + "-" + y} x={x * cell + cell * 0.06} y={y * cell + cell * 0.06}
      width={cell * 0.88} height={cell * 0.88} rx={cell * 0.28} fill={fg} />);
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>{rects}</svg>;
}

Object.assign(window, {
  money, Wordmark, Mark, I, Avatar, AvatarUpload, AccountEmail, Num, Button, Pill, Field, Input, Skeleton,
  SectionLabel, balanceWords, DirChip, GroupRow, QRCode, ThemeToggle,
});
