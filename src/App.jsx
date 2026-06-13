import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

const STORAGE_KEYS = {
  users: 'invoiceflow-lite-users',
  invoices: 'invoiceflow-lite-invoices',
  session: 'invoiceflow-lite-session',
}

const DEMO_USER = {
  name: 'Nova Reed',
  email: 'demo@invoiceflow.lite',
  password: 'invoiceflow',
}

const seedUsers = [DEMO_USER]

const seedInvoices = [
  {
    id: 'INV-041',
    number: 'INV-041',
    clientName: 'Helix Studio',
    clientEmail: 'billing@helixstudio.ai',
    invoiceDate: '2026-06-01',
    dueDate: '2026-06-15',
    taxRate: 8,
    status: 'paid',
    notes: 'Creative direction, motion polish, and launch support.',
    items: [
      { id: 'item-1', description: 'Brand system redesign', quantity: 1, rate: 1800 },
      { id: 'item-2', description: 'Motion landing page build', quantity: 1, rate: 2200 },
    ],
  },
  {
    id: 'INV-042',
    number: 'INV-042',
    clientName: 'Orbit Health',
    clientEmail: 'finance@orbithealth.io',
    invoiceDate: '2026-06-05',
    dueDate: '2026-06-20',
    taxRate: 8,
    status: 'unpaid',
    notes: 'Analytics dashboard and workflow automation support.',
    items: [
      { id: 'item-3', description: 'Product UI system', quantity: 1, rate: 1450 },
      { id: 'item-4', description: 'Automation integration', quantity: 2, rate: 650 },
    ],
  },
  {
    id: 'INV-043',
    number: 'INV-043',
    clientName: 'Luma Cloud',
    clientEmail: 'ops@lumacloud.dev',
    invoiceDate: '2026-06-09',
    dueDate: '2026-06-23',
    taxRate: 8,
    status: 'paid',
    notes: 'Retainer for interface tuning and release support.',
    items: [{ id: 'item-5', description: 'Weekly design retainer', quantity: 1, rate: 3200 }],
  },
]

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function futureIso(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function createItem() {
  return { id: uid('item'), description: 'Strategy sprint', quantity: 1, rate: 1200 }
}

function createDraft() {
  return {
    clientName: '',
    clientEmail: '',
    invoiceDate: todayIso(),
    dueDate: futureIso(14),
    taxRate: 8,
    notes: 'Thank you for choosing InvoiceFlow Lite.',
    items: [createItem()],
  }
}

function createInvoiceNumber(invoices) {
  const nextNumber = invoices.reduce((max, invoice) => {
    const parsed = Number.parseInt(String(invoice.number).replace(/\D/g, ''), 10)
    return Number.isFinite(parsed) && parsed > max ? parsed : max
  }, 0)

  return `INV-${String(nextNumber + 1).padStart(3, '0')}`
}

function calculateTotals(items, taxRate) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    return sum + quantity * rate
  }, 0)

  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100)
  const total = subtotal + taxAmount

  return { subtotal, taxAmount, total }
}

async function exportInvoicePdf(invoice, ownerName) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 42
  const totals = calculateTotals(invoice.items, invoice.taxRate)

  pdf.setFillColor(10, 10, 10)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.text('InvoiceFlow Lite', margin, 50)
  pdf.setFontSize(11)
  pdf.setTextColor(124, 58, 237)
  pdf.text('Futuristic local invoice ledger', margin, 68)
  pdf.setDrawColor(6, 182, 212)
  pdf.setLineWidth(2)
  pdf.line(margin, 82, pageWidth - margin, 82)

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(18)
  pdf.text(invoice.number, margin, 120)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Created by ${ownerName || 'InvoiceFlow Operator'}`, margin, 138)
  pdf.text(`Client: ${invoice.clientName}`, margin, 154)
  pdf.text(`Email: ${invoice.clientEmail}`, margin, 170)
  pdf.text(`Invoice date: ${formatDate(invoice.invoiceDate)}`, margin, 186)
  pdf.text(`Due date: ${formatDate(invoice.dueDate)}`, margin, 202)

  let y = 240
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(118, 168, 255)
  pdf.text('Line Items', margin, y)
  y += 18

  pdf.setFillColor(17, 24, 39)
  pdf.roundedRect(margin, y - 12, pageWidth - margin * 2, 24, 8, 8, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.text('Description', margin + 12, y + 4)
  pdf.text('Qty', margin + 300, y + 4)
  pdf.text('Rate', margin + 346, y + 4)
  pdf.text('Amount', margin + 448, y + 4)

  y += 28
  pdf.setFont('helvetica', 'normal')
  invoice.items.forEach((item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0)
    pdf.setTextColor(231, 236, 245)
    pdf.text(String(item.description), margin + 12, y)
    pdf.text(String(item.quantity), margin + 300, y)
    pdf.text(formatCurrency(item.rate), margin + 346, y)
    pdf.text(formatCurrency(amount), margin + 448, y)
    y += 20
  })

  y += 10
  pdf.setDrawColor(31, 41, 55)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 24

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text(`Subtotal: ${formatCurrency(totals.subtotal)}`, margin + 300, y)
  y += 18
  pdf.text(`Tax (${invoice.taxRate}%): ${formatCurrency(totals.taxAmount)}`, margin + 300, y)
  y += 18
  pdf.setTextColor(6, 182, 212)
  pdf.text(`Total: ${formatCurrency(totals.total)}`, margin + 300, y)

  if (invoice.notes) {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(180, 193, 255)
    pdf.text(`Notes: ${invoice.notes}`, margin, y + 42, { maxWidth: pageWidth - margin * 2 })
  }

  pdf.save(`${invoice.number}.pdf`)
}

function useAuthData() {
  const [users, setUsers] = useState(() => readJson(STORAGE_KEYS.users, seedUsers))
  const [invoices, setInvoices] = useState(() => readJson(STORAGE_KEYS.invoices, seedInvoices))
  const [session, setSession] = useState(() => readJson(STORAGE_KEYS.session, null))

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
  }, [users])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices))
  }, [invoices])

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
      return
    }

    window.localStorage.removeItem(STORAGE_KEYS.session)
  }, [session])

  return { users, setUsers, invoices, setInvoices, session, setSession }
}

function Icon({ children, title }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" role={title ? 'img' : 'presentation'} aria-hidden={title ? undefined : true} className="icon">
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

function DashboardIcon() {
  return <Icon title="Dashboard"><path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-5H4v5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></Icon>
}

function InvoiceIcon() {
  return <Icon title="Invoices"><path d="M7 4h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 12h8M8 16h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></Icon>
}

function CreateIcon() {
  return <Icon title="Create"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Icon>
}

function LogoutIcon() {
  return <Icon title="Logout"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 8l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></Icon>
}

function DownloadIcon() {
  return <Icon title="Download PDF"><path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></Icon>
}

function ShieldIcon() {
  return <Icon title="Security"><path d="M12 3 6 6v5c0 4.2 2.7 7.8 6 10 3.3-2.2 6-5.8 6-10V6l-6-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9.8 12 1.7 1.7L14.7 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status}</span>
}

function RequireAuth({ session, children }) {
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function AuthPage({ mode, users, session, setUsers, setSession }) {
  const isLogin = mode === 'login'
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: isLogin ? DEMO_USER.email : '',
    password: isLogin ? DEMO_USER.password : '',
  })

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, session])

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (isLogin) {
      const matchedUser = users.find(
        (user) => user.email.toLowerCase() === form.email.toLowerCase() && user.password === form.password,
      )

      if (!matchedUser) {
        setError('Invalid credentials. Use the demo account or sign up first.')
        return
      }

      setSession({ email: matchedUser.email, name: matchedUser.name })
      navigate('/dashboard', { replace: true })
      return
    }

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    if (users.some((user) => user.email.toLowerCase() === form.email.toLowerCase())) {
      setError('That email is already registered.')
      return
    }

    const nextUser = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    }

    setUsers((current) => [...current, nextUser])
    setSession({ email: nextUser.email, name: nextUser.name })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <section className="auth-hero glass-panel">
        <div className="brand-mark brand-mark-large">
          <span>IF</span>
        </div>
        <p className="eyebrow">InvoiceFlow Lite / secure local ledger</p>
        <h1>Build invoices in a dark, luminous control room.</h1>
        <p className="hero-copy">
          The app runs entirely in your browser with localStorage, live calculations, status tracking, and direct PDF export.
        </p>

        <div className="feature-row">
          <span className="feature-chip"><ShieldIcon /> Glass security</span>
          <span className="feature-chip"><InvoiceIcon /> Auto totals</span>
          <span className="feature-chip"><DownloadIcon /> PDF export</span>
        </div>
      </section>

      <section className="auth-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{isLogin ? 'Welcome back' : 'Start your account'}</p>
            <h2>{isLogin ? 'Login' : 'Sign up'}</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin ? (
            <label className="field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nova Reed" />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="nova@studio.ai" />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="••••••••" />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="button-primary button-large button-full">
            {isLogin ? 'Enter dashboard' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'Need an account? ' : 'Already registered? '}
          <Link to={isLogin ? '/signup' : '/login'}>{isLogin ? 'Sign up here' : 'Go to login'}</Link>
        </p>

        <div className="demo-banner">
          <span>Demo login</span>
          <strong>{DEMO_USER.email}</strong>
          <strong>{DEMO_USER.password}</strong>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <article className={`stat-card stat-${accent} glass-panel`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="stat-glow" />
    </article>
  )
}

function DashboardPage({ invoices, user }) {
  const stats = useMemo(() => {
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid')
    const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid')
    const revenue = paidInvoices.reduce((sum, invoice) => sum + calculateTotals(invoice.items, invoice.taxRate).total, 0)

    return {
      total: invoices.length,
      paid: paidInvoices.length,
      unpaid: unpaidInvoices.length,
      revenue,
    }
  }, [invoices])

  return (
    <div className="page-stack fade-in">
      <section className="hero-panel glass-panel">
        <div>
          <p className="eyebrow">Cashflow command layer</p>
          <h2>Hello, {user?.name || 'Operator'}.</h2>
          <p className="hero-copy">
            Track paid and unpaid invoices, automate totals, and ship polished PDFs from a single futuristic workspace.
          </p>
        </div>
        <div className="hero-metric">
          <span>Revenue locked in</span>
          <strong>{formatCurrency(stats.revenue)}</strong>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Total" value={stats.total.toString()} accent="violet" />
        <StatCard label="Paid" value={stats.paid.toString()} accent="cyan" />
        <StatCard label="Unpaid" value={stats.unpaid.toString()} accent="rose" />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} accent="emerald" />
      </section>

      <section className="glass-panel content-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h3>Latest invoices</h3>
          </div>
          <Link to="/invoices" className="text-button">View full ledger</Link>
        </div>

        <div className="recent-grid">
          {invoices.slice(0, 4).map((invoice) => {
            const totals = calculateTotals(invoice.items, invoice.taxRate)

            return (
              <article className="recent-card" key={invoice.id}>
                <div className="recent-top">
                  <div>
                    <strong>{invoice.number}</strong>
                    <span>{invoice.clientName}</span>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="recent-meta">
                  <span>Due {formatDate(invoice.dueDate)}</span>
                  <span>{invoice.items.length} line items</span>
                </div>
                <div className="recent-total">{formatCurrency(totals.total)}</div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CreateInvoicePage({ invoices, setInvoices }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(createDraft)
  const [error, setError] = useState('')

  const totals = useMemo(() => calculateTotals(draft.items, draft.taxRate), [draft.items, draft.taxRate])

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const updateItem = (itemId, field, value) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }))
  }

  const addItem = () => {
    setDraft((current) => ({ ...current, items: [...current.items, createItem()] }))
  }

  const removeItem = (itemId) => {
    setDraft((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((item) => item.id !== itemId) : current.items,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!draft.clientName.trim() || !draft.clientEmail.trim()) {
      setError('Client name and email are required.')
      return
    }

    const cleanItems = draft.items
      .map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
      }))
      .filter((item) => item.description && item.quantity > 0)

    if (!cleanItems.length) {
      setError('Add at least one invoice line item.')
      return
    }

    const invoice = {
      id: uid('invoice'),
      number: createInvoiceNumber(invoices),
      clientName: draft.clientName.trim(),
      clientEmail: draft.clientEmail.trim(),
      invoiceDate: draft.invoiceDate,
      dueDate: draft.dueDate,
      taxRate: Number(draft.taxRate) || 0,
      status: 'unpaid',
      notes: draft.notes.trim(),
      items: cleanItems,
    }

    setInvoices((current) => [invoice, ...current])
    setDraft(createDraft())
    navigate('/invoices')
  }

  return (
    <div className="page-grid fade-in">
      <form className="glass-panel form-panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Create invoice</p>
            <h3>Launch a new billing record</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Client name</span>
            <input value={draft.clientName} onChange={(event) => updateField('clientName', event.target.value)} placeholder="Helix Studio" />
          </label>
          <label className="field">
            <span>Client email</span>
            <input type="email" value={draft.clientEmail} onChange={(event) => updateField('clientEmail', event.target.value)} placeholder="billing@helixstudio.ai" />
          </label>
          <label className="field">
            <span>Invoice date</span>
            <input type="date" value={draft.invoiceDate} onChange={(event) => updateField('invoiceDate', event.target.value)} />
          </label>
          <label className="field">
            <span>Due date</span>
            <input type="date" value={draft.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} />
          </label>
          <label className="field">
            <span>Tax rate</span>
            <input type="number" min="0" step="0.1" value={draft.taxRate} onChange={(event) => updateField('taxRate', event.target.value)} />
          </label>
          <label className="field">
            <span>Notes</span>
            <input value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Delivery notes, scope, or payment details" />
          </label>
        </div>

        <div className="items-block">
          <div className="items-head">
            <h4>Invoice items</h4>
            <button type="button" className="button-secondary" onClick={addItem}>+ Add line</button>
          </div>

          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item) => {
                  const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0)

                  return (
                    <tr key={item.id}>
                      <td>
                        <input value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder="Creative sprint" />
                      </td>
                      <td>
                        <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(item.id, 'rate', event.target.value)} />
                      </td>
                      <td>
                        <span className="amount-pill">{formatCurrency(amount)}</span>
                      </td>
                      <td>
                        <button type="button" className="icon-button" onClick={() => removeItem(item.id)} aria-label="Remove item">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="button-primary button-large">Save invoice</button>
      </form>

      <aside className="side-stack">
        <section className="glass-panel preview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live preview</p>
              <h3>Calculated totals</h3>
            </div>
          </div>

          <div className="summary-list">
            <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <div><span>Tax</span><strong>{formatCurrency(totals.taxAmount)}</strong></div>
            <div className="summary-total"><span>Total</span><strong>{formatCurrency(totals.total)}</strong></div>
          </div>

          <div className="summary-card">
            <span>Next invoice number</span>
            <strong>{createInvoiceNumber(invoices)}</strong>
          </div>
        </section>

        <section className="glass-panel tip-panel">
          <p className="eyebrow">Workflow</p>
          <h3>Designed for speed</h3>
          <ul>
            <li>Inputs glow on focus to keep attention on the active field.</li>
            <li>All values are stored locally in the browser.</li>
            <li>PDFs export directly from the invoice ledger.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function InvoicesPage({ invoices, setInvoices, onDownloadPdf }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesFilter = filter === 'all' ? true : invoice.status === filter
      const text = `${invoice.number} ${invoice.clientName} ${invoice.clientEmail}`.toLowerCase()
      const matchesQuery = text.includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [filter, invoices, query])

  const toggleStatus = (invoiceId) => {
    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, status: invoice.status === 'paid' ? 'unpaid' : 'paid' } : invoice,
      ),
    )
  }

  const deleteInvoice = (invoiceId) => {
    if (!window.confirm('Delete this invoice?')) return

    setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceId))
  }

  return (
    <div className="page-stack fade-in">
      <section className="glass-panel content-panel">
        <div className="panel-heading ledger-heading">
          <div>
            <p className="eyebrow">Invoice list</p>
            <h3>Ledger overview</h3>
          </div>

          <div className="ledger-controls">
            <label className="search-field">
              <span className="sr-only">Search invoices</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client or number" />
            </label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {filteredInvoices.length ? (
          <div className="table-shell">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const totals = calculateTotals(invoice.items, invoice.taxRate)

                  return (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.number}</strong>
                        <span>{invoice.items.length} items</span>
                      </td>
                      <td>
                        <strong>{invoice.clientName}</strong>
                        <span>{invoice.clientEmail}</span>
                      </td>
                      <td>
                        <strong>{formatDate(invoice.invoiceDate)}</strong>
                        <span>Due {formatDate(invoice.dueDate)}</span>
                      </td>
                      <td><StatusBadge status={invoice.status} /></td>
                      <td>
                        <strong>{formatCurrency(totals.total)}</strong>
                        <span>Tax {invoice.taxRate}%</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="action-button action-icon" onClick={() => onDownloadPdf(invoice)}>
                            <DownloadIcon />
                          </button>
                          <button type="button" className="action-button" onClick={() => toggleStatus(invoice.id)}>
                            {invoice.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                          </button>
                          <button type="button" className="action-button action-danger" onClick={() => deleteInvoice(invoice.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No invoices found" description="Try a different filter or create a new invoice to populate the ledger." />
        )}
      </section>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-orb" />
      <h4>{title}</h4>
      <p>{description}</p>
      <Link to="/create" className="button-primary">
        <CreateIcon />
        <span>Create invoice</span>
      </Link>
    </div>
  )
}

function AppShell({ currentUser, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  const title = useMemo(() => {
    if (location.pathname.includes('/create')) return 'Create Invoice'
    if (location.pathname.includes('/invoices')) return 'Invoice List'
    return 'Dashboard'
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel">
        <div>
          <div className="brand-lockup sidebar-brand">
            <div className="brand-mark"><span>IF</span></div>
            <div>
              <p className="eyebrow">InvoiceFlow Lite</p>
              <h2>Neural billing</h2>
            </div>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <DashboardIcon />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/invoices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <InvoiceIcon />
              <span>Invoices</span>
            </NavLink>
            <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CreateIcon />
              <span>Create</span>
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div>
            <p className="eyebrow">Signed in</p>
            <strong>{currentUser?.name || 'Operator'}</strong>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              onLogout()
              navigate('/login', { replace: true })
            }}
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar glass-panel">
          <div>
            <p className="eyebrow">2027 Control Room</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-chip">{currentUser?.email || 'local session'}</div>
            <Link className="button-primary small" to="/create">
              <CreateIcon />
              New invoice
            </Link>
          </div>
        </header>

        <div className="content-grid">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function AppRoutes() {
  const { users, setUsers, invoices, setInvoices, session, setSession } = useAuthData()
  const currentUser = users.find((user) => user.email === session?.email) || null

  useEffect(() => {
    document.title = 'InvoiceFlow Lite'
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" users={users} session={session} setUsers={setUsers} setSession={setSession} />} />
        <Route path="/signup" element={<AuthPage mode="signup" users={users} session={session} setUsers={setUsers} setSession={setSession} />} />
        <Route
          path="/"
          element={
            <RequireAuth session={session}>
              <AppShell currentUser={currentUser} onLogout={() => setSession(null)} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage invoices={invoices} user={currentUser} />} />
          <Route path="create" element={<CreateInvoicePage invoices={invoices} setInvoices={setInvoices} />} />
          <Route path="invoices" element={<InvoicesPage invoices={invoices} setInvoices={setInvoices} onDownloadPdf={(invoice) => exportInvoicePdf(invoice, currentUser?.name)} />} />
        </Route>
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
