// Episode Replay Controller

class EpisodeReplayController {
    constructor() {
        this.currentEpisode = null;
        this.currentStep = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        this.animationFrame = null;
        this.lastUpdateTime = 0;

        // Initialize visualizer (shares code with live view)
        this.visualizer = new ATCVisualizer();

        this.setupControls();
        this.loadEpisodeList();
    }

    setupControls() {
        // Play/Pause button
        document.getElementById('play-pause').addEventListener('click', () => {
            this.togglePlayback();
        });

        // Step buttons
        document.getElementById('step-back').addEventListener('click', () => {
            this.stepBackward();
        });

        document.getElementById('step-forward').addEventListener('click', () => {
            this.stepForward();
        });

        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.reset();
        });

        // Speed controls
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setSpeed(speed);

                // Update active state
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Timeline interaction
        const timeline = document.getElementById('timeline');
        const marker = document.getElementById('marker');

        let dragging = false;

        const updatePosition = (e) => {
            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = Math.max(0, Math.min(1, x / rect.width));

            if (this.currentEpisode) {
                const targetStep = Math.floor(progress * this.currentEpisode.steps.length);
                this.seekToStep(targetStep);
            }
        };

        timeline.addEventListener('mousedown', (e) => {
            dragging = true;
            this.pause();
            updatePosition(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (dragging) {
                updatePosition(e);
            }
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.stepBackward();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.stepForward();
                    break;
                case 'r':
                    this.reset();
                    break;
            }
        });
    }

    async loadEpisodeList() {
        // In a real implementation, this would fetch from the server
        // For now, show a placeholder
        const listEl = document.getElementById('episode-list');

        // Mock data for demonstration
        const mockEpisodes = [
            {
                id: 1,
                timestamp: '2025-01-07 14:32:15',
                total_reward: 25.4,
                episode_length: 150,
                los_events: 0
            },
            {
                id: 2,
                timestamp: '2025-01-07 14:35:42',
                total_reward: 18.2,
                episode_length: 200,
                los_events: 1
            },
            {
                id: 3,
                timestamp: '2025-01-07 14:38:11',
                total_reward: 31.7,
                episode_length: 180,
                los_events: 0
            }
        ];

        listEl.innerHTML = mockEpisodes.map(ep => `
            <div class="episode-item" data-episode-id="${ep.id}">
                <div class="episode-title">Episode ${ep.id}</div>
                <div class="episode-stats">
                    <span>Reward: ${ep.total_reward.toFixed(1)}</span>
                    <span>Length: ${ep.episode_length}</span>
                </div>
                <div class="episode-stats">
                    <span>${ep.timestamp}</span>
                    <span>LoS: ${ep.los_events}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.episode-item').forEach(item => {
            item.addEventListener('click', () => {
                const episodeId = parseInt(item.dataset.episodeId);
                this.loadEpisode(episodeId);

                // Update selected state
                document.querySelectorAll('.episode-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            });
        });
    }

    async loadEpisode(episodeId) {
        // In real implementation, fetch from server/file
        // For now, generate mock data
        console.log(`Loading episode ${episodeId}...`);

        this.pause();

        // Generate mock episode data
        const numSteps = 100;
        const steps = [];

        for (let i = 0; i < numSteps; i++) {
            const t = i / numSteps;
            steps.push({
                step: i,
                timestamp: Date.now() / 1000 + i * 5,
                states: this.generateMockStates(i),
                reward: Math.sin(t * Math.PI) * 0.5,
                info: {
                    los: 0,
                    min_sep_nm: 10 + Math.random() * 5,
                    num_alive: 4
                }
            });
        }

        this.currentEpisode = {
            metadata: {
                episode_id: episodeId,
                total_reward: 25.4,
                episode_length: numSteps,
                info: { los: 0 }
            },
            steps: steps
        };

        this.currentStep = 0;
        this.updateMetrics();
        this.updateTimeline();
        this.render();

        document.getElementById('episode-info').textContent =
            `Episode ${episodeId} | ${numSteps} steps`;

        console.log('Episode loaded');
    }

    generateMockStates(step) {
        // Generate mock aircraft states for demonstration
        const states = [];
        const numAircraft = 4;

        for (let i = 0; i < numAircraft; i++) {
            const angle = (i / numAircraft) * 2 * Math.PI + step * 0.01;
            const radius = 40;

            states.push({
                id: `AC${i.toString().padStart(3, '0')}`,
                x_nm: radius * Math.cos(angle),
                y_nm: radius * Math.sin(angle),
                v_kt: 250,
                hdg_rad: angle + Math.PI,
                alt_ft: 10000 + i * 1000,
                goal_x_nm: -radius * Math.cos(angle),
                goal_y_nm: -radius * Math.sin(angle),
                alive: step < 90 || i < 2
            });
        }

        return states;
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.currentEpisode) return;

        this.isPlaying = true;
        this.lastUpdateTime = Date.now();

        document.getElementById('play-pause').innerHTML = '⏸ Pause';
        document.getElementById('play-pause').classList.add('active');

        this.animate();
    }

    pause() {
        this.isPlaying = false;

        document.getElementById('play-pause').innerHTML = '▶ Play';
        document.getElementById('play-pause').classList.remove('active');

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;

        // Advance based on speed (assuming 5 seconds per step)
        const stepsToAdvance = (deltaTime / 1000) * this.playbackSpeed / 5;

        if (stepsToAdvance >= 1) {
            this.currentStep += Math.floor(stepsToAdvance);
            this.lastUpdateTime = now;

            if (this.currentStep >= this.currentEpisode.steps.length) {
                this.currentStep = this.currentEpisode.steps.length - 1;
                this.pause();
            }

            this.updateTimeline();
            this.render();
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    stepForward() {
        if (!this.currentEpisode) return;

        this.pause();
        this.currentStep = Math.min(this.currentStep + 1, this.currentEpisode.steps.length - 1);
        this.updateTimeline();
        this.render();
    }

    stepBackward() {
        if (!this.currentEpisode) return;

        this.pause();
        this.currentStep = Math.max(this.currentStep - 1, 0);
        this.updateTimeline();
        this.render();
    }

    seekToStep(step) {
        if (!this.currentEpisode) return;

        this.currentStep = Math.max(0, Math.min(step, this.currentEpisode.steps.length - 1));
        this.updateTimeline();
        this.render();
    }

    reset() {
        if (!this.currentEpisode) return;

        this.pause();
        this.currentStep = 0;
        this.updateTimeline();
        this.render();
    }

    setSpeed(speed) {
        this.playbackSpeed = speed;
        console.log(`Playback speed: ${speed}x`);
    }

    updateTimeline() {
        if (!this.currentEpisode) return;

        const progress = this.currentStep / (this.currentEpisode.steps.length - 1);
        const progressEl = document.getElementById('progress');
        const markerEl = document.getElementById('marker');

        progressEl.style.width = `${progress * 100}%`;
        markerEl.style.left = `${progress * 100}%`;

        // Update step info
        document.getElementById('current-step').textContent =
            `Step: ${this.currentStep} / ${this.currentEpisode.steps.length}`;

        // Update time info (assuming 5 seconds per step)
        const currentTime = this.currentStep * 5;
        const totalTime = this.currentEpisode.steps.length * 5;
        document.getElementById('current-time').textContent =
            `Time: ${currentTime.toFixed(1)}s / ${totalTime.toFixed(1)}s`;
    }

    updateMetrics() {
        if (!this.currentEpisode) return;

        const metadata = this.currentEpisode.metadata;

        document.getElementById('total-reward').textContent =
            metadata.total_reward.toFixed(2);

        document.getElementById('episode-length').textContent =
            metadata.episode_length;

        document.getElementById('los-events').textContent =
            metadata.info.los;

        // Update reward chart
        this.updateRewardChart();
    }

    updateRewardChart() {
        if (!this.currentEpisode) return;

        const canvas = document.getElementById('rewardCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        // Draw reward curve
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const steps = this.currentEpisode.steps;
        const rewards = steps.map(s => s.reward);

        const maxReward = Math.max(...rewards);
        const minReward = Math.min(...rewards);
        const range = maxReward - minReward || 1;

        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.beginPath();

        steps.forEach((step, i) => {
            const x = (i / (steps.length - 1)) * canvas.width;
            const y = canvas.height - ((step.reward - minReward) / range) * canvas.height * 0.9 - canvas.height * 0.05;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw current position indicator
        const currentX = (this.currentStep / (steps.length - 1)) * canvas.width;
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, canvas.height);
        ctx.stroke();
    }

    render() {
        if (!this.currentEpisode || this.currentStep >= this.currentEpisode.steps.length) {
            return;
        }

        const stepData = this.currentEpisode.steps[this.currentStep];
        this.visualizer.aircraft = stepData.states;

        // Update metrics in real-time
        if (stepData.info) {
            this.visualizer.updateMetric('los', stepData.info.los);
            this.visualizer.updateMetric('min-sep', stepData.info.min_sep_nm.toFixed(1));
            this.visualizer.updateMetric('alive', stepData.info.num_alive);
        }

        this.updateRewardChart();
    }
}

// Initialize replay controller when page loads
window.addEventListener('DOMContentLoaded', () => {
    new EpisodeReplayController();
});
