import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface LogEntry {
  timestamp: number;
  type: string;
  data: any;
}

function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [paused, setPaused] = useState(false);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to all messages
    const unsubscribe = subscribe('*', (message: any) => {
      if (!paused) {
        setLogs(prev => {
          const newLog: LogEntry = {
            timestamp: Date.now(),
            type: message.type || 'unknown',
            data: message.data || message
          };
          return [newLog, ...prev].slice(0, 500); // Keep last 500
        });
      }
    });

    return unsubscribe;
  }, [subscribe, paused]);

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = filter
    ? logs.filter(log => 
        log.type.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const getLogClass = (type: string) => {
    if (type.includes('error') || type.includes('violation')) return 'error';
    if (type.includes('warning')) return 'warning';
    return 'info';
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Event Stream</h1>
        <p>Raw WebSocket message log with filtering</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '0.9em'
            }}
          />
          <button onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={clearLogs}>Clear</button>
          <span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>
            {filteredLogs.length} / {logs.length} events
          </span>
        </div>
      </div>

      <div className="card">
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => (
              <div key={idx} className={`log-entry ${getLogClass(log.type)}`}>
                <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
                <strong>{log.type}</strong>
                <pre style={{ 
                  marginTop: '0.25rem', 
                  fontSize: '0.85em', 
                  color: 'var(--text-dim)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
              {paused ? 'Logging paused' : 'Waiting for events...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Logs;
