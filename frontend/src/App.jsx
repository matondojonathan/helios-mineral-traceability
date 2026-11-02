import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse, faBoxesStacked, faPlus, faRightLeft,
  faShieldHalved, faClockRotateLeft, faChartPie,
  faGear, faBell, faMagnifyingGlass, faSun, faMoon,
  faArrowRight, faCube, faUsers, faBars, faXmark,
  faChevronDown, faMountainSun, faRotate,
  faCircleExclamation, faCheckCircle, faDatabase,
  faArrowUpRightFromSquare
} from '@fortawesome/free-solid-svg-icons'
import './App.css'

const API_URL = "https://quebec-watershed-asbestos-wants.trycloudflare.com/api";

const navigation = [
  { label: 'Tableau de bord', icon: faHouse },
  { label: 'Lots de minerais', icon: faBoxesStacked },
  { label: 'Enregistrer un lot', icon: faPlus },
  { label: 'Transfert', icon: faRightLeft },
  { label: 'Certification', icon: faShieldHalved },
  { label: 'Historique', icon: faClockRotateLeft },
  { label: 'Rapports', icon: faChartPie },
]

function HeliosLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 52 52" className="h-11 w-11 shrink-0" fill="none">
        <path d="M9 5h13v42H9z" fill="currentColor" />
        <path d="M30 5h13v42H30z" fill="#F59E0B" opacity=".9" />
        <path
          d="M5 34 39 7l8 9L14 44z"
          fill="#F59E0B"
          stroke="#0F1720"
          strokeWidth="1.5"
        />
        <path d="m25 29 7 12H18z" fill="#0F1720" />
      </svg>

      <div>
        <div className="font-heading text-2xl font-bold tracking-[0.16em]">
          HELIOS
        </div>
        <div className="text-[9px] font-semibold tracking-[0.22em] text-muted">
          TRAÇABILITÉ MINIÈRE
        </div>
      </div>
    </div>
  )
}

// Formater la date renvoyée par Hyperledger Fabric
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Date indisponible'

  try {
    let date

    if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else if (timestamp.seconds !== undefined) {
      const seconds = typeof timestamp.seconds === 'object'
        ? timestamp.seconds.low
        : Number(timestamp.seconds)

      date = new Date(seconds * 1000)
    } else {
      return 'Date indisponible'
    }

    if (Number.isNaN(date.getTime())) {
      return 'Date indisponible'
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date)
  } catch {
    return 'Date indisponible'
  }
}

// Identifier le type de modification
function getTransactionLabel(current, previous, isDelete) {
  if (isDelete) {
    return {
      label: 'Suppression',
      description: 'Le lot a été supprimé',
      color: 'red',
    }
  }

  if (!previous) {
    return {
      label: 'Création',
      description: 'Création initiale du lot',
      color: 'blue',
    }
  }

  if (current?.owner !== previous?.owner) {
    return {
      label: 'Transfert',
      description: `Propriétaire : ${previous.owner} → ${current.owner}`,
      color: 'blue',
    }
  }

  if (current?.certified !== previous?.certified) {
    return {
      label: current.certified ? 'Certification' : 'Modification',
      description: current.certified
        ? `Lot certifié${current.certifiedBy ? ` par ${current.certifiedBy}` : ''}`
        : 'Statut de certification modifié',
      color: 'green',
    }
  }

  return {
    label: 'Modification',
    description: 'Mise à jour des informations du lot',
    color: 'orange',
  }
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('helios-theme')

    return saved || (
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    )
  })

  const [activePage, setActivePage] = useState('Tableau de bord')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Données blockchain
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  // Création
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [newLot, setNewLot] = useState({
    id: '',
    type: 'Cobalt',
    origin: '',
    weight: '',
    owner: '',
  })

  // Transfert
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState('')

  const [transferData, setTransferData] = useState({
    id: '',
    newOwner: '',
  })

  // Historique
  const [historyLotId, setHistoryLotId] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const selectedLot = lots.find(lot => lot.id === transferData.id)

  // Récupérer tous les lots
  async function fetchLots() {
    setLoading(true)
    setApiError('')

    try {
      const response = await fetch(`${API_URL}/lots`)

      if (!response.ok) {
        throw new Error('Impossible de récupérer les lots.')
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Format de données invalide.')
      }

      setLots(data)
    } catch (error) {
      console.error('Erreur de chargement :', error)
      setApiError(
        'Impossible de récupérer les données de la blockchain. Vérifiez que Fabric et le backend sont démarrés.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Créer un lot
  async function handleCreateLot(event) {
    event.preventDefault()

    setCreating(true)
    setCreateError('')
    setCreateSuccess('')

    try {
      const response = await fetch(`${API_URL}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLot,
          weight: Number(newLot.weight),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Échec de création.')
      }

      const createdId = newLot.id

      setNewLot({
        id: '',
        type: 'Cobalt',
        origin: '',
        weight: '',
        owner: '',
      })

      await fetchLots()
      setShowCreateModal(false)
      setCreateSuccess(`Le lot ${createdId} a été enregistré.`)
    } catch (error) {
      setCreateError(error.message)
    } finally {
      setCreating(false)
    }
  }

  // Ouvrir le transfert
  function openTransferModal() {
    setTransferError('')
    setTransferSuccess('')
    setTransferData({ id: '', newOwner: '' })
    setShowTransferModal(true)
  }

  // Transférer un lot
  async function handleTransfer(event) {
    event.preventDefault()

    if (!transferData.id || !transferData.newOwner.trim()) {
      setTransferError('Veuillez sélectionner un lot et renseigner le nouveau propriétaire.')
      return
    }

    if (
      selectedLot &&
      selectedLot.owner.trim().toLowerCase() ===
      transferData.newOwner.trim().toLowerCase()
    ) {
      setTransferError('Le nouveau propriétaire doit être différent du propriétaire actuel.')
      return
    }

    setTransferring(true)
    setTransferError('')

    try {
      const response = await fetch(
        `${API_URL}/lots/${encodeURIComponent(transferData.id)}/transfer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newOwner: transferData.newOwner.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Échec du transfert.')
      }

      const transferredId = data.id || transferData.id
      const owner = data.owner || transferData.newOwner.trim()

      await fetchLots()
      setShowTransferModal(false)

      setTransferSuccess(
        `Le propriétaire du lot ${transferredId} est maintenant ${owner}.`
      )
    } catch (error) {
      setTransferError(error.message)
    } finally {
      setTransferring(false)
    }
  }

  // Charger l'historique d'un lot
  async function fetchHistory(lotId) {
    if (!lotId) {
      setHistory([])
      setHistoryError('')
      return
    }

    setHistoryLoading(true)
    setHistoryError('')
    setHistory([])

    try {
      const response = await fetch(
        `${API_URL}/lots/${encodeURIComponent(lotId)}/history`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Impossible de récupérer l’historique.')
      }

      if (!Array.isArray(data)) {
        throw new Error('Format de l’historique invalide.')
      }

      // Fabric renvoie l'historique du plus récent au plus ancien.
      // On inverse une copie pour afficher la chronologie du plus ancien au plus récent.
      setHistory([...data].reverse())
    } catch (error) {
      console.error('Erreur historique :', error)
      setHistoryError(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  function openHistory(lotId = '') {
    setActivePage('Historique')
    setHistoryLotId(lotId)
    setHistory([])
    setHistoryError('')
    setSidebarOpen(false)

    if (lotId) {
      fetchHistory(lotId)
    }
  }

  // Thème
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('helios-theme', theme)
  }, [theme])

  // Chargement initial
  useEffect(() => {
    fetchLots()
  }, [])

  // Recherche
  const filteredLots = lots.filter(lot =>
    `${lot.id} ${lot.type} ${lot.origin} ${lot.owner}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  // Statistiques
  const certifiedCount = lots.filter(
    lot => lot.certified === true
  ).length

  const totalWeight = lots.reduce(
    (total, lot) => total + Number(lot.weight || 0),
    0
  )

  // Affichage du tableau de bord
  const showDashboard = activePage === 'Tableau de bord'
  const showLots = activePage === 'Lots de minerais'
  const showHistory = activePage === 'Historique'

  return (
    <div className="min-h-screen bg-[var(--bg)] text-main">

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-app bg-[var(--surface)] transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-app px-6">
          <HeliosLogo />

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted lg:hidden"
            aria-label="Fermer le menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Espace de travail
          </p>

          <nav className="space-y-1">
            {navigation.map(item => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === 'Enregistrer un lot') {
                    setCreateError('')
                    setCreateSuccess('')
                    setShowCreateModal(true)
                  } else if (item.label === 'Transfert') {
                    openTransferModal()
                  } else if (item.label === 'Historique') {
                    openHistory()
                  } else {
                    setActivePage(item.label)
                  }

                  setSidebarOpen(false)
                }}
                className={`sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                  activePage === item.label ? 'active' : ''
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-app p-4">
          <button
            onClick={() => setActivePage('Paramètres')}
            className="sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm"
          >
            <FontAwesomeIcon icon={faGear} />
            Paramètres
          </button>

          <div className="mt-4 flex items-center gap-3 border-t border-app pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
              JM
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Jonathan Matondo</p>
              <p className="text-xs text-muted">Administrateur</p>
            </div>

            <FontAwesomeIcon icon={faChevronDown} className="text-xs text-muted" />
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="min-h-screen lg:ml-64">

        {/* TOPBAR */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-app bg-[var(--surface)]/95 px-4 backdrop-blur-md sm:px-8">

          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-main lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>

            <div className="relative hidden w-full max-w-md sm:block">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />

              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher un lot, une origine..."
                className="w-full rounded-lg border border-app bg-[var(--surface-secondary)] py-3 pl-11 pr-4 text-sm outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-app text-muted hover:text-amber-500"
              aria-label="Changer de thème"
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>

            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-amber-500"
              aria-label="Notifications"
            >
              <FontAwesomeIcon icon={faBell} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                JM
              </div>

              <div>
                <p className="text-sm font-semibold">Jonathan Matondo</p>
                <p className="text-xs text-muted">Administrateur</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-8">

          {/* NOTIFICATIONS */}
          {apiError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">
              {apiError}
            </div>
          )}

          {createSuccess && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-600">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              {createSuccess}
            </div>
          )}

          {transferSuccess && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-600">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              {transferSuccess}
            </div>
          )}

          {/* TABLEAU DE BORD */}
          {showDashboard && (
            <>
              <section className="relative overflow-hidden rounded-2xl bg-[#172536] p-6 text-white sm:p-9">
                <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border-[35px] border-white/5" />
                <div className="absolute -bottom-36 right-48 h-72 w-72 rounded-full border-[35px] border-amber-400/10" />

                <div className="relative z-10 max-w-2xl">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                    <FontAwesomeIcon icon={faMountainSun} />
                    HELIOS MINERAL TRACEABILITY
                  </div>

                  <h1 className="font-heading text-2xl font-bold leading-tight sm:text-4xl">
                    La traçabilité des minerais stratégiques.
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                    Transparence, confiance et développement durable grâce à la technologie blockchain.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="brand-button rounded-lg px-5 py-3 text-sm font-bold"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Enregistrer un lot
                    </button>

                    <button
                      onClick={openTransferModal}
                      className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      <FontAwesomeIcon icon={faRightLeft} className="mr-2" />
                      Transférer un lot
                    </button>
                  </div>
                </div>
              </section>

              <ConnectionStatus
                loading={loading}
                onRefresh={fetchLots}
              />

              <section>
                <div className="mb-4">
                  <h2 className="font-heading text-lg font-bold">Vue d'ensemble</h2>
                  <p className="mt-1 text-sm text-muted">
                    Statistiques calculées à partir de tous les lots récupérés.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={faCube}
                    label="Lots enregistrés"
                    value={loading ? '...' : lots.length}
                    color="green"
                  />

                  <StatCard
                    icon={faRightLeft}
                    label="Poids total"
                    value={loading ? '...' : `${totalWeight.toLocaleString('fr-FR')} kg`}
                    color="blue"
                  />

                  <StatCard
                    icon={faShieldHalved}
                    label="Lots certifiés"
                    value={loading ? '...' : certifiedCount}
                    color="green"
                  />

                  <StatCard
                    icon={faUsers}
                    label="Organisations du réseau"
                    value="2"
                    color="orange"
                  />
                </div>
              </section>

              <LotsTable
                lots={filteredLots.slice(0, 5)}
                loading={loading}
                onViewHistory={openHistory}
                onViewAll={() => setActivePage('Lots de minerais')}
                title="Derniers lots enregistrés"
              />
            </>
          )}

          {/* LISTE COMPLÈTE DES LOTS */}
          {showLots && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-2xl font-bold">
                    Lots de minerais
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Ensemble des lots enregistrés sur Hyperledger Fabric.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="brand-button rounded-lg px-4 py-3 text-sm font-bold"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Nouveau lot
                </button>
              </div>

              <ConnectionStatus loading={loading} onRefresh={fetchLots} />

              <LotsTable
                lots={filteredLots}
                loading={loading}
                onViewHistory={openHistory}
                title="Registre des minerais"
              />
            </section>
          )}

          {/* HISTORIQUE */}
          {showHistory && (
            <section className="space-y-6">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-2xl font-bold">
                    Historique des transactions
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Traçabilité chronologique des modifications inscrites dans le ledger.
                  </p>
                </div>

                <button
                  onClick={() => historyLotId && fetchHistory(historyLotId)}
                  disabled={!historyLotId || historyLoading}
                  className="rounded-lg border border-app px-4 py-3 text-sm font-semibold text-muted disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faRotate} spin={historyLoading} className="mr-2" />
                  Actualiser
                </button>
              </div>

              <div className="app-surface rounded-xl p-5">
                <label className="mb-2 block text-sm font-semibold">
                  Sélectionner un lot
                </label>

                <select
                  value={historyLotId}
                  onChange={event => {
                    setHistoryLotId(event.target.value)
                    fetchHistory(event.target.value)
                  }}
                  className="w-full max-w-xl rounded-lg border border-app bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">Choisir un lot...</option>

                  {lots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.id} — {lot.type} — {lot.owner}
                    </option>
                  ))}
                </select>
              </div>

              {historyLotId && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    icon={faDatabase}
                    label="Transactions enregistrées"
                    value={historyLoading ? '...' : history.length}
                    color="blue"
                  />

                  <StatCard
                    icon={faCube}
                    label="Identifiant du lot"
                    value={historyLotId}
                    color="green"
                  />

                  <StatCard
                    icon={faClockRotateLeft}
                    label="Source"
                    value="Fabric Ledger"
                    color="orange"
                  />
                </div>
              )}

              {historyError && (
                <ErrorMessage message={historyError} />
              )}

              {historyLoading && (
                <div className="app-surface rounded-xl p-10 text-center text-muted">
                  <FontAwesomeIcon icon={faRotate} spin className="mb-3 text-xl text-amber-500" />
                  <p>Récupération de l'historique depuis la blockchain...</p>
                </div>
              )}

              {!historyLoading && historyLotId && !historyError && history.length === 0 && (
                <div className="app-surface rounded-xl p-10 text-center text-muted">
                  Aucune transaction trouvée pour ce lot.
                </div>
              )}

              {!historyLoading && history.length > 0 && (
                <section className="app-surface overflow-hidden rounded-xl">
                  <div className="border-b border-app p-5">
                    <h2 className="font-heading text-lg font-bold">
                      Journal des transactions
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Les opérations sont présentées dans leur ordre d'inscription sur la blockchain.
                    </p>
                  </div>

                  <div className="divide-y divide-[var(--border)]">
                    {history.map((record, index) => {
                      const current = record.value
                      const previous = index > 0
                        ? history[index - 1].value
                        : null

                      const transaction = getTransactionLabel(
                        current,
                        previous,
                        record.isDelete
                      )

                      return (
                        <div key={`${record.txId}-${index}`} className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                transaction.color === 'green'
                                  ? 'bg-green-500/10 text-green-600'
                                  : transaction.color === 'blue'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : transaction.color === 'red'
                                      ? 'bg-red-500/10 text-red-600'
                                      : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                <FontAwesomeIcon icon={faClockRotateLeft} />
                              </div>

                              <div>
                                <h3 className="font-semibold">
                                  {transaction.label}
                                </h3>
                                <p className="mt-1 text-sm text-muted">
                                  {transaction.description}
                                </p>
                              </div>
                            </div>

                            <span className="text-xs text-muted">
                              {record.timestamp
                                ? formatTimestamp(record.timestamp)
                                : 'Horodatage non exposé par Fabric Shim'}
                            </span>
                          </div>

                          <div className="mt-4 rounded-lg bg-[var(--surface-secondary)] p-3">
                            <p className="mb-1 text-xs text-muted">
                              Identifiant de transaction
                            </p>

                            <p className="break-all font-mono text-xs">
                              {record.txId || 'Identifiant non exposé par Fabric Shim'}
                            </p>
                          </div>

                          {current && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <HistoryField
                                label="Propriétaire"
                                value={current.owner}
                              />

                              <HistoryField
                                label="Poids"
                                value={`${Number(current.weight).toLocaleString('fr-FR')} kg`}
                              />

                              <HistoryField
                                label="Certification"
                                value={current.certified ? 'Certifié' : 'En attente'}
                                color={current.certified ? 'green' : 'orange'}
                              />
                            </div>
                          )}

                          {current?.certifiedBy && (
                            <p className="mt-3 text-xs text-muted">
                              Autorité de certification : {current.certifiedBy}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {!historyLotId && (
                <div className="app-surface rounded-xl p-10 text-center">
                  <FontAwesomeIcon
                    icon={faClockRotateLeft}
                    className="mb-4 text-3xl text-muted"
                  />
                  <h3 className="font-heading text-lg font-bold">
                    Consultez l'historique d'un lot
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Sélectionnez un identifiant pour afficher ses transactions blockchain.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* AUTRES PAGES NON ENCORE IMPLÉMENTÉES */}
          {!showDashboard && !showLots && !showHistory && (
            <div className="app-surface rounded-xl p-10 text-center">
              <h1 className="font-heading text-2xl font-bold">
                {activePage}
              </h1>
              <p className="mt-2 text-sm text-muted">
                Ce module sera disponible dans une prochaine étape.
              </p>
            </div>
          )}

          <footer className="flex flex-col justify-between gap-2 border-t border-app pt-5 text-xs text-muted sm:flex-row">
            <p>© 2026 HELIOS — Traçabilité minière.</p>
            <p>Propulsé par Hyperledger Fabric.</p>
          </footer>
        </div>
      </main>

      {/* MODAL CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="app-surface max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6">
            <ModalHeader
              title="Enregistrer un lot"
              description="Ajouter un nouveau minerai à la blockchain."
              onClose={() => !creating && setShowCreateModal(false)}
            />

            <form onSubmit={handleCreateLot} className="space-y-4">
              <FormInput
                label="Identifiant du lot"
                value={newLot.id}
                placeholder="Ex : LOT003"
                onChange={value => setNewLot({ ...newLot, id: value })}
                required
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Type de minerai
                </label>
                <select
                  value={newLot.type}
                  onChange={event => setNewLot({
                    ...newLot,
                    type: event.target.value,
                  })}
                  className="w-full rounded-lg border border-app bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-amber-500"
                >
                  <option value="Cobalt">Cobalt</option>
                  <option value="Coltan">Coltan</option>
                </select>
              </div>

              <FormInput
                label="Origine"
                value={newLot.origin}
                placeholder="Ex : Lualaba-RDC"
                onChange={value => setNewLot({ ...newLot, origin: value })}
                required
              />

              <FormInput
                label="Poids (kg)"
                type="number"
                min="0.01"
                step="any"
                value={newLot.weight}
                placeholder="Ex : 750"
                onChange={value => setNewLot({ ...newLot, weight: value })}
                required
              />

              <FormInput
                label="Propriétaire"
                value={newLot.owner}
                placeholder="Nom de l'entreprise"
                onChange={value => setNewLot({ ...newLot, owner: value })}
                required
              />

              {createError && <ErrorMessage message={createError} />}

              <ModalActions
                onCancel={() => setShowCreateModal(false)}
                loading={creating}
                loadingText="Enregistrement..."
                submitText="Enregistrer sur la blockchain"
              />
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERT */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="app-surface max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6">
            <ModalHeader
              title="Transfert de propriété"
              description="Modifier le propriétaire d'un lot sur la blockchain."
              onClose={() => !transferring && setShowTransferModal(false)}
            />

            <form onSubmit={handleTransfer} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Sélectionner le lot
                </label>

                <select
                  required
                  value={transferData.id}
                  onChange={event => setTransferData({
                    ...transferData,
                    id: event.target.value,
                    newOwner: '',
                  })}
                  className="w-full rounded-lg border border-app bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">Choisir un lot...</option>

                  {lots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.id} — {lot.type}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLot && (
                <div className="rounded-xl border border-app bg-[var(--surface-secondary)] p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                    Informations du lot
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <HistoryField label="Identifiant" value={selectedLot.id} />
                    <HistoryField label="Minerai" value={selectedLot.type} />
                    <HistoryField
                      label="Poids"
                      value={`${Number(selectedLot.weight).toLocaleString('fr-FR')} kg`}
                    />
                    <HistoryField label="Origine" value={selectedLot.origin} />
                  </div>

                  <div className="mt-4 border-t border-app pt-3">
                    <p className="text-xs text-muted">Propriétaire actuel</p>
                    <p className="mt-1 text-sm font-bold text-blue-500">
                      {selectedLot.owner}
                    </p>
                  </div>
                </div>
              )}

              <FormInput
                label="Nouveau propriétaire"
                value={transferData.newOwner}
                placeholder="Nom de la nouvelle entreprise"
                onChange={value => setTransferData({
                  ...transferData,
                  newOwner: value,
                })}
                required
              />

              {transferError && <ErrorMessage message={transferError} />}

              <ModalActions
                onCancel={() => setShowTransferModal(false)}
                loading={transferring}
                loadingText="Transfert en cours..."
                submitText="Confirmer le transfert"
                icon={faRightLeft}
                disabled={!transferData.id || !transferData.newOwner.trim()}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// TABLEAU DES LOTS
function LotsTable({
  lots,
  loading,
  onViewHistory,
  onViewAll,
  title,
}) {
  return (
    <section className="app-surface overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app p-5">
        <div>
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted">
            Informations récupérées depuis la blockchain.
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-semibold text-blue-500 hover:underline"
          >
            Voir tous <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-[var(--surface-secondary)] text-xs text-muted">
            <tr>
              <th className="px-5 py-4">Identifiant</th>
              <th className="px-5 py-4">Minerai</th>
              <th className="px-5 py-4">Origine</th>
              <th className="px-5 py-4">Poids</th>
              <th className="px-5 py-4">Propriétaire</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">Historique</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-muted">
                  Chargement des lots...
                </td>
              </tr>
            ) : lots.length > 0 ? (
              lots.map(lot => (
                <tr
                  key={lot.id}
                  className="border-t border-app hover:bg-[var(--surface-secondary)]"
                >
                  <td className="px-5 py-4 font-semibold">{lot.id}</td>
                  <td className="px-5 py-4">{lot.type}</td>
                  <td className="px-5 py-4 text-muted">{lot.origin}</td>
                  <td className="px-5 py-4">
                    {Number(lot.weight).toLocaleString('fr-FR')} kg
                  </td>
                  <td className="px-5 py-4">{lot.owner}</td>

                  <td className="px-5 py-4">
                    {lot.certified ? (
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                        Certifié
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                        En attente
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {onViewHistory && (
                      <button
                        onClick={() => onViewHistory(lot.id)}
                        className="text-blue-500 hover:text-blue-400"
                        title="Consulter l'historique"
                        aria-label={`Historique de ${lot.id}`}
                      >
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-muted">
                  Aucun lot enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ConnectionStatus({ loading, onRefresh }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        {loading ? (
          <>
            <FontAwesomeIcon icon={faRotate} spin className="text-amber-500" />
            <span className="text-muted">Chargement des données blockchain...</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted">
              Données récupérées depuis Hyperledger Fabric
            </span>
          </>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-xs font-semibold text-muted hover:text-amber-500 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faRotate} spin={loading} />
        Actualiser
      </button>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    orange: 'bg-amber-500/10 text-amber-600',
  }

  return (
    <article className="app-surface flex items-center gap-4 rounded-xl p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg ${colors[color]}`}>
        <FontAwesomeIcon icon={icon} />
      </div>

      <div className="min-w-0">
        <p className="break-words font-heading text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </article>
  )
}

function HistoryField({ label, value, color }) {
  const textColor = {
    green: 'text-green-600',
    orange: 'text-amber-600',
    blue: 'text-blue-500',
  }

  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold ${textColor[color] || ''}`}>
        {value || 'Non renseigné'}
      </p>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  min,
  step,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <input
        required={required}
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-app bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-amber-500"
      />
    </div>
  )
}

function ErrorMessage({ message }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
      <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
      {message}
    </div>
  )
}

function ModalHeader({ title, description, onClose }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="font-heading text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-muted hover:text-red-500"
        aria-label="Fermer"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  )
}

function ModalActions({
  onCancel,
  loading,
  loadingText,
  submitText,
  icon = faCheckCircle,
  disabled = false,
}) {
  return (
    <div className="flex flex-wrap justify-end gap-3 pt-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-lg border border-app px-4 py-3 text-sm font-semibold disabled:opacity-50"
      >
        Annuler
      </button>

      <button
        type="submit"
        disabled={loading || disabled}
        className="brand-button rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50"
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faRotate} spin className="mr-2" />
            {loadingText}
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={icon} className="mr-2" />
            {submitText}
          </>
        )}
      </button>
    </div>
  )
}

export default App
