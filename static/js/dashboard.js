/**
 * Bot Detector Lab - Enhanced Dashboard Controller
 * Real-time stats with manual refresh and auto-update
 */

class DashboardController {
  constructor(config = {}) {
    this.config = {
      autoRefreshInterval: config.autoRefreshInterval || 10000, // 10 seconds
      maxLogs: config.maxLogs || 50
    };
    
    this.logsCache = [];
    this.isRefreshing = false;
    this.autoRefreshTimer = null;
    this.lastUpdateTime = null;
    
    this.init();
  }

  /**
   * Initialize dashboard
   */
  init() {
    // Initial data load
    this.refresh();
    
    // Setup auto-refresh
    this.startAutoRefresh();
    
    // Setup manual refresh button
    this.setupRefreshButton();
    
    // Update time display
    this.startTimeUpdater();
  }

  /**
   * Main refresh function
   */
  async refresh() {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    this.showRefreshIndicator();
    
    try {
      // Fetch stats and logs in parallel
      const [stats, logs] = await Promise.all([
        this.fetchStats(),
        this.fetchLogs()
      ]);
      
      // Update UI
      this.updateStats(stats);
      this.updatePieChart(stats.humans, stats.bots);
      this.renderLogs(logs);
      
      this.logsCache = logs;
      this.lastUpdateTime = new Date();
      
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      this.showError('Failed to refresh data');
    } finally {
      this.isRefreshing = false;
      this.hideRefreshIndicator();
    }
  }

  /**
   * Fetch statistics from API
   */
  async fetchStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Fetch logs from API (UPDATED to use /api/logs)
   */
  async fetchLogs() {
    try {
      const response = await fetch(`/api/logs?limit=${this.config.maxLogs}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const logs = await response.json();
      return logs; // Already sorted by server
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  /**
   * Update statistics cards
   */
  updateStats(stats) {
    this.updateElement('totalSessions', stats.total_sessions);
    this.updateElement('totalEvents', stats.total_events.toLocaleString());
    this.updateElement('totalLogins', stats.total_logins);
    this.updateElement('humanCount', stats.humans);
    this.updateElement('botCount', stats.bots);
    this.updateElement('botRate', stats.bot_detection_rate.toFixed(1) + '%');
  }

  /**
   * Update pie chart
   */
  updatePieChart(humans, bots) {
    const total = humans + bots;
    const totalElement = document.getElementById('totalLoginsChart');
    const humanPercentElement = document.getElementById('humanPercent');
    const botPercentElement = document.getElementById('botPercent');
    
    if (totalElement) totalElement.textContent = total;

    if (total === 0) {
      this.updateChartSlice('humanSlice', 0);
      this.updateChartSlice('botSlice', 0);
      if (humanPercentElement) humanPercentElement.textContent = '0';
      if (botPercentElement) botPercentElement.textContent = '0';
      return;
    }

    const humanPercent = (humans / total) * 100;
    const botPercent = (bots / total) * 100;

    const circumference = 2 * Math.PI * 90; // 565.48
    const humanArc = (humanPercent / 100) * circumference;
    const botArc = (botPercent / 100) * circumference;

    this.updateChartSlice('humanSlice', humanArc, circumference);
    this.updateChartSlice('botSlice', botArc, circumference, -humanArc);

    if (humanPercentElement) humanPercentElement.textContent = humanPercent.toFixed(1);
    if (botPercentElement) botPercentElement.textContent = botPercent.toFixed(1);
  }

  /**
   * Update SVG chart slice
   */
  updateChartSlice(elementId, arc, circumference = 565.48, offset = 0) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.setAttribute('stroke-dasharray', `${arc} ${circumference - arc}`);
    if (offset !== 0) {
      element.setAttribute('stroke-dashoffset', offset);
    }
  }

  /**
   * Render logs list
   */
  renderLogs(logs) {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    if (logs.length === 0) {
      logsList.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🔍</div>
          <div>No login attempts yet. Waiting for data...</div>
        </div>
      `;
      return;
    }

    logsList.innerHTML = logs.map(log => this.createLogEntry(log)).join('');
  }

  /**
   * Create single log entry HTML
   */
  createLogEntry(log) {
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

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
    
    this.autoRefreshTimer = setInterval(() => {
      this.refresh();
    }, this.config.autoRefreshInterval);
    
    console.log(`Auto-refresh enabled (${this.config.autoRefreshInterval / 1000}s interval)`);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  /**
   * Setup refresh button
   */
  setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (!refreshBtn) return;
    
    refreshBtn.addEventListener('click', () => {
      this.refresh();
    });
  }

  /**
   * Start time updater (shows "Last updated X seconds ago")
   */
  startTimeUpdater() {
    setInterval(() => {
      this.updateLastUpdateTime();
    }, 1000); // Update every second
  }

  /**
   * Update "last updated" display
   */
  updateLastUpdateTime() {
    const element = document.getElementById('lastUpdated');
    if (!element || !this.lastUpdateTime) return;
    
    const now = new Date();
    const secondsAgo = Math.floor((now - this.lastUpdateTime) / 1000);
    
    let text;
    if (secondsAgo < 5) {
      text = 'Just now';
    } else if (secondsAgo < 60) {
      text = `${secondsAgo}s ago`;
    } else {
      const minutesAgo = Math.floor(secondsAgo / 60);
      text = `${minutesAgo}m ago`;
    }
    
    element.textContent = text;
  }

  /**
   * Show refresh indicator
   */
  showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
      indicator.classList.add('active');
    }
  }

  /**
   * Hide refresh indicator
   */
  hideRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
      setTimeout(() => {
        indicator.classList.remove('active');
      }, 1000);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = `⚠ ${message}`;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Update element text content safely
   */
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboardController = new DashboardController({
      autoRefreshInterval: 10000, // 10 seconds
      maxLogs: 50
    });
  });
} else {
  window.dashboardController = new DashboardController({
    autoRefreshInterval: 10000,
    maxLogs: 50
  });
}