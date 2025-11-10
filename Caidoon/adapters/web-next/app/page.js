"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const page_module_css_1 = __importDefault(require("./page.module.css"));
function Home() {
    const [playerId, setPlayerId] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const router = (0, navigation_1.useRouter)();
    const handleStartSession = async (e) => {
        e.preventDefault();
        if (!playerId.trim()) {
            setError('Please enter a player ID');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:8786';
            const response = await fetch(`${engineUrl}/session/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerId: playerId.trim() }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: 'Failed to start session' } }));
                throw new Error(errorData.error?.message || 'Failed to start session');
            }
            const session = await response.json();
            router.push(`/session/${session.sessionId}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setLoading(false);
        }
    };
    return (<main className={page_module_css_1.default.main}>
      <div className={page_module_css_1.default.container}>
        <h1 className={page_module_css_1.default.title}>AI Encounters</h1>
        <p className={page_module_css_1.default.subtitle}>Start your dynamic AI-powered adventure</p>

        <form onSubmit={handleStartSession} className={page_module_css_1.default.form}>
          <div className={page_module_css_1.default.inputGroup}>
            <label htmlFor="playerId" className={page_module_css_1.default.label}>
              Player ID
            </label>
            <input id="playerId" type="text" value={playerId} onChange={(e) => setPlayerId(e.target.value)} placeholder="Enter your player ID" className={page_module_css_1.default.input} disabled={loading}/>
          </div>

          {error && (<div className={page_module_css_1.default.error}>
              {error}
            </div>)}

          <button type="submit" className={page_module_css_1.default.button} disabled={loading}>
            {loading ? 'Starting...' : 'Start Encounter'}
          </button>
        </form>

        <div className={page_module_css_1.default.info}>
          <p>Enter any player ID to generate a unique encounter tailored for you.</p>
        </div>
      </div>
    </main>);
}
//# sourceMappingURL=page.js.map