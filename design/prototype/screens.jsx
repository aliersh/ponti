// screens.jsx — Ponti screens. Consume primitives from window (components.jsx).
const { useState: useS, useMemo: useM } = React;

// ── Sign in ────────────────────────────────────────────
function SignIn({ onLogin }) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "0 24px",
      background: "var(--bg)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Mark s={44} />
          <Wordmark size={40} />
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700,
            lineHeight: 1.12, letterSpacing: "-0.02em", color: "var(--ink)", textWrap: "balance" }}>
            For people who share expenses, but not the same place.
          </h1>
          <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>
            One balance, wherever you live. Settle directly, in USDC.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input placeholder="you@email.com" inputMode="email" />
          <Button variant="primary" full onClick={onLogin}>Continue with email</Button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "20px 0 26px",
        color: "var(--muted)" }}>
        <span style={{ display: "inline-flex" }}>{I.shield("var(--muted)")}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5 }}>Ponti never holds your money. It only keeps the count.</span>
      </div>
    </div>
  );
}

// ── Home header ────────────────────────────────────────
function AppHeader({ me, onProfile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 4px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Mark s={22} />
        <Wordmark size={21} />
      </div>
      <button onClick={onProfile} style={{ all: "unset", cursor: "pointer" }} aria-label="Your Ponti">
        <Avatar initial={me.initial} tone="neutral" size={34} />
      </button>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────
function Home({ data, demoState, onOpenGroup, onCreate, onProfile, onAddFunds }) {
  const groups = data.groups;
  const net = groups.reduce((s, g) => s + g.balance, 0);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "0 18px 28px",
      display: "flex", flexDirection: "column" }}>
      <AppHeader me={data.me} onProfile={onProfile} />

      {/* net summary */}
      <div style={{ padding: "2px 2px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <DirChip balance={net} label={net > 0 ? "You're owed" : net < 0 ? "You owe" : "Settled up"} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600,
            color: "var(--muted)" }}>across everyone</span>
        </div>
        <div className="pnum" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 38,
          letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1.1 }}>
          {money(net)} <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.02em", marginLeft: 1 }}>USDC</span>
        </div>
      </div>

      <SectionLabel right={
        <button onClick={onCreate} style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 5, color: "var(--accent)", fontFamily: "var(--font-ui)",
          fontSize: 13, fontWeight: 700 }}>{I.plus("var(--accent)")} New</button>
      }>People you share with</SectionLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 8 }}>
        {demoState === "loading" && [0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <Skeleton w={44} h={44} r={22} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              <Skeleton w={"55%"} h={13} /><Skeleton w={"35%"} h={11} />
            </div>
            <Skeleton w={56} h={16} />
          </div>
        ))}

        {demoState === "empty" && (
          <EmptyState icon={<Mark s={40} />} title="No groups yet"
            body="A group is one shared account between two people. Start one and add your first expense."
            cta="Create a group" onCta={onCreate} />
        )}

        {demoState === "error" && (
          <EmptyState icon={<div style={{ color: "var(--accent)" }}>{I.globe("var(--accent)")}</div>}
            title="Couldn't reach the network"
            body="We couldn't load your groups just now. This is a connection hiccup, not a lost balance — nothing was lost, and your money is exactly where it was."
            cta="Try again" onCta={() => {}} tone="error" />
        )}

        {demoState === "normal" && groups.map((g) => (
          <GroupRow key={g.id} g={g} onClick={() => onOpenGroup(g)} />
        ))}
      </div>

      {/* wallet = UTILITY ("what I can pay with") — a DIFFERENT category from the
          relational net + per-group balances above. Set apart by a real hairline so
          it never reads as a third balance. */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <SectionLabel>Your account</SectionLabel>
        <div style={{ marginTop: 8 }}>
          <WalletStrip me={data.me} onAddFunds={onAddFunds} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body, cta, onCta, tone }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      textAlign: "center", padding: "40px 20px", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <div style={{ opacity: tone === "error" ? 1 : 0.9, marginBottom: 2 }}>{icon}</div>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)",
        letterSpacing: "-0.02em" }}>{title}</span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5,
        maxWidth: 280 }}>{body}</span>
      {cta && <Button variant={tone === "error" ? "ghost" : "primary"} onClick={onCta} style={{ marginTop: 6 }}>{cta}</Button>}
    </div>
  );
}

// ── Group detail ───────────────────────────────────────
function splitSegments(items) {
  const segments = []; let cur = [];
  for (const it of items) {
    if (it.kind === "settle") { segments.push({ settle: it, items: cur }); cur = []; }
    else cur.push(it);
  }
  return { open: cur, segments };
}

function ExpenseRow({ e, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", flex: "0 0 auto", display: "flex",
        alignItems: "center", justifyContent: "center", background: e.mine ? "var(--accent-soft)" : "var(--surface-2)",
        color: e.mine ? "var(--accent)" : "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>
        {e.mine ? "Y" : e.payer[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{e.desc}</span>
          {e.edited && <Pill tone="neutral">{I.pencil("var(--muted)")} edited</Pill>}
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>
          {e.mine ? "You paid" : `${e.payer} paid`} · {e.at}
        </span>
      </div>
      <Num size={15} weight={700} color="var(--ink)">{money(e.amount)}</Num>
    </div>
  );
}

function SettleDivider({ s, collapsed, onToggle, count }) {
  return (
    <button onClick={onToggle} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
      gap: 10, padding: "10px 2px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ width: 34, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{I.check("var(--muted)", 14)}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--muted)" }}>
          Settled up · {s.at}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)" }}>
          {s.by} settled {money(s.amount)} USDC · {count} item{count !== 1 ? "s" : ""}
        </span>
      </div>
      <span style={{ color: "var(--muted)", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform .2s" }}>{I.right("var(--muted)")}</span>
    </button>
  );
}

function GroupDetail({ g, data, postWrite, onBack, onAdd, onSettle, onEditExpense, onDeleteExpense, lowUsdc, onAddFunds }) {
  const items = data.timeline[g.id] || [];
  const { open, segments } = useM(() => splitSegments(items), [items]);
  const [openSeg, setOpenSeg] = useS({});
  const b = balanceWords(g.balance);
  const youOwe = g.balance < 0;
  // Low-USDC settle gate: only truly "short" when the demo flag is on AND the
  // wallet balance can't cover what's owed. Adding funds clears it reactively.
  const owe = Math.abs(g.balance);
  const have = data.me.usdc || 0;
  const short = youOwe && lowUsdc && have < owe;
  const need = Math.max(0, owe - have);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "0 18px 30px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0 12px" }}>
        <button onClick={onBack} style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 3, color: "var(--ink)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15 }}>
          {I.left("var(--ink)")} Groups
        </button>
        <button style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 6 }}>{I.dots("var(--muted)")}</button>
      </div>

      {/* person */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "2px 0 18px" }}>
        <Avatar initial={g.initial} tone={g.tone} size={48} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{g.nickname}</span>
            {g.crossBorder && <Pill tone="neutral">{I.globe("var(--muted)")} cross-border</Pill>}
          </div>
          <button style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5,
            color: "var(--muted)" }}>{g.lastActivity ? `Last active ${g.lastActivity}` : "Shared tab"} · details {I.right("var(--muted)")}</button>
        </div>
      </div>

      {/* balance hero */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        padding: "20px 18px", boxShadow: "var(--shadow)" }}>
        <div style={{ marginBottom: 11 }}>
          <DirChip balance={g.balance} size="lg"
            label={g.balance === 0 ? "All settled up" : (youOwe ? `You owe ${g.nickname}` : `${g.nickname} owes you`)} />
        </div>
        <div className="pnum" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 44,
          letterSpacing: "-0.045em", color: "var(--ink)", lineHeight: 1.05, margin: 0 }}>
          {g.balance === 0 ? "Settled" : <>{money(g.balance)} <span style={{ fontSize: 18, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.02em", marginLeft: 1 }}>USDC</span></>}
        </div>

        {/* post-write reassurance — grey, never red */}
        {postWrite && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--muted)" }}>
            <Spinner s={15} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5 }}>{postWrite}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <Button variant="primary" onClick={onAdd} style={{ flex: 1 }}>{I.plus("var(--accent-ink)")} Add expense</Button>
          {youOwe && (short
            ? <Button variant="ghost" disabled style={{ flex: 1 }}>Settle</Button>
            : <Button variant="outline" onClick={onSettle} style={{ flex: 1 }}>Settle {money(g.balance)}</Button>)}
        </div>

        {short && (
          <div style={{ marginTop: 12, padding: "11px 13px", background: "var(--accent-soft)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--accent)", fontWeight: 600 }}>
              You need {money(need)} more USDC to settle.{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onAddFunds && onAddFunds(); }} style={{ color: "var(--accent)", textDecoration: "underline" }}>Add funds</a>
            </span>
          </div>
        )}
      </div>

      {/* timeline */}
      <div style={{ marginTop: 22 }}>
        <SectionLabel>Activity</SectionLabel>
        <div style={{ marginTop: 6 }}>
          {open.length === 0 && segments.length === 0 && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "8px 2px" }}>No expenses yet.</p>
          )}
          {open.slice().reverse().map((e) => (
            <ExpenseRowWrap key={e.id} e={e} onEdit={() => onEditExpense(e)} onDelete={() => onDeleteExpense(e)} />
          ))}
          {segments.slice().reverse().map((seg, si) => {
            const isOpen = !!openSeg[seg.settle.id];
            return (
              <div key={seg.settle.id} style={{ borderTop: "1px solid var(--border)", marginTop: 6 }}>
                <SettleDivider s={seg.settle} collapsed={!isOpen} count={seg.items.length}
                  onToggle={() => setOpenSeg((o) => ({ ...o, [seg.settle.id]: !o[seg.settle.id] }))} />
                {isOpen && (
                  <div style={{ paddingLeft: 6, opacity: 0.85 }}>
                    {seg.items.slice().reverse().map((e) => (
                      <ExpenseRowWrap key={e.id} e={e} onEdit={() => onEditExpense(e)} onDelete={() => onDeleteExpense(e)} muted />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// expense row with swipe-less inline actions revealed on hover/press
function ExpenseRowWrap({ e, onEdit, onDelete, muted }) {
  const [open, setOpen] = useS(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", opacity: muted ? 0.92 : 1,
      background: open ? "var(--surface-2)" : "transparent", borderRadius: open ? "var(--radius-sm)" : 0,
      transition: "background .15s" }}>
      <div onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer", padding: open ? "0 8px" : 0 }}>
        <ExpenseRow e={e} />
      </div>
      {open && (
        <div style={{ display: "flex", gap: 8, padding: "2px 10px 12px" }}>
          <Button variant="soft" onClick={onEdit} style={{ padding: "8px 12px", fontSize: 13 }}>{I.pencil("var(--accent)")} Edit</Button>
          <Button variant="ghost" onClick={onDelete} style={{ padding: "8px 12px", fontSize: 13 }}>{I.trash("var(--muted)")} Delete</Button>
        </div>
      )}
    </div>
  );
}

// ── Add someone / create group ─────────────────────────
function CreateGroup({ onBack, onSubmit, onShare }) {
  const [nick, setNick] = useS("");
  const [link, setLink] = useS("");
  const [scanning, setScanning] = useS(false);
  const ok = nick.trim() && link.trim().length > 4;
  return (
    <FormScreen title="Add someone" onBack={onBack}
      sub="Paste their link or scan their QR to start a shared tab. A Ponti ID is just a username — no wallet addresses to copy.">
      <Field label="What will you call them?" hint="Just for you — only you ever see this name.">
        <Input placeholder="e.g. Cami" value={nick} onChange={(e) => setNick(e.target.value)} />
      </Field>
      <Field label="Their Ponti ID" hint="Paste the link they shared, or scan their QR code.">
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="ponti.money/c/…" value={link} onChange={(e) => setLink(e.target.value)} style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => setScanning(true)} style={{ padding: "0 14px", flex: "0 0 auto" }}>{I.scan("var(--ink)")} Scan</Button>
        </div>
      </Field>
      <Button variant="primary" full disabled={!ok} onClick={() => onSubmit({ nick, addr: link })} style={{ marginTop: 6 }}>Add {nick.trim() || "them"}</Button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <button onClick={onShare} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
        gap: 12, padding: "14px", borderRadius: "var(--radius)", background: "var(--surface)",
        border: "1px solid var(--border)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>{I.share("var(--accent)")}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Share your Ponti ID instead</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>Let someone add you with your link or QR code.</span>
        </div>
        {I.right("var(--muted)")}
      </button>

      {scanning && <Scanner onClose={() => setScanning(false)} onScan={() => { setLink("ponti.money/c/8fA2k"); setScanning(false); }} />}
    </FormScreen>
  );
}

// mock QR scanner overlay
function Scanner({ onClose, onScan }) {
  React.useEffect(() => { const t = setTimeout(onScan, 1600); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, background: "rgba(12,8,10,.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,.92)" }}>Point at their Ponti code</span>
      <div style={{ position: "relative", width: 210, height: 210 }}>
        {[[0, 0, "tl"], [1, 0, "tr"], [0, 1, "bl"], [1, 1, "br"]].map(([cx, cy, k]) => (
          <div key={k} style={{ position: "absolute", width: 38, height: 38,
            [cy ? "bottom" : "top"]: 0, [cx ? "right" : "left"]: 0,
            borderTop: cy ? "none" : "3px solid var(--accent)", borderBottom: cy ? "3px solid var(--accent)" : "none",
            borderLeft: cx ? "none" : "3px solid var(--accent)", borderRight: cx ? "3px solid var(--accent)" : "none",
            borderTopLeftRadius: !cx && !cy ? 12 : 0, borderTopRightRadius: cx && !cy ? 12 : 0,
            borderBottomLeftRadius: !cx && cy ? 12 : 0, borderBottomRightRadius: cx && cy ? 12 : 0 }} />
        ))}
        <div style={{ position: "absolute", left: 8, right: 8, height: 2, top: "50%", background: "var(--accent)",
          boxShadow: "0 0 12px var(--accent)", animation: "ponti-scan 1.5s ease-in-out infinite" }} />
      </div>
      <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14,
        fontWeight: 600, color: "rgba(255,255,255,.7)", padding: "8px 16px" }}>Cancel</button>
    </div>
  );
}

// ── Advanced details disclosure (shared shape) ─────────
// The friendly identity stays up top; the technical facts live here, demoted on purpose.
// Everything shown is public / non-sensitive — no keys, nothing that compromises security.
function AdvancedDetails({ me }) {
  const [open, setOpen] = useS(false);
  const [copied, setCopied] = useS(false);
  const rowLabel = { fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 3 };
  const rowVal = { fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)" };
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface)" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ all: "unset", cursor: "pointer", display: "flex",
        alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", boxSizing: "border-box" }}>
        <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Advanced details</span>
        <span style={{ color: "var(--muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }}>{I.right("var(--muted)")}</span>
      </button>
      {open && (
        <div style={{ padding: "2px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
            The technical side of your account, for the curious. You rarely need any of this — the link and code above are all someone needs to add you.
          </span>

          {/* account address */}
          <div>
            <div style={rowLabel}>Account address</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
              background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
              <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontVariantNumeric: "tabular-nums", fontSize: 13,
                color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.address}</span>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700 }}>
                {copied ? <>{I.check("var(--accent)", 13)} Copied</> : <>{I.copy("var(--accent)")} Copy</>}
              </button>
            </div>
          </div>

          {/* network + account type */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>Network</div>
              <div style={rowVal}>{me.network}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>where your USDC settles</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>Account type</div>
              <div style={rowVal}>{me.accountType}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>non-custodial · only you control it</div>
            </div>
          </div>

          {/* explorer link */}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "flex", alignItems: "center", gap: 8,
            textDecoration: "none", color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600 }}>
            {I.external("var(--accent)")} View on block explorer
          </a>
        </div>
      )}
    </div>
  );
}

// ── Your Ponti (identity · invite · advanced · sign out) ──
function Profile({ me, onBack, onLogout, onAddFunds, dark, onToggleTheme = () => {} }) {
  const link = "ponti.money/u/ariel";
  const [copied, setCopied] = useS(false);
  const [name, setName] = useS(me.displayName || "Ariel");
  const [editing, setEditing] = useS(false);
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "0 18px 30px", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 0 14px" }}>
        <button onClick={onBack} style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 3, color: "var(--ink)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15 }}>
          {I.left("var(--ink)")} Done
        </button>
      </div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
        letterSpacing: "-0.02em", color: "var(--ink)" }}>Your Ponti</h1>

      {/* identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <AvatarUpload initial={(name[0] || "Y").toUpperCase()} tone="accent" size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <Input value={name} autoFocus onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, padding: "8px 10px" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{name}</span>
              <button onClick={() => setEditing(true)} style={{ all: "unset", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }} aria-label="Edit name">{I.pencil("var(--muted)")}</button>
            </div>
          )}
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>Your display name — only you set this.</span>
        </div>
      </div>

      {/* account email (read-only) */}
      <div style={{ marginBottom: 18 }}>
        <AccountEmail email={me.email} />
      </div>

      {/* wallet — account-level USDC balance + always-available Add funds */}
      <SectionLabel>Your balance</SectionLabel>
      <div style={{ marginTop: 8, marginBottom: 18 }}>
        <WalletCard me={me} onAddFunds={onAddFunds} />
      </div>

      {/* invite */}
      <SectionLabel>Your Ponti ID</SectionLabel>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)", padding: "22px 20px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 14, marginTop: 8, marginBottom: 18 }}>
        <div style={{ padding: 16, background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
          <QRCode value="ponti-ariel" size={156} />
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", textAlign: "center", lineHeight: 1.45, maxWidth: 260 }}>
          This is your Ponti ID — like a username. Share it and someone can start a shared tab with you.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", width: "100%",
          background: "var(--surface-2)", borderRadius: "var(--radius-sm)", boxSizing: "border-box" }}>
          <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
            style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
            color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700 }}>
            {copied ? <>{I.check("var(--accent)", 14)} Copied</> : <>{I.copy("var(--accent)")} Copy</>}
          </button>
        </div>
        <Button variant="primary" full>{I.share("var(--accent-ink)")} Share link</Button>
      </div>

      {/* appearance */}
      <SectionLabel>Appearance</SectionLabel>
      <div style={{ marginTop: 8, marginBottom: 18 }}>
        <ThemeToggle dark={dark} onChange={onToggleTheme} />
      </div>

      {/* advanced */}
      <AdvancedDetails me={me} />

      <div style={{ flex: 1, minHeight: 12 }} />
      <button onClick={onLogout} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignSelf: "center",
        alignItems: "center", gap: 7, whiteSpace: "nowrap", color: "var(--muted)", fontFamily: "var(--font-ui)", fontSize: 14,
        fontWeight: 600, padding: "16px 0 4px" }}>{I.logout("var(--muted)")} Log out</button>
    </div>
  );
}

// ── Add expense ────────────────────────────────────────
function AddExpense({ g, onBack, onSubmit, initial, mode = "add" }) {
  const editing = mode === "edit";
  const [payer, setPayer] = useS(initial ? (initial.mine ? "me" : "them") : "me");
  const [amt, setAmt] = useS(initial ? String(initial.amount) : "");
  const [desc, setDesc] = useS(initial ? initial.desc : "");
  const ok = parseFloat(amt) > 0 && desc.trim();
  return (
    <FormScreen title={editing ? "Edit expense" : "Add expense"} onBack={onBack}
      sub={editing
        ? "Fix the details — the balance updates to match."
        : "Add what you paid for — Ponti keeps the count."}>
      <Field label="Amount">
        <div style={{ position: "relative" }}>
          <Input placeholder="0.00" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)}
            style={{ fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              paddingRight: 72, fontSize: 30, fontWeight: 700 }} />
          <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "var(--muted)" }}>USDC</span>
        </div>
      </Field>
      <Field label="What for?">
        <Input placeholder="e.g. Groceries" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Field label="Who paid?">
        <div style={{ display: "flex", gap: 8 }}>
          {[["me", "You"], ["them", g.nickname]].map(([k, lbl]) => (
            <button key={k} onClick={() => setPayer(k)} style={{ all: "unset", cursor: "pointer", flex: 1,
              textAlign: "center", padding: "13px 0", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-ui)",
              fontSize: 15, fontWeight: 600,
              background: payer === k ? "var(--accent-soft)" : "var(--surface)",
              color: payer === k ? "var(--accent)" : "var(--muted)",
              boxShadow: payer === k ? "inset 0 0 0 1.5px var(--accent)" : "inset 0 0 0 1px var(--border)" }}>{lbl}</button>
          ))}
        </div>
      </Field>
      <Button variant="primary" full disabled={!ok} onClick={() => onSubmit({ payer, amt, desc })} style={{ marginTop: 6 }}>{editing ? "Review changes" : "Review & add"}</Button>
    </FormScreen>
  );
}

function FormScreen({ title, sub, onBack, children }) {
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "0 18px 30px" }}>
      <div style={{ padding: "6px 0 14px" }}>
        <button onClick={onBack} style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 3, color: "var(--ink)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15 }}>
          {I.left("var(--ink)")} Back
        </button>
      </div>
      <h1 style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
        letterSpacing: "-0.02em", color: "var(--ink)" }}>{title}</h1>
      {sub && <p style={{ margin: "0 0 22px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { SignIn, Home, GroupDetail, CreateGroup, AddExpense, AppHeader, Profile, AdvancedDetails });
