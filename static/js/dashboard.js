/**
 * Bot Detector Lab - Dashboard Controller
 * Handles real-time stats fetching and visualization
 */

let lastUpdateTime = 0;
let logsCache = [];

// DOM Loaded Event
document.addEventListener('DOMContentLoaded', () => {
    fetchData(); // Initial fetch
    
    // Set auto-refresh
    setInterval(fetchData, 3000);

    // Smooth scroll handler
    setupScrollHandler();
});

// Fetch statistics from API
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Update stat cards
        document.getElementById('totalSessions').textContent = data.total_sessions;
        document.getElementById('totalEvents').textContent = data.total_events.toLocaleString();
        document.getElementById('totalLogins').textContent = data.total_logins;
        document.getElementById('humanCount').textContent = data.humans;
        document.getElementById('botCount').textContent = data.bots;
        document.getElementById('botRate').textContent = data.bot_detection_rate.toFixed(1) + '%';

        // Update pie chart
        updatePieChart(data.humans, data.bots);

        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Update pie chart SVG
function updatePieChart(humans, bots) {
    const total = humans + bots;
    document.getElementById('totalLoginsChart').textContent = total;

    if (total === 0) {
        resetPieChart();
        return;
    }

    const circumference = 2 * Math.PI * 90; // ~565.48
    const humanPercent = (humans / total) * 100;
    const botPercent = (bots / total) * 100;

    const humanArc = (humanPercent / 100) * circumference;
    const botArc = (botPercent / 100) * circumference;

    const humanSlice = document.getElementById('humanSlice');
    const botSlice = document.getElementById('botSlice');

    humanSlice.setAttribute('stroke-dasharray', `${humanArc} ${circumference - humanArc}`);
    botSlice.setAttribute('stroke-dasharray', `${botArc} ${circumference - botArc}`);
    botSlice.setAttribute('stroke-dashoffset', -humanArc);

    document.getElementById('humanPercent').textContent = humanPercent.toFixed(1);
    document.getElementById('botPercent').textContent = botPercent.toFixed(1);
}

function resetPieChart() {
    document.getElementById('humanSlice').setAttribute('stroke-dasharray', '0 565.48');
    document.getElementById('botSlice').setAttribute('stroke-dasharray', '0 565.48');
    document.getElementById('humanPercent').textContent = '0';
    document.getElementById('botPercent').textContent = '0';
}

// Fetch recent login logs
async function fetchLogs() {
    try {
        const response = await fetch('/data/logins.jsonl');
        if (!response.ok) return [];

        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line.trim());
        
        // Parse logs, sort by newest, take last 50
        const logs = lines.map(line => JSON.parse(line))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50);

        return logs;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

// Render logs to the container
function renderLogs(logs) {
    const logsList = document.getElementById('logsList');

    if (logs.length === 0) {
        logsList.innerHTML = `
            <div class="empty-state">
                <div class="emoji">🔍</div>
                <div>No login attempts yet. Waiting for data...</div>
            </div>
        `;
        return;
    }

    // Only re-render if data changed to avoid flickering
    const currentHTML = logsList.innerHTML;
    const newHTML = logs.map(createLogEntryHTML).join('');
    
    if (logs.length !== logsCache.length || logs[0]?.timestamp !== logsCache[0]?.timestamp) {
        logsList.innerHTML = newHTML;
    }
}

function createLogEntryHTML(log) {
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();
    const logClass = log.is_bot ? 'bot' : 'human';
    const logType = log.is_bot ? '⚠ Bot' : '✓ Human';

    return `
        <div class="log-entry ${logClass}">
            <div class="log-header">
                <span class="log-type">${logType}</span>
                <span class="log-time">${timeStr} - ${dateStr}</span>
            </div>
            <div class="log-session">Session: ${log.session_id}</div>
            <div class="log-reason">
                ${log.is_bot ? '🚫 ' + log.reason : '✅ Passed all checks - Human behavior detected'}
            </div>
            <div>
                ${log.is_bot ? `<span class="log-confidence">Confidence: ${(log.confidence * 100).toFixed(0)}%</span>` : ''}
                <span style="color: #64748b; font-size: 12px; margin-left: 12px;">
                    Submit time: ${log.time_to_submit}ms
                </span>
            </div>
        </div>
    `;
}

// Main orchestrator
async function fetchData() {
    const indicator = document.getElementById('refreshIndicator');
    if(indicator) indicator.classList.add('active');

    try {
        const [stats, logs] = await Promise.all([
            fetchStats(),
            fetchLogs()
        ]);

        renderLogs(logs);
        logsCache = logs;
        lastUpdateTime = Date.now();
    } catch (error) {
        console.error('Error in fetch cycle:', error);
    } finally {
        if(indicator) {
            setTimeout(() => indicator.classList.remove('active'), 1000);
        }
    }
}

function setupScrollHandler() {
    let previousLogCount = 0;
    setInterval(() => {
        if (logsCache.length > previousLogCount) {
            const logsContainer = document.getElementById('logsContainer');
            if(logsContainer) {
                logsContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        previousLogCount = logsCache.length;
    }, 3000);
}