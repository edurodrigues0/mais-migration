import { NavLink, Route, Routes } from 'react-router-dom'
import { WizardPage } from '@ui/pages/wizard/WizardPage'
import { HistoryPage } from '@ui/pages/HistoryPage'

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>MAIS Migration</strong>
          <span>Migrador de ERPs para suporte.</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Nova migração
          </NavLink>
          <NavLink to="/historico">Histórico</NavLink>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<WizardPage />} />
          <Route path="/historico" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  )
}
