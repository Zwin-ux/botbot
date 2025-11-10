"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SessionPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const EncounterDisplay_1 = __importDefault(require("../../components/EncounterDisplay"));
const ObjectiveList_1 = __importDefault(require("../../components/ObjectiveList"));
const NPCDialogue_1 = __importDefault(require("../../components/NPCDialogue"));
const RewardsDisplay_1 = __importDefault(require("../../components/RewardsDisplay"));
const page_module_css_1 = __importDefault(require("./page.module.css"));
function SessionPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const sessionId = params.id;
    const [session, setSession] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [completing, setCompleting] = (0, react_1.useState)(false);
    const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:8786';
    const fetchSession = async () => {
        try {
            const response = await fetch(`${engineUrl}/session/${sessionId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: 'Session not found' } }));
                throw new Error(errorData.error?.message || 'Failed to load session');
            }
            const data = await response.json();
            setSession(data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);
    const handleObjectiveComplete = async (objectiveId) => {
        if (!session)
            return;
        try {
            const response = await fetch(`${engineUrl}/session/${sessionId}/objective/${objectiveId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to update objective');
            }
            const updatedSession = await response.json();
            setSession(updatedSession);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update objective');
        }
    };
    const handleCompleteSession = async () => {
        if (!session)
            return;
        setCompleting(true);
        try {
            const response = await fetch(`${engineUrl}/session/${sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to complete session');
            }
            const completedSession = await response.json();
            setSession(completedSession);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete session');
        }
        finally {
            setCompleting(false);
        }
    };
    if (loading) {
        return (<main className={page_module_css_1.default.main}>
        <div className={page_module_css_1.default.loading}>Loading encounter...</div>
      </main>);
    }
    if (error || !session) {
        return (<main className={page_module_css_1.default.main}>
        <div className={page_module_css_1.default.errorContainer}>
          <h1 className={page_module_css_1.default.errorTitle}>Error</h1>
          <p className={page_module_css_1.default.errorMessage}>{error || 'Session not found'}</p>
          <button className={page_module_css_1.default.backButton} onClick={() => router.push('/')}>
            Back to Home
          </button>
        </div>
      </main>);
    }
    const allObjectivesCompleted = session.encounter.objectives.every((obj) => obj.completed);
    const isSessionCompleted = !!session.completedAt;
    return (<main className={page_module_css_1.default.main}>
      <div className={page_module_css_1.default.container}>
        <div className={page_module_css_1.default.header}>
          <button className={page_module_css_1.default.backLink} onClick={() => router.push('/')}>
            ← Back
          </button>
          <div className={page_module_css_1.default.sessionInfo}>
            <span className={page_module_css_1.default.sessionId}>Session: {sessionId}</span>
            <span className={page_module_css_1.default.playerId}>Player: {session.playerId}</span>
          </div>
        </div>

        {isSessionCompleted && (<div className={page_module_css_1.default.completedBanner}>
            ✓ Encounter Completed!
          </div>)}

        <EncounterDisplay_1.default encounter={session.encounter}/>
        
        <ObjectiveList_1.default objectives={session.encounter.objectives} onObjectiveComplete={!isSessionCompleted ? handleObjectiveComplete : undefined}/>

        <NPCDialogue_1.default npcs={session.encounter.npcs}/>

        <RewardsDisplay_1.default rewards={session.encounter.rewards}/>

        {!isSessionCompleted && allObjectivesCompleted && (<div className={page_module_css_1.default.completeSection}>
            <p className={page_module_css_1.default.completeMessage}>
              All objectives completed! Ready to finish this encounter?
            </p>
            <button className={page_module_css_1.default.completeButton} onClick={handleCompleteSession} disabled={completing}>
              {completing ? 'Completing...' : 'Complete Encounter'}
            </button>
          </div>)}

        {error && (<div className={page_module_css_1.default.errorBanner}>
            {error}
          </div>)}
      </div>
    </main>);
}
//# sourceMappingURL=page.js.map