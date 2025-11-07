// ATC Training Visualizer - WebSocket Client

class ATCVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ws = null;
        this.aircraft = [];
        this.sectorSize = 100; // NM
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.metrics = {};

        this.setupCanvas();
        this.connect();
        this.setupControls();

        // Start render loop
        this.render();
    }

    setupCanvas() {
        const resize = () => {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.scale = Math.min(
                this.canvas.width / (this.sectorSize * 2.2),
                this.canvas.height / (this.sectorSize * 2.2)
            );
            this.offset = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2
            };
        };

        window.addEventListener('resize', resize);
        resize();
    }

    connect() {
        const wsUrl = 'ws://localhost:8765';
        console.log(`Connecting to ${wsUrl}...`);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateStatus(true);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.updateStatus(false);
            // Attempt reconnect after 3 seconds
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
    }

    handleMessage(data) {
        console.log('Received:', data.type);

        switch (data.type) {
            case 'reset':
                this.aircraft = data.states || [];
                this.updateMetric('episode', data.episode);
                this.updateMetric('step', 0);
                break;

            case 'step':
                this.aircraft = data.states || [];
                this.updateMetric('step', data.step);
                this.updateMetric('reward', data.reward?.toFixed(2) || '0.00');

                if (data.info) {
                    this.updateMetric('los', data.info.los || 0);
                    this.updateMetric('min-sep', data.info.min_sep_nm?.toFixed(1) || '∞');
                    this.updateMetric('alive', data.info.num_alive || 0);
                }
                break;

            case 'episode_end':
                this.updateMetric('episode', data.episode);
                if (data.metrics) {
                    this.updateMetric('mean-reward', data.metrics.mean_reward?.toFixed(2) || '—');
                }
                break;
        }
    }

    updateStatus(connected) {
        const indicator = document.getElementById('status');
        const text = document.getElementById('status-text');

        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    updateMetric(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;

            // Add alert class for safety violations
            if (id === 'los' && value > 0) {
                element.classList.add('alert');
            } else if (id === 'los') {
                element.classList.remove('alert');
            }
        }
    }

    setupControls() {
        // Placeholder for controls
        document.getElementById('play-pause').addEventListener('click', () => {
            console.log('Play/Pause clicked');
        });

        document.getElementById('reset').addEventListener('click', () => {
            console.log('Reset clicked');
        });

        document.getElementById('speed').addEventListener('click', (e) => {
            console.log('Speed clicked');
        });
    }

    worldToScreen(x, y) {
        return {
            x: this.offset.x + x * this.scale,
            y: this.offset.y - y * this.scale  // Flip Y axis
        };
    }

    getAltitudeColor(alt_ft) {
        if (alt_ft < 15000) {
            return '#4caf50';  // Green - low
        } else if (alt_ft < 25000) {
            return '#2196f3';  // Blue - medium
        } else {
            return '#ff9800';  // Orange - high
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw sector boundary
        this.drawSector();

        // Draw grid
        this.drawGrid();

        // Draw aircraft
        for (const ac of this.aircraft) {
            if (ac.alive) {
                this.drawAircraft(ac);
            }
        }

        requestAnimationFrame(() => this.render());
    }

    drawSector() {
        const topLeft = this.worldToScreen(-this.sectorSize, this.sectorSize);
        const bottomRight = this.worldToScreen(this.sectorSize, -this.sectorSize);
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        this.ctx.strokeStyle = '#1a1a2e';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);

        this.ctx.strokeStyle = '#16213e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    drawGrid() {
        const gridSpacing = 20; // NM
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = -this.sectorSize; x <= this.sectorSize; x += gridSpacing) {
            const top = this.worldToScreen(x, this.sectorSize);
            const bottom = this.worldToScreen(x, -this.sectorSize);

            this.ctx.beginPath();
            this.ctx.moveTo(top.x, top.y);
            this.ctx.lineTo(bottom.x, bottom.y);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = -this.sectorSize; y <= this.sectorSize; y += gridSpacing) {
            const left = this.worldToScreen(-this.sectorSize, y);
            const right = this.worldToScreen(this.sectorSize, y);

            this.ctx.beginPath();
            this.ctx.moveTo(left.x, left.y);
            this.ctx.lineTo(right.x, right.y);
            this.ctx.stroke();
        }

        // Center marker
        const center = this.worldToScreen(0, 0);
        this.ctx.fillStyle = '#e94560';
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawAircraft(ac) {
        const pos = this.worldToScreen(ac.x_nm, ac.y_nm);
        const color = this.getAltitudeColor(ac.alt_ft);

        // Draw goal marker (light circle)
        const goal = this.worldToScreen(ac.goal_x_nm, ac.goal_y_nm);
        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = 0.3;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(goal.x, goal.y, 6, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Draw line to goal (dashed)
        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = 0.2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(goal.x, goal.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;

        // Draw aircraft circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw heading indicator
        const hdgLength = 20;
        const hdgX = pos.x + Math.cos(ac.hdg_rad) * hdgLength;
        const hdgY = pos.y - Math.sin(ac.hdg_rad) * hdgLength;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(hdgX, hdgY);
        this.ctx.stroke();

        // Draw ID label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(ac.id, pos.x, pos.y - 15);

        // Draw altitude label
        this.ctx.fillStyle = color;
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`${(ac.alt_ft / 1000).toFixed(0)}k`, pos.x, pos.y + 25);
    }
}

// Initialize visualizer when page loads
window.addEventListener('DOMContentLoaded', () => {
    new ATCVisualizer();
});
