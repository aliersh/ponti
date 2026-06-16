// wallet.jsx — Ponti wallet balance + "Add funds" (testnet faucet) panel.
//
// WALLET BALANCE: account-level USDC you actually hold, distinct from the
// per-person tabs (what someone owes you / you owe them). Money rule applies:
// the amount renders in --ink with TABULAR figures (.tnum), never in accent.
//
// ADD FUNDS: a permanent action, paired with the balance everywhere it shows —
// not only inside the low-USDC settle gate. The funding STEP is a testnet faucet
// for now; it's deliberately isolated to one phase of AddFundsPanel so it can be
// swapped for a real money on-ramp later without redesigning the panel. No
// Coinbase brand / fiat ramp here yet (that's a later mainnet milestone).
//
// Tone: friendly, no crypto jargon, calm about money. "Faucet" is named once
// because the user is going to an external faucet site and needs to recognise it.

const { useState: useW, useEffect: useEffectW, useRef: useRefW } = React;

const FAUCET_URL = "https://faucet.circle.com"; // testnet USDC faucet (swap later)
const FAUCET_GRANT = 20;                         // USDC granted per request

// simple token glyph (ring + center dot) — kept to plain shapes
const WI = {
  coin: (c = "currentColor", s = 16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.3" stroke={c} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" fill={c} />
    </svg>
  ),
};

// ── Full wallet card (account screen / Your Ponti) ─────────────────────────
function WalletCard({ me, onAddFunds }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
      padding: "18px 18px 16px", boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "inline-flex", color: "var(--muted)" }}>{WI.coin("var(--muted)", 15)}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
          letterSpacing: "0.03em", textTransform: "uppercase" }}>Funds available</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 31,
          letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1 }}>
          {money(me.usdc)} <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.02em" }}>USDC</span>
        </div>
        <Button variant="soft" onClick={onAddFunds} style={{ padding: "10px 14px", fontSize: 14 }}>{I.plus("var(--accent)")} Add funds</Button>
      </div>
      <p style={{ margin: "12px 0 0", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        Your own balance, ready when you settle up. Ponti never holds it — it's yours.
      </p>
    </div>
  );
}

// ── Compact wallet strip (Home / feed) ─────────────────────────────────────
function WalletStrip({ me, onAddFunds }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <span style={{ width: 34, height: 34, borderRadius: "50%", flex: "0 0 auto", display: "flex",
        alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--muted)" }}>{WI.coin("var(--muted)", 16)}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Funds available</span>
        <span className="tnum" style={{ fontFamily: "var(--font-ui)", fontSize: 16.5, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {money(me.usdc)} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>USDC</span>
        </span>
      </div>
      <Button variant="soft" onClick={onAddFunds} style={{ padding: "9px 13px", fontSize: 13.5 }}>{I.plus("var(--accent)")} Add funds</Button>
    </div>
  );
}

// ── shared bits for the panel ──────────────────────────────────────────────
function AddressBlock({ me }) {
  const [copied, setCopied] = useW(false);
  function copy() {
    const text = me.fullAddress || me.address;
    try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px",
      background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-ui)", fontVariantNumeric: "tabular-nums",
        fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.address}</span>
      <button onClick={copy} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center",
        gap: 5, color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {copied ? <>{I.check("var(--accent)", 14)} Copied</> : <>{I.copy("var(--accent)")} Copy</>}
      </button>
    </div>
  );
}

function FaucetStep({ n, children }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: "50%", background: "var(--accent-soft)",
        color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, marginTop: 1 }}>{n}</span>
      <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.45 }}>{children}</span>
    </div>
  );
}

// ── Add funds panel (sheet on mobile, modal on desktop) ────────────────────
// phases: guide → waiting → done. "waiting" auto-resolves (no manual refresh).
function AddFundsPanel({ me, placement = "sheet", onClose, onReceived }) {
  const [phase, setPhase] = useW("guide"); // guide | waiting | done
  const [show, setShow] = useW(false);
  const [newBal, setNewBal] = useW(null);
  const timer = useRefW(null);

  useEffectW(() => { const t = setTimeout(() => setShow(true), 10); return () => clearTimeout(t); }, []);
  useEffectW(() => () => timer.current && clearTimeout(timer.current), []);

  function close() { setShow(false); setTimeout(onClose, 240); }

  function openFaucet() {
    try { window.open(FAUCET_URL, "_blank", "noopener,noreferrer"); } catch (e) {}
    setPhase("waiting");
    // Mock auto-detection: the app watches for incoming funds and the balance
    // updates on its own — there is intentionally NO manual refresh button.
    timer.current = setTimeout(() => {
      const next = (me.usdc || 0) + FAUCET_GRANT;
      setNewBal(next);
      onReceived && onReceived(FAUCET_GRANT);
      setPhase("done");
    }, 4500);
  }

  // ── placement container (mirrors FlowSheet) ──
  const place = placement;
  const containerAlign = place === "modal" ? "center" : place === "side" ? "stretch" : "flex-end";
  const containerJustify = place === "side" ? "flex-end" : "center";
  const hidden = place === "modal" ? "translateY(10px) scale(.97)"
    : place === "side" ? "translateX(101%)" : "translateY(101%)";
  const sheetStyle = place === "modal"
    ? { width: "min(440px, calc(100% - 48px))", maxHeight: "calc(100% - 60px)", overflow: "auto", borderRadius: 20,
        padding: "22px 26px 26px", boxShadow: "0 30px 80px -24px rgba(0,0,0,.5), 0 0 0 1px var(--border)",
        opacity: show ? 1 : 0, transition: "transform .3s cubic-bezier(.32,.72,0,1), opacity .24s" }
    : { width: "100%", maxHeight: "92%", overflow: "auto", borderRadius: "22px 22px 0 0", padding: "12px 20px 26px",
        boxShadow: "0 -10px 40px rgba(0,0,0,.18)", transition: "transform .3s cubic-bezier(.32,.72,0,1)" };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 85, display: "flex",
      alignItems: containerAlign, justifyContent: containerJustify }}>
      <div onClick={() => phase !== "waiting" && close()} style={{ position: "absolute", inset: 0,
        background: "rgba(20,14,18,.46)", opacity: show ? 1 : 0, transition: "opacity .24s",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "var(--bg)", boxSizing: "border-box",
        transform: show ? "translateX(0) translateY(0) scale(1)" : hidden, ...sheetStyle }}>
        {place === "sheet" && <div style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border)", margin: "0 auto 12px" }} />}

        {/* header (shared) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: phase === "done" ? 0 : 8 }}>
          <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Add funds</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
              color: "var(--muted)", background: "var(--surface-2)", padding: "3px 7px", borderRadius: 999 }}>Test funds</span>
          </span>
          {phase !== "waiting" && (
            <button onClick={close} aria-label="Close" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 4, display: "inline-flex" }}>
              <svg width="17" height="17" viewBox="0 0 18 18"><path d="M4 4l10 10M14 4L4 14" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>

        {/* ── GUIDE ── */}
        {phase === "guide" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
              Add USDC so you're ready to settle up. It's free — we'll point you to a page that hands out test funds. Takes about a minute.
            </p>

            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
                letterSpacing: "0.03em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Your address</span>
              <AddressBlock me={me} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
                letterSpacing: "0.03em", textTransform: "uppercase" }}>On the funds page</span>
              <FaucetStep n={1}>Choose <strong style={{ color: "var(--ink)", fontWeight: 700 }}>USDC</strong> on the <strong style={{ color: "var(--ink)", fontWeight: 700 }}>Base</strong> network.</FaucetStep>
              <FaucetStep n={2}>Paste the address above.</FaucetStep>
              <FaucetStep n={3}>Request — you can get up to <strong style={{ color: "var(--ink)", fontWeight: 700 }}>20 USDC every 2 hours</strong>.</FaucetStep>
            </div>

            <Button variant="primary" full onClick={openFaucet}>{I.external("var(--accent-ink)")} Open the funds page</Button>

            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", marginTop: -4 }}>
              <span style={{ display: "inline-flex" }}>{I.shield("var(--muted)")}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>No refresh needed — your balance updates here the moment it arrives.</span>
            </div>
          </div>
        )}

        {/* ── WAITING ── passive, auto-detecting, never red ── */}
        {phase === "waiting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Spinner s={20} />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Waiting for your funds…</span>
            </div>
            <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
              You can leave this open — it'll update on its own.
            </p>
            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
                letterSpacing: "0.03em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Your address</span>
              <AddressBlock me={me} />
            </div>
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6,
              textDecoration: "none", color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>
              {I.external("var(--accent)")} Open the funds page again
            </a>
            <Button variant="ghost" full onClick={close} style={{ marginTop: 2 }}>Close — keep watching</Button>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "10px 0 2px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--accent-soft)",
              display: "flex", alignItems: "center", justifyContent: "center", animation: "ponti-pop .4s cubic-bezier(.3,1.5,.5,1)" }}>
              {I.check("var(--accent)", 26)}
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Funds received</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>
              You're ready to settle up.
            </span>
            {newBal != null && (
              <div style={{ marginTop: 4, padding: "10px 16px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)",
                display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>New balance</span>
                <span className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                  {money(newBal)} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>USDC</span>
                </span>
              </div>
            )}
            <Button variant="primary" full onClick={close} style={{ marginTop: 8 }}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { WalletCard, WalletStrip, AddFundsPanel });
