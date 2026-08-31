import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, Check, X, Trash2, Pencil, ChevronDown,
  TrendingUp, Users, Clock, AlertTriangle, Phone, Loader2,
  MessageCircle, Smartphone, Megaphone, Tag
} from "lucide-react";

const THEME = {
  paper: "#F4F6F4",
  paperAlt: "#FFFFFF",
  ink: "#0F211D",
  inkSoft: "#4A5B57",
  line: "#E2E7E3",
  brand: "#0E6B5C",
  brandSoft: "#E4F1EE",
  brandDeep: "#0B2B26",
  amber: "#B7791F",
  amberSoft: "#FBF0DC",
  rose: "#B23A48",
  roseSoft: "#F8E7E8",
};

const SEGMENTS = [
  "Restaurante", "Farmácia", "Academia", "Ótica", "Pet Shop",
  "Salão de Beleza", "Barbearia", "Clínica", "Oficina",
  "Imobiliária", "Loja de Roupas", "Outro",
];

const SERVICES = [
  { id: "whatsapp", label: "Bot de WhatsApp", icon: MessageCircle },
  { id: "app", label: "Aplicativo Próprio", icon: Smartphone },
  { id: "marketing", label: "Sistema de Marketing", icon: Megaphone },
];

const STORAGE_KEY = "crm:clients";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function currentCycle(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function computeStatus(client) {
  const today = new Date();
  const cycle = currentCycle(today);
  if (client.lastPaidCycle === cycle) return "paid";
  if (today.getDate() > Number(client.dueDay)) return "overdue";
  return "pending";
}

const STATUS_META = {
  paid: { label: "Pago", bg: THEME.brandSoft, fg: THEME.brand },
  pending: { label: "Pendente", bg: THEME.amberSoft, fg: THEME.amber },
  overdue: { label: "Em atraso", bg: THEME.roseSoft, fg: THEME.rose },
};

const emptyForm = {
  id: null,
  name: "",
  segment: "Restaurante",
  customSegment: "",
  services: [],
  value: "",
  dueDay: "10",
  phone: "",
};

export default function App() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [justPaid, setJustPaid] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setClients(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function persist(next) {
    setClients(next);
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    } finally {
      setTimeout(() => setSaving(false), 250);
    }
  }

  const enriched = useMemo(
    () => clients.map((c) => ({ ...c, status: computeStatus(c) })),
    [clients]
  );

  const stats = useMemo(() => {
    const mrr = enriched.reduce((s, c) => s + (Number(c.value) || 0), 0);
    const pending = enriched.filter((c) => c.status === "pending").length;
    const overdue = enriched.filter((c) => c.status === "overdue").length;
    return { mrr, total: enriched.length, pending, overdue };
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched
      .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
      .filter((c) => (segmentFilter === "all" ? true : c.segment === segmentFilter))
      .filter((c) =>
        search.trim() === ""
          ? true
          : c.name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a, b) => Number(a.dueDay) - Number(b.dueDay));
  }, [enriched, statusFilter, segmentFilter, search]);

  function openNew() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(client) {
    setForm({
      id: client.id,
      name: client.name,
      segment: client.segment,
      customSegment: client.customSegment || "",
      services: client.services || [],
      value: client.value,
      dueDay: client.dueDay,
      phone: client.phone || "",
    });
    setModalOpen(true);
  }

  function toggleService(id) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.filter((s) => s !== id)
        : [...f.services, id],
    }));
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.id) {
      const next = clients.map((c) =>
        c.id === form.id ? { ...c, ...form, dueDay: Number(form.dueDay) } : c
      );
      await persist(next);
    } else {
      const newClient = {
        ...form,
        id: uid(),
        dueDay: Number(form.dueDay),
        lastPaidCycle: null,
        history: [],
      };
      await persist([newClient, ...clients]);
    }
    setModalOpen(false);
  }

  async function markPaid(client) {
    const cycle = currentCycle();
    const next = clients.map((c) =>
      c.id === client.id
        ? {
            ...c,
            lastPaidCycle: cycle,
            history: [...(c.history || []), { cycle, date: new Date().toISOString(), value: c.value }],
          }
        : c
    );
    setJustPaid(client.id);
    await persist(next);
    setTimeout(() => setJustPaid(null), 1400);
  }

  async function undoPaid(client) {
    const next = clients.map((c) =>
      c.id === client.id ? { ...c, lastPaidCycle: null } : c
    );
    await persist(next);
  }

  async function deleteClient(id) {
    await persist(clients.filter((c) => c.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: THEME.paper, color: THEME.ink, fontFamily: "Inter, ui-sans-serif, system-ui" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .brand-font { font-family: 'Fraunces', serif; }
        .tick-pop { animation: tickpop 0.4s ease; }
        @keyframes tickpop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        ::selection { background: ${THEME.brandSoft}; }
      `}</style>

      {/* Header */}
      <header className="px-5 sm:px-8 pt-8 pb-6 border-b" style={{ borderColor: THEME.line }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: THEME.brandDeep }}
            >
              <TrendingUp size={18} color="#fff" />
            </div>
            <div>
              <h1 className="brand-font text-2xl leading-none" style={{ color: THEME.brandDeep }}>
                Painel de Clientes
              </h1>
              <p className="text-xs mt-1" style={{ color: THEME.inkSoft }}>
                Gestão de contratos e cobranças recorrentes
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shrink-0 hover:opacity-90 transition"
            style={{ background: THEME.brand, color: "#fff" }}
          >
            <Plus size={16} /> Novo cliente
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {loading ? (
          <div className="flex items-center gap-2 py-24 justify-center" style={{ color: THEME.inkSoft }}>
            <Loader2 size={18} className="animate-spin" /> Carregando seus clientes…
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <StatCard label="Receita recorrente" value={formatCurrency(stats.mrr)} icon={TrendingUp} accent={THEME.brand} />
              <StatCard label="Clientes ativos" value={stats.total} icon={Users} accent={THEME.brandDeep} />
              <StatCard label="Pendentes" value={stats.pending} icon={Clock} accent={THEME.amber} />
              <StatCard label="Em atraso" value={stats.overdue} icon={AlertTriangle} accent={THEME.rose} />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-1"
                style={{ background: THEME.paperAlt, border: `1px solid ${THEME.line}` }}
              >
                <Search size={16} color={THEME.inkSoft} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente pelo nome…"
                  className="bg-transparent outline-none text-sm w-full"
                  style={{ color: THEME.ink }}
                />
              </div>
              <SelectPill
                value={segmentFilter}
                onChange={setSegmentFilter}
                options={[{ value: "all", label: "Todos os segmentos" }, ...SEGMENTS.map((s) => ({ value: s, label: s }))]}
              />
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: "all", label: "Todos" },
                { id: "pending", label: "Pendentes" },
                { id: "overdue", label: "Em atraso" },
                { id: "paid", label: "Pagos" },
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium transition"
                    style={{
                      background: active ? THEME.brandDeep : THEME.paperAlt,
                      color: active ? "#fff" : THEME.inkSoft,
                      border: `1px solid ${active ? THEME.brandDeep : THEME.line}`,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <EmptyState hasClients={clients.length > 0} onNew={openNew} />
            ) : (
              <div className="space-y-2.5">
                {filtered.map((c) => (
                  <ClientRow
                    key={c.id}
                    client={c}
                    justPaid={justPaid === c.id}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setConfirmDelete(c)}
                    onMarkPaid={() => markPaid(c)}
                    onUndoPaid={() => undoPaid(c)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {saving && (
        <div
          className="fixed bottom-5 right-5 text-xs px-3 py-2 rounded-full flex items-center gap-2"
          style={{ background: THEME.brandDeep, color: "#fff" }}
        >
          <Loader2 size={12} className="animate-spin" /> Salvando…
        </div>
      )}

      {modalOpen && (
        <ClientModal
          form={form}
          setForm={setForm}
          onToggleService={toggleService}
          onSubmit={submitForm}
          onClose={() => setModalOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Remover ${confirmDelete.name}?`}
          description="Isso apaga o histórico de cobranças desse cliente. Essa ação não pode ser desfeita."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteClient(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: THEME.paperAlt, border: `1px solid ${THEME.line}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: THEME.inkSoft }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}1A` }}>
          <Icon size={14} color={accent} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-semibold" style={{ color: THEME.brandDeep }}>{value}</p>
    </div>
  );
}

function SelectPill({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
        style={{ background: THEME.paperAlt, border: `1px solid ${THEME.line}`, color: THEME.ink }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" color={THEME.inkSoft} />
    </div>
  );
}

function ClientRow({ client, justPaid, onEdit, onDelete, onMarkPaid, onUndoPaid }) {
  const meta = STATUS_META[client.status];
  const segmentLabel = client.segment === "Outro" && client.customSegment ? client.customSegment : client.segment;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
      style={{ background: THEME.paperAlt, border: `1px solid ${THEME.line}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm" style={{ color: THEME.ink }}>{client.name}</h3>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: THEME.brandSoft, color: THEME.brand }}
          >
            {segmentLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {(client.services || []).map((sid) => {
            const svc = SERVICES.find((s) => s.id === sid);
            if (!svc) return null;
            const Icon = svc.icon;
            return (
              <span key={sid} className="flex items-center gap-1 text-xs" style={{ color: THEME.inkSoft }}>
                <Icon size={12} /> {svc.label}
              </span>
            );
          })}
          {client.phone && (
            <span className="flex items-center gap-1 text-xs" style={{ color: THEME.inkSoft }}>
              <Phone size={12} /> {client.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 sm:gap-8 shrink-0">
        <div className="text-right">
          <p className="text-xs" style={{ color: THEME.inkSoft }}>Valor mensal</p>
          <p className="text-sm font-semibold" style={{ color: THEME.brandDeep }}>{formatCurrency(client.value)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: THEME.inkSoft }}>Vencimento</p>
          <p className="text-sm font-semibold" style={{ color: THEME.ink }}>Dia {client.dueDay}</p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${justPaid ? "tick-pop" : ""}`}
          style={{ background: meta.bg, color: meta.fg }}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 sm:border-l sm:pl-4" style={{ borderColor: THEME.line }}>
        {client.status === "paid" ? (
          <button
            onClick={onUndoPaid}
            title="Desfazer pagamento deste mês"
            className="text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: THEME.paper, color: THEME.inkSoft }}
          >
            Desfazer
          </button>
        ) : (
          <button
            onClick={onMarkPaid}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white"
            style={{ background: THEME.brand }}
          >
            <Check size={13} /> Recebido
          </button>
        )}
        <button onClick={onEdit} className="p-2 rounded-lg" style={{ color: THEME.inkSoft }}>
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg" style={{ color: THEME.rose }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ hasClients, onNew }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{ background: THEME.paperAlt, border: `1px dashed ${THEME.line}` }}
    >
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: THEME.brandSoft }}
      >
        <Tag size={20} color={THEME.brand} />
      </div>
      <p className="font-medium mb-1" style={{ color: THEME.ink }}>
        {hasClients ? "Nenhum cliente encontrado" : "Ainda sem clientes cadastrados"}
      </p>
      <p className="text-sm mb-5" style={{ color: THEME.inkSoft }}>
        {hasClients ? "Ajuste os filtros ou a busca." : "Cadastre o primeiro negócio local que fechou contrato com você."}
      </p>
      {!hasClients && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: THEME.brand }}
        >
          <Plus size={16} /> Cadastrar cliente
        </button>
      )}
    </div>
  );
}

function ClientModal({ form, setForm, onToggleService, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5" style={{ background: "rgba(11,43,38,0.45)" }}>
      <form
        onSubmit={onSubmit}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: THEME.paperAlt }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="brand-font text-xl" style={{ color: THEME.brandDeep }}>
            {form.id ? "Editar cliente" : "Novo cliente"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: THEME.inkSoft }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nome do negócio">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Pet Shop Bichinho Feliz"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: `1px solid ${THEME.line}` }}
            />
          </Field>

          <Field label="Segmento">
            <select
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: `1px solid ${THEME.line}` }}
            >
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {form.segment === "Outro" && (
            <Field label="Qual segmento?">
              <input
                value={form.customSegment}
                onChange={(e) => setForm({ ...form, customSegment: e.target.value })}
                placeholder="Digite o segmento"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: `1px solid ${THEME.line}` }}
              />
            </Field>
          )}

          <Field label="Serviço vendido">
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const active = form.services.includes(s.id);
                const Icon = s.icon;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => onToggleService(s.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium"
                    style={{
                      background: active ? THEME.brandSoft : THEME.paper,
                      color: active ? THEME.brand : THEME.inkSoft,
                      border: `1px solid ${active ? THEME.brand : THEME.line}`,
                    }}
                  >
                    <Icon size={13} /> {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor mensal (R$)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="297,00"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: `1px solid ${THEME.line}` }}
              />
            </Field>
            <Field label="Dia do vencimento">
              <input
                required
                type="number"
                min="1"
                max="28"
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: `1px solid ${THEME.line}` }}
              />
            </Field>
          </div>

          <Field label="Telefone (opcional)">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 90000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: `1px solid ${THEME.line}` }}
            />
          </Field>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: THEME.paper, color: THEME.inkSoft }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: THEME.brand }}
          >
            {form.id ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium block mb-1.5" style={{ color: THEME.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}

function ConfirmDialog({ title, description, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(11,43,38,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: THEME.paperAlt }}>
        <p className="font-semibold mb-2" style={{ color: THEME.ink }}>{title}</p>
        <p className="text-sm mb-5" style={{ color: THEME.inkSoft }}>{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: THEME.paper, color: THEME.inkSoft }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: THEME.rose }}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
