// desktop-screens.jsx — Ponti desktop layouts (Split / Sidebar / Centered) + shared panes.
// Reuses primitives from window (components.jsx): money, Wordmark, Mark, I, Avatar,
// Num, Button, Pill, Field, Input, Skeleton, SectionLabel, QRCode, balanceWords.
// AddExpense (mobile form) is reused inside a desktop modal.

const { useState: useDS, useMemo: useDM } = React;

// extra icons not in components.jsx
const DI = {
  home: (c = "currentColor") => <svg width="19" height="19" viewBox="0 0 19 19" fill="none"><path d="M3 8l6.5-5.2L16 8v7.5a1 1 0 01-1 1h-3v-5H7v5H4a1 1 0 01-1-1V8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  qr: (c = "currentColor") => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="5.5" height="5.5" rx="1.2" stroke={c} strokeWidth="1.5"/><rect x="2" y="10.5" width="5.5" height="5.5" rx="1.2" stroke={c} strokeWidth="1.5"/><rect x="10.5" y="2" width="5.5" height="5.5" rx="1.2" stroke={c} strokeWidth="1.5"/><path d="M10.5 11h2.5v2.5M16 10.5v5.5M10.5 16h2.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  close: (c = "currentColor") => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 4l10 10M14 4L4 14" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
};

// ── timeline helpers (desktop reimpl) ──────────────────
function deskSplit(items) {
  const segments = []; let cur = [];
  for (const it of items) {
    if (it.kind === "settle") { segments.push({ settle: it, items: cur }); cur = []; }
    else cur.push(it);
  }
  return { open: cur, segments };
}

function DeskExpenseRow({ e, onEdit, onDelete, muted }) {
  const [open, setOpen] = useDS(false);
  return (
    <div style={{ opacity: muted ? 0.92 : 1,
      background: open ? "var(--surface)" : "transparent",
      border: open ? "1px solid var(--border)" : "1px solid transparent",
      borderBottom: open ? "1px solid var(--border)" : "1px solid var(--border)",
      boxShadow: open ? "var(--shadow)" : "none",
      borderRadius: open ? "var(--radius-sm)" : 0,
      margin: open ? "8px 0" : 0, transition: "background .15s, box-shadow .15s, border-color .15s" }}>
      <div className={open ? "" : "dk-hover-row"} onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", cursor: "pointer",
          borderRadius: "var(--radius-sm)" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "0 0 auto", display: "flex",
          alignItems: "center", justifyContent: "center", background: e.mine ? "var(--accent-soft)" : "var(--surface-2)",
          color: e.mine ? "var(--accent)" : "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14 }}>
          {e.mine ? "Y" : e.payer[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>{e.desc}</span>
            {e.edited && <Pill tone="neutral">{I.pencil("var(--muted)")} edited</Pill>}
          </div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
            {e.mine ? "You paid" : `${e.payer} paid`} · {e.at}
          </span>
        </div>
        <Num size={16} weight={700} color="var(--ink)">{money(e.amount)}</Num>
      </div>
      {open && (
        <div style={{ display: "flex", gap: 8, padding: "0 12px 14px 64px" }}>
          <Button variant="soft" onClick={onEdit} style={{ padding: "8px 12px", fontSize: 13 }}>{I.pencil("var(--accent)")} Edit</Button>
          <Button variant="ghost" onClick={onDelete} style={{ padding: "8px 12px", fontSize: 13 }}>{I.trash("var(--muted)")} Delete</Button>
        </div>
      )}
    </div>
  );
}

function DeskSettleDivider({ s, collapsed, onToggle, count }) {
  return (
    <button onClick={onToggle} className="dk-hover-row" style={{ all: "unset", cursor: "pointer", display: "flex",
      alignItems: "center", gap: 14, padding: "13px 8px", width: "100%", boxSizing: "border-box", borderRadius: "var(--radius-sm)" }}>
      <div style={{ width: 38, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{I.check("var(--muted)", 15)}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>Settled up · {s.at}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>
          {s.by} settled {money(s.amount)} USDC · {count} item{count !== 1 ? "s" : ""}
        </span>
      </div>
      <span style={{ color: "var(--muted)", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform .2s" }}>{I.right("var(--muted)")}</span>
    </button>
  );
}

function DeskActivity({ items, onEdit, onDelete }) {
  const { open, segments } = useDM(() => deskSplit(items), [items]);
  const [openSeg, setOpenSeg] = useDS({});
  if (open.length === 0 && segments.length === 0)
    return <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", padding: "10px 8px" }}>No expenses yet.</p>;
  return (
    <div>
      {open.slice().reverse().map((e) => (
        <DeskExpenseRow key={e.id} e={e} onEdit={() => onEdit(e)} onDelete={() => onDelete(e)} />
      ))}
      {segments.slice().reverse().map((seg) => {
        const isOpen = !!openSeg[seg.settle.id];
        return (
          <div key={seg.settle.id} style={{ borderTop: "1px solid var(--border)", marginTop: 4 }}>
            <DeskSettleDivider s={seg.settle} collapsed={!isOpen} count={seg.items.length}
              onToggle={() => setOpenSeg((o) => ({ ...o, [seg.settle.id]: !o[seg.settle.id] }))} />
            {isOpen && (
              <div style={{ paddingLeft: 8, opacity: 0.85 }}>
                {seg.items.slice().reverse().map((e) => (
                  <DeskExpenseRow key={e.id} e={e} onEdit={() => onEdit(e)} onDelete={() => onDelete(e)} muted />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Net summary block ──────────────────────────────────
function NetSummary({ groups, size = 44 }) {
  const net = groups.reduce((s, g) => s + g.balance, 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <DirChip balance={net} label={net > 0 ? "You're owed" : net < 0 ? "You owe" : "Settled up"} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 600,
          color: "var(--muted)" }}>across everyone</span>
      </div>
      <div className="pnum" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size,
        letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1.08 }}>
        {money(net)} <span style={{ fontSize: size * 0.42, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.02em", marginLeft: 1 }}>USDC</span>
      </div>
    </div>
  );
}

// ── selectable group row for the rail ──────────────────
function RailGroupRow({ g, active, onClick }) {
  const b = balanceWords(g.balance);
  return (
    <button onClick={onClick} className={"dk-rail-row" + (active ? " is-active" : "")} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
      padding: "11px 12px", borderRadius: "var(--radius)", width: "100%", boxSizing: "border-box",
    }}>
      <Avatar initial={g.initial} tone={g.tone} size={40} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{g.nickname}</span>
          {g.crossBorder && <span style={{ color: "var(--muted)", display: "inline-flex" }}>{I.globe("var(--muted)")}</span>}
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{g.lastActivity ? `Last active ${g.lastActivity}` : "No activity yet"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {g.balance === 0
          ? <DirChip balance={0} size="sm" />
          : <>
              <Num size={15} weight={700}>{b.amount}</Num>
              <DirChip balance={g.balance} size="sm" />
            </>}
      </div>
    </button>
  );
}

// ── Group detail pane (shared by all desktop layouts) ──
function GroupDetailPane({ g, data, postWrite, lowUsdc, onAdd, onSettle, onEditExpense, onDeleteExpense, showBack, onBack, onAddFunds, maxWidth = 660 }) {
  const items = data.timeline[g.id] || [];
  const youOwe = g.balance < 0;
  // low-USDC settle gate: short only when the demo flag is on AND the wallet
  // can't cover what's owed; adding funds clears it reactively.
  const owe = Math.abs(g.balance);
  const have = data.me.usdc || 0;
  const short = youOwe && lowUsdc && have < owe;
  const need = Math.max(0, owe - have);
  return (
    <div style={{ maxWidth, margin: "0 auto", padding: "30px 40px 48px" }}>
      {showBack && (
        <button onClick={onBack} className="dk-hover-link" style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 3, color: "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, marginBottom: 18 }}>
          {I.left("var(--muted)")} Back
        </button>
      )}

      {/* person header */}
      <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 22 }}>
        <Avatar initial={g.initial} tone={g.tone} size={56} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{g.nickname}</span>
            {g.crossBorder && <Pill tone="neutral">{I.globe("var(--muted)")} cross-border</Pill>}
          </div>
          <button className="dk-hover-link" style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13,
            color: "var(--muted)" }}>{g.lastActivity ? `Last active ${g.lastActivity}` : "Shared tab"} · details {I.right("var(--muted)")}</button>
        </div>
        <button className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 8, borderRadius: 8 }}>{I.dots("var(--muted)")}</button>
      </div>

      {/* balance hero */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        padding: "28px 30px", boxShadow: "var(--shadow)" }}>
        <div style={{ marginBottom: 12 }}>
          <DirChip balance={g.balance} size="lg"
            label={g.balance === 0 ? "All settled up" : (youOwe ? `You owe ${g.nickname}` : `${g.nickname} owes you`)} />
        </div>
        <div className="pnum" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 52,
          letterSpacing: "-0.045em", color: "var(--ink)", lineHeight: 1.02, margin: 0 }}>
          {g.balance === 0 ? "Settled" : <>{money(g.balance)} <span style={{ fontSize: 22, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.02em", marginLeft: 1 }}>USDC</span></>}
        </div>

        {postWrite && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "var(--muted)" }}>
            <Spinner s={15} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13 }}>{postWrite}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 11, marginTop: 22 }}>
          <Button variant="primary" onClick={onAdd}>{I.plus("var(--accent-ink)")} Add expense</Button>
          {youOwe && (short
            ? <Button variant="ghost" disabled>Settle</Button>
            : <Button variant="outline" onClick={onSettle}>Settle {money(g.balance)} USDC</Button>)}
        </div>

        {short && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--accent-soft)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              You need {money(need)} more USDC to settle.{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onAddFunds && onAddFunds(); }} style={{ color: "var(--accent)", textDecoration: "underline" }}>Add funds</a>
            </span>
          </div>
        )}
      </div>

      {/* activity */}
      <div style={{ marginTop: 28 }}>
        <SectionLabel>Activity</SectionLabel>
        <div style={{ marginTop: 8 }}>
          <DeskActivity items={items} onEdit={onEditExpense} onDelete={onDeleteExpense} />
        </div>
      </div>
    </div>
  );
}

// ── empty detail (split, nothing selected) ─────────────
function EmptyDetail({ onCreate }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 14, textAlign: "center", padding: 40 }}>
      <Mark s={52} />
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", marginTop: 6 }}>
        Pick someone to see your tab
      </span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", lineHeight: 1.5, maxWidth: 340 }}>
        Choose a person on the left to view your shared balance and activity — or start a new shared tab.
      </span>
      <Button variant="primary" onClick={onCreate} style={{ marginTop: 8 }}>{I.plus("var(--accent-ink)")} Add someone</Button>
    </div>
  );
}

// ── home feed (sidebar / centered layouts) ─────────────
function HomeFeed({ data, demoState, onOpen, onCreate, onAddFunds, narrow, maxW }) {
  const groups = data.groups;
  const mw = maxW || (narrow ? 600 : 760);
  return (
    <div style={{ maxWidth: mw, margin: "0 auto", padding: narrow ? "26px 28px 48px" : "36px 44px 56px" }}>
      <div style={{ marginBottom: 22 }}><NetSummary groups={groups} size={narrow ? 40 : 46} /></div>
      <SectionLabel right={
        <button onClick={onCreate} className="dk-hover-link" style={{ all: "unset", cursor: "pointer", display: "inline-flex",
          alignItems: "center", gap: 5, color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700 }}>{I.plus("var(--accent)")} New</button>
      }>People you share with</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {demoState === "loading" && [0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <Skeleton w={44} h={44} r={22} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><Skeleton w={"55%"} h={13} /><Skeleton w={"35%"} h={11} /></div>
            <Skeleton w={56} h={16} />
          </div>
        ))}
        {demoState === "empty" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
            padding: "48px 24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <Mark s={42} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>No groups yet</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5, maxWidth: 320 }}>
              A group is one shared account between two people. Start one and add your first expense.
            </span>
            <Button variant="primary" onClick={onCreate} style={{ marginTop: 6 }}>Add someone</Button>
          </div>
        )}
        {demoState === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
            padding: "48px 24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <div style={{ color: "var(--accent)" }}>{I.globe("var(--accent)")}</div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Couldn't reach the network</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5, maxWidth: 360 }}>
              We couldn't load your groups just now. This is a connection hiccup, not a lost balance — nothing was lost, and your money is exactly where it was.
            </span>
            <Button variant="ghost" onClick={() => {}} style={{ marginTop: 6 }}>Try again</Button>
          </div>
        )}
        {demoState === "normal" && groups.map((g) => (
          <button key={g.id} onClick={() => onOpen(g)} className="dk-card-row" style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "15px 16px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", width: "100%", boxSizing: "border-box" }}>
            <Avatar initial={g.initial} tone={g.tone} size={44} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{g.nickname}</span>
                {g.crossBorder && <span style={{ color: "var(--muted)", display: "inline-flex" }}>{I.globe("var(--muted)")}</span>}
              </div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>{g.lastActivity ? `Last active ${g.lastActivity}` : "No activity yet"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              {g.balance === 0
                ? <Pill tone="ok">{I.check("var(--muted)", 12)} settled</Pill>
                : <><Num size={16} weight={700}>{balanceWords(g.balance).sign}{balanceWords(g.balance).amount}</Num>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{balanceWords(g.balance).line}</span></>}
            </div>
          </button>
        ))}
      </div>

      {/* wallet = UTILITY, set apart from the relational net + group balances above */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <SectionLabel>Your account</SectionLabel>
        <div style={{ marginTop: 10 }}><WalletStrip me={data.me} onAddFunds={onAddFunds} /></div>
      </div>
    </div>
  );
}

// ── Add expense modal (desktop) ────────────────────────
function ModalShell({ children, onClose, width = 440 }) {
  const [show, setShow] = useDS(false);
  React.useEffect(() => { const t = setTimeout(() => setShow(true), 10); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,14,18,.46)",
        opacity: show ? 1 : 0, transition: "opacity .24s", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: `min(${width}px, calc(100% - 48px))`, maxHeight: "calc(100% - 60px)", overflow: "auto",
        background: "var(--bg)", borderRadius: 20, boxShadow: "0 30px 80px -24px rgba(0,0,0,.5), 0 0 0 1px var(--border)",
        transform: show ? "translateY(0) scale(1)" : "translateY(10px) scale(.97)", opacity: show ? 1 : 0,
        transition: "transform .3s cubic-bezier(.32,.72,0,1), opacity .24s" }}>
        {children}
      </div>
    </div>
  );
}

function DesktopAddModal({ g, onClose, onSubmit }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "22px 26px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Add expense</h2>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>Add what you paid for — Ponti keeps the count.</p>
          </div>
          <button onClick={onClose} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 6, borderRadius: 8 }}>{DI.close("var(--muted)")}</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <AddExpenseFields g={g} onSubmit={onSubmit} />
        </div>
      </div>
    </ModalShell>
  );
}

// inline form (mirrors mobile AddExpense fields, desktop-tuned)
function AddExpenseFields({ g, onSubmit, initial, submitLabel = "Review & add" }) {
  const [payer, setPayer] = useDS(initial ? (initial.mine ? "me" : "them") : "me");
  const [amt, setAmt] = useDS(initial ? String(initial.amount) : "");
  const [desc, setDesc] = useDS(initial ? initial.desc : "");
  const ok = parseFloat(amt) > 0 && desc.trim();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
      <Button variant="primary" full disabled={!ok} onClick={() => onSubmit({ payer, amt, desc })} style={{ marginTop: 4 }}>{submitLabel}</Button>
    </div>
  );
}

// ── Your Ponti modal (identity · invite · advanced · sign out) ──
function YourPontiModal({ me, onClose, onLogout, onAddFunds, dark, onToggleTheme = () => {} }) {
  const link = "ponti.money/u/ariel";
  const [copied, setCopied] = useDS(false);
  const [name, setName] = useDS(me.displayName || "Ariel");
  const [editing, setEditing] = useDS(false);
  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "22px 26px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Your Ponti</h2>
          <button onClick={onClose} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 6, borderRadius: 8 }}>{DI.close("var(--muted)")}</button>
        </div>

        {/* identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <AvatarUpload initial={(name[0] || "Y").toUpperCase()} tone="accent" size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <Input value={name} autoFocus onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
                style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, padding: "7px 10px" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{name}</span>
                <button onClick={() => setEditing(true)} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", display: "inline-flex", padding: 3, borderRadius: 6 }} aria-label="Edit name">{I.pencil("var(--muted)")}</button>
              </div>
            )}
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>Your display name — only you set this.</span>
          </div>
        </div>

        {/* account email (read-only) */}
        <div style={{ marginBottom: 16 }}>
          <AccountEmail email={me.email} />
        </div>

        {/* wallet — account-level USDC balance + always-available Add funds */}
        <div style={{ marginBottom: 16 }}>
          <WalletCard me={me} onAddFunds={onAddFunds} />
        </div>

        {/* invite */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 18px" }}>
          <div style={{ padding: 14, background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
            <QRCode value="ponti-ariel" size={150} />
          </div>
          <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.45, maxWidth: 250 }}>
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
        <div style={{ marginTop: 16 }}>
          <SectionLabel>Appearance</SectionLabel>
          <div style={{ marginTop: 8 }}>
            <ThemeToggle dark={dark} onChange={onToggleTheme} />
          </div>
        </div>

        {/* advanced details disclosure (shared) */}
        <div style={{ marginTop: 14 }}>
          <AdvancedDetails me={me} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button onClick={onLogout} className="dk-hover-link" style={{ all: "unset", cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 7, whiteSpace: "nowrap", color: "var(--muted)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600 }}>{I.logout("var(--muted)")} Log out</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Edit expense modal (desktop) ───────────────────────
function DesktopEditModal({ g, expense, onClose, onSubmit }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "22px 26px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Edit expense</h2>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>Fix the details — the balance updates to match.</p>
          </div>
          <button onClick={onClose} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 6, borderRadius: 8 }}>{DI.close("var(--muted)")}</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <AddExpenseFields g={g} initial={expense} submitLabel="Review changes" onSubmit={onSubmit} />
        </div>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// LAYOUT SHELLS
// ════════════════════════════════════════════════════════

// shared: brand lockup
function Brand({ size = 22 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <Mark s={size} />
      <Wordmark size={size - 1} />
    </div>
  );
}

// ── Sign in (desktop) ──────────────────────────────────
function DesktopSignIn({ onLogin }) {
  return (
    <div style={{ height: "100%", display: "flex", background: "var(--bg)", color: "var(--ink)" }}>
      {/* brand panel */}
      <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 56px", background: "var(--surface-2)", borderRight: "1px solid var(--border)" }}>
        <Brand size={26} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 460 }}>
          <Mark s={56} />
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 700,
            lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--ink)", textWrap: "balance" }}>
            For people who share expenses, but not the same place.
          </h1>
          <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 17, color: "var(--muted)", lineHeight: 1.5 }}>
            One balance, wherever you live. Settle directly, in USDC.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex" }}>{I.shield("var(--muted)")}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13 }}>Ponti never holds your money. It only keeps the count.</span>
        </div>
      </div>
      {/* form panel */}
      <div style={{ flex: "0 0 460px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Sign in</h2>
          <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)" }}>Enter your email — we'll send a one-time link. New here? This creates your account.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input placeholder="you@email.com" inputMode="email" />
          <Button variant="primary" full onClick={onLogin}>Continue with email</Button>
        </div>
      </div>
    </div>
  );
}

// ── 1. SPLIT (two-pane master-detail) ──────────────────
function DesktopSplit(p) {
  const { data, demoState, gid, g, onOpen, onCreate, onProfile } = p;
  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)", color: "var(--ink)" }}>
      {/* rail */}
      <aside style={{ width: 360, flex: "0 0 360px", borderRight: "1px solid var(--border)", background: "var(--surface)",
        display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 22px 18px" }}>
          <Brand size={22} />
          <button onClick={onProfile} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", borderRadius: "50%" }} aria-label="Your Ponti">
            <Avatar initial={data.me.initial} tone="neutral" size={36} />
          </button>
        </div>
        <div style={{ padding: "4px 22px 14px" }}><NetSummary groups={data.groups} size={36} /></div>
        <div style={{ padding: "0 22px" }}>
          <SectionLabel right={
            <button onClick={onCreate} className="dk-hover-link" style={{ all: "unset", cursor: "pointer", display: "inline-flex",
              alignItems: "center", gap: 5, color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700 }}>{I.plus("var(--accent)")} New</button>
          }>People you share with</SectionLabel>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {demoState === "loading" && [0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px" }}>
              <Skeleton w={40} h={40} r={20} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skeleton w={"55%"} h={12} /><Skeleton w={"35%"} h={10} /></div>
            </div>
          ))}
          {(demoState === "normal" || !demoState) && data.groups.map((grp) => (
            <RailGroupRow key={grp.id} g={grp} active={grp.id === gid} onClick={() => onOpen(grp)} />
          ))}
          {demoState === "empty" && (
            <div style={{ padding: "30px 12px", textAlign: "center" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)" }}>No groups yet. Add someone to start.</span>
            </div>
          )}
          {demoState === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center", padding: "34px 18px" }}>
              <div style={{ color: "var(--accent)" }}>{I.globe("var(--accent)")}</div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>Couldn't reach the network</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                A connection hiccup, not a lost balance — nothing moved, your money is exactly where it was.
              </span>
              <Button variant="ghost" onClick={() => {}} style={{ marginTop: 6, padding: "9px 14px", fontSize: 13 }}>Try again</Button>
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 22px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <WalletStrip me={data.me} onAddFunds={p.onAddFunds} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            <span style={{ display: "inline-flex" }}>{I.shield("var(--muted)")}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>Ponti never holds your money. It only keeps the count.</span>
          </div>
        </div>
      </aside>
      {/* detail */}
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {g ? <GroupDetailPane {...p} maxWidth={p.wide ? 820 : 560} /> : <EmptyDetail onCreate={onCreate} />}
      </main>
    </div>
  );
}

// ── 2. SIDEBAR (nav rail + content) ────────────────────
function DesktopSidebar(p) {
  const { data, demoState, g, screen, onOpen, onCreate, onProfile, onHome } = p;
  const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={"dk-nav-item" + (active ? " is-active" : "")} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
      borderRadius: "var(--radius-sm)", color: active ? "var(--accent)" : "var(--muted)", fontFamily: "var(--font-ui)",
      fontSize: 14.5, fontWeight: 600 }}>
      <span style={{ display: "inline-flex" }}>{icon(active ? "var(--accent)" : "var(--muted)")}</span>{label}
    </button>
  );
  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)", color: "var(--ink)" }}>
      <nav style={{ width: 232, flex: "0 0 232px", borderRight: "1px solid var(--border)", background: "var(--surface-2)",
        display: "flex", flexDirection: "column", padding: "22px 16px" }}>
        <div style={{ padding: "0 6px 22px" }}><Brand size={22} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <NavItem icon={DI.home} label="Home" active={screen === "home"} onClick={onHome} />
          <NavItem icon={DI.qr} label="Your Ponti" active={false} onClick={onProfile} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onProfile} className="dk-hover-row" style={{ all: "unset", cursor: "pointer", display: "flex",
          alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: "var(--radius-sm)" }}>
          <Avatar initial={data.me.initial} tone="neutral" size={34} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>You</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)" }}>Your invite & code</span>
          </div>
        </button>
      </nav>
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {screen === "detail" && g
          ? <GroupDetailPane {...p} showBack onBack={onHome} maxWidth={p.wide ? 900 : 660} />
          : <HomeFeed data={data} demoState={demoState} onOpen={onOpen} onCreate={onCreate} onAddFunds={p.onAddFunds} maxW={p.wide ? 900 : 640} />}
      </main>
    </div>
  );
}

// ── 3. CENTERED (single column) ────────────────────────
function DesktopCentered(p) {
  const { data, demoState, g, screen, onOpen, onCreate, onProfile, onHome } = p;
  return (
    <div style={{ height: "100%", overflow: "auto", background: "var(--bg)", color: "var(--ink)" }}>
      <div style={{ maxWidth: p.wide ? 720 : 540, margin: "0 auto", padding: "0 0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 6px" }}>
          <Brand size={22} />
          <button onClick={onProfile} className="dk-hover-icon" style={{ all: "unset", cursor: "pointer", borderRadius: "50%" }} aria-label="Your Ponti">
            <Avatar initial={data.me.initial} tone="neutral" size={34} />
          </button>
        </div>
        {screen === "detail" && g
          ? <GroupDetailPane {...p} showBack onBack={onHome} maxWidth={p.wide ? 720 : 540} />
          : <HomeFeed data={data} demoState={demoState} onOpen={onOpen} onCreate={onCreate} onAddFunds={p.onAddFunds} narrow maxW={p.wide ? 720 : 540} />}
      </div>
    </div>
  );
}

function DesktopShell(props) {
  const layout = props.layout;
  if (layout === "sidebar") return <DesktopSidebar {...props} />;
  if (layout === "centered") return <DesktopCentered {...props} />;
  return <DesktopSplit {...props} />;
}

Object.assign(window, {
  DesktopShell, DesktopSplit, DesktopSidebar, DesktopCentered, DesktopSignIn,
  GroupDetailPane, HomeFeed, NetSummary, DesktopAddModal, DesktopEditModal, YourPontiModal, ModalShell, Brand, DI,
});
