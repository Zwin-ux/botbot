import { useWebSocketMessage, useWebSocketStream } from '../hooks/useWebSocket';
import type { TrainingStatus, DecisionUpdate, PerformanceMetrics, SafetyViolation } from '../api/websocket';

function Dashboard() {
  const trainingStatus = useWebSocketMessage<TrainingStatus | null>('training_status', null);
  const recentDecisions = useWebSocketStream<DecisionUpdate>('decision_update', 10);
  const recentMetrics = useWebSocketStream<PerformanceMetrics>('performance_update', 50);
  const recentViolations = useWebSocketStream<SafetyViolation>('safety_violation', 20);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Live Dashboard</h1>
        <p>Real-time training metrics and decision analysis</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Training Status */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Training Status</h2>
          {trainingStatus ? (
            <>
              <div className="metric">
                <span className="metric-label">Status</span>
                <span className="metric-value">
                  <span className={`badge ${trainingStatus.status === 'running' ? 'success' : 'info'}`}>
                    {trainingStatus.status}
                  </span>
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Episode</span>
                <span className="metric-value">
                  {trainingStatus.currentEpisode} / {trainingStatus.totalEpisodes}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Step</span>
                <span className="metric-value">
                  {trainingStatus.currentStep} / {trainingStatus.totalSteps}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Elapsed Time</span>
                <span className="metric-value">{formatTime(trainingStatus.elapsedTime)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Last Reward</span>
                <span className="metric-value">{trainingStatus.lastReward.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Average Reward</span>
                <span className="metric-value">{trainingStatus.averageReward.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Best Reward</span>
                <span className="metric-value">{trainingStatus.bestReward.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-dim)' }}>Waiting for training data...</p>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recent Decisions</h2>
          {recentDecisions.length > 0 ? (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {recentDecisions.map((decision, idx) => (
                <div key={idx} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>
                      {decision.aircraftId}
                    </span>
                    <span style={{ fontSize: '0.75em', color: 'var(--text-dim)' }}>
                      {formatTimestamp(decision.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85em' }}>
                    <div>Value: {decision.valueEstimate.toFixed(2)}</div>
                    <div>
                      Confidence: {Object.entries(decision.confidenceScores).map(([key, val]) => 
                        `${key}: ${(val * 100).toFixed(0)}%`
                      ).join(', ')}
                    </div>
                    {decision.explanation && (
                      <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.9em' }}>
                        {decision.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)' }}>No decisions yet</p>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Performance</h2>
          {recentMetrics.length > 0 ? (
            <>
              <div className="metric">
                <span className="metric-label">Latest Reward</span>
                <span className="metric-value">{recentMetrics[0].reward.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Cumulative Reward</span>
                <span className="metric-value">{recentMetrics[0].cumulativeReward.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Safety Score</span>
                <span className="metric-value">{recentMetrics[0].safetyScore.toFixed(1)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Violations</span>
                <span className="metric-value">
                  <span className={`badge ${recentMetrics[0].violationCount > 0 ? 'error' : 'success'}`}>
                    {recentMetrics[0].violationCount}
                  </span>
                </span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '0.9em', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>
                  Reward History (last 50)
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px' }}>
                  {recentMetrics.slice(0, 50).reverse().map((m, idx) => {
                    const maxReward = Math.max(...recentMetrics.map(r => r.reward));
                    const minReward = Math.min(...recentMetrics.map(r => r.reward));
                    const range = maxReward - minReward || 1;
                    const height = ((m.reward - minReward) / range) * 100;
                    const color = m.reward > 0 ? 'var(--success)' : 'var(--error)';
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          height: `${height}%`,
                          background: color,
                          opacity: 0.7,
                          minHeight: '2px'
                        }}
                        title={`Reward: ${m.reward.toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-dim)' }}>No metrics yet</p>
          )}
        </div>
      </div>

      {/* Safety Violations */}
      {recentViolations.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Safety Violations</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Aircraft</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {recentViolations.map((violation, idx) => (
                <tr key={idx}>
                  <td>{formatTimestamp(violation.timestamp)}</td>
                  <td>{violation.violationType}</td>
                  <td>
                    <span className={`badge ${violation.severity === 'critical' ? 'error' : violation.severity === 'high' ? 'warning' : 'info'}`}>
                      {violation.severity}
                    </span>
                  </td>
                  <td>{violation.aircraftIds.join(', ')}</td>
                  <td>{violation.distance.toFixed(2)} NM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
