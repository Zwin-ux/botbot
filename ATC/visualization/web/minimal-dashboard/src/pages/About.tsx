function About() {
  return (
    <div className="container">
      <div className="header">
        <h1>ST-01 Observer</h1>
        <p>Experimental AI ATC observation platform</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>System Overview</h2>
          <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
            This dashboard provides real-time monitoring of the AI Air Traffic Controller training system.
            It connects directly to the Python backend via WebSocket to display live training metrics,
            decision analysis, and safety monitoring.
          </p>
          <div className="metric">
            <span className="metric-label">Version</span>
            <span className="metric-value">1.0.0</span>
          </div>
          <div className="metric">
            <span className="metric-label">Backend</span>
            <span className="metric-value">Python + RLlib</span>
          </div>
          <div className="metric">
            <span className="metric-label">Frontend</span>
            <span className="metric-value">React + TypeScript</span>
          </div>
          <div className="metric">
            <span className="metric-label">Protocol</span>
            <span className="metric-value">WebSocket</span>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Architecture</h2>
          <pre style={{ 
            fontSize: '0.8em', 
            lineHeight: 1.6,
            color: 'var(--text-dim)',
            whiteSpace: 'pre'
          }}>
{`Training Environment
       ↓
  Event Bus
       ↓
  ┌────┴────┬──────────┬─────────┐
  ↓         ↓          ↓         ↓
Decision  Safety   Scenario  Performance
Tracker   Analyzer Visualizer Monitor
       ↓
  WebSocket Server (port 8080)
       ↓
  This Dashboard`}
          </pre>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Message Types</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>training_status</code></td>
                <td>Overall training progress</td>
              </tr>
              <tr>
                <td><code>decision_update</code></td>
                <td>AI policy decisions</td>
              </tr>
              <tr>
                <td><code>performance_update</code></td>
                <td>Episode metrics</td>
              </tr>
              <tr>
                <td><code>safety_violation</code></td>
                <td>Safety events</td>
              </tr>
              <tr>
                <td><code>scenario_update</code></td>
                <td>Aircraft positions</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Quick Start</h2>
          <ol style={{ lineHeight: 1.8, paddingLeft: '1.5rem' }}>
            <li>Start the Python backend:
              <pre style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem', 
                background: 'var(--bg)', 
                borderRadius: '4px',
                fontSize: '0.85em'
              }}>
                python launch_simple_demo.py
              </pre>
            </li>
            <li>Start this dashboard:
              <pre style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem', 
                background: 'var(--bg)', 
                borderRadius: '4px',
                fontSize: '0.85em'
              }}>
                cd visualization/web/minimal-dashboard
                npm install
                npm run dev
              </pre>
            </li>
            <li>Open <code>http://localhost:3000</code></li>
          </ol>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Design Philosophy</h2>
        <p style={{ lineHeight: 1.6, marginBottom: '0.5rem' }}>
          This dashboard follows a <strong>truth over aesthetics</strong> approach:
        </p>
        <ul style={{ lineHeight: 1.8, paddingLeft: '1.5rem', color: 'var(--text-dim)' }}>
          <li>No unnecessary dependencies or UI libraries</li>
          <li>Direct WebSocket connection with zero abstractions</li>
          <li>Raw data display for debugging and verification</li>
          <li>Minimal, functional design focused on clarity</li>
          <li>Every element serves a purpose</li>
        </ul>
      </div>
    </div>
  );
}

export default About;
