import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import About from './pages/About';
import { useWebSocket } from './hooks/useWebSocket';
import { LogoWithText } from './components/Logo';

type Page = 'dashboard' | 'logs' | 'about';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { status } = useWebSocket();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'logs':
        return <Logs />;
      case 'about':
        return <About />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div>
      <nav className="nav">
        <LogoWithText />
        <div style={{ flex: 1, display: 'flex', gap: '0.5rem', marginLeft: '2rem' }}>
          <a
            href="#"
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setCurrentPage('dashboard'); }}
          >
            Dashboard
          </a>
          <a
            href="#"
            className={currentPage === 'logs' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setCurrentPage('logs'); }}
          >
            Event Stream
          </a>
          <a
            href="#"
            className={currentPage === 'about' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }}
          >
            About
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`status-dot ${status}`}></span>
          <span style={{ fontSize: '0.85em', color: 'var(--st-muted)', fontWeight: 500 }}>
            {status}
          </span>
        </div>
      </nav>
      {renderPage()}
    </div>
  );
}

export default App;
