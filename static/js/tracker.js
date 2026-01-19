/**
 * Bot Detector Lab - Enhanced Behavioral Tracking
 * Tracks mouse, keyboard, scroll, paste, and other interactions
 */

class BehaviorTracker {
  constructor(config = {}) {
    this.config = {
      batchSize: config.batchSize || 50,
      batchInterval: config.batchInterval || 2000,
      endpoint: config.endpoint || '/api/collect',
      debug: config.debug || false
    };

    this.sessionId = this.generateSessionId();
    this.eventBuffer = [];
    this.sessionStartTime = performance.now();
    this.pageLoadTime = Date.now();
    this.fingerprint = null;
    
    // State tracking
    this.lastMousePosition = { x: 0, y: 0, timestamp: 0 };
    this.keyboardState = {};
    this.scrollState = {
      lastY: 0,
      lastTimestamp: 0,
      scrollCount: 0
    };
    
    this.init();
  }

  /**
   * Initialize tracking
   */
  async init() {
    // Generate fingerprint
    if (window.BotDetectorFingerprint) {
      this.fingerprint = await window.BotDetectorFingerprint.getFingerprint();
    }
    
    this.attachEventListeners();
    this.startBatchTimer();
    this.sendSessionMetadata();
    
    window.addEventListener('beforeunload', () => this.flush());
    
    this.log('Tracker initialized', { sessionId: this.sessionId });
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Mouse events
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: true });
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: true });
    document.addEventListener('click', this.handleClick.bind(this), { passive: true });
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this), { passive: true });
    document.addEventListener('keyup', this.handleKeyUp.bind(this), { passive: true });
    
    // Scroll events (ENHANCED)
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    window.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });
    
    // Paste events (NEW - ENHANCED)
    document.addEventListener('paste', this.handlePaste.bind(this), { passive: true });
    
    // Copy events (NEW)
    document.addEventListener('copy', this.handleCopy.bind(this), { passive: true });
    
    // Focus/blur
    window.addEventListener('blur', this.handleBlur.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    
    // Form events
    document.addEventListener('input', this.handleInput.bind(this), { passive: true });
    document.addEventListener('change', this.handleChange.bind(this), { passive: true });
    
    // Context menu (NEW)
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this), { passive: true });
    
    // Selection (NEW)
    document.addEventListener('selectstart', this.handleSelectStart.bind(this), { passive: true });
  }

  /**
   * Mouse move handler
   */
  handleMouseMove(e) {
    const now = performance.now();
    const timestamp = Date.now();
    
    const timeDelta = now - this.lastMousePosition.timestamp;
    const distance = Math.sqrt(
      Math.pow(e.clientX - this.lastMousePosition.x, 2) +
      Math.pow(e.clientY - this.lastMousePosition.y, 2)
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;
    
    this.pushEvent('mousemove', {
      timestamp,
      precise_time: now,
      x: e.clientX,
      y: e.clientY,
      page_x: e.pageX,
      page_y: e.pageY,
      velocity: Math.round(velocity * 1000) / 1000,
      movement_x: e.movementX,
      movement_y: e.movementY,
      buttons: e.buttons
    });
    
    this.lastMousePosition = { x: e.clientX, y: e.clientY, timestamp: now };
  }

  handleMouseDown(e) {
    this.pushEvent('mousedown', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      buttons: e.buttons,
      target: this.getElementInfo(e.target)
    });
  }

  handleMouseUp(e) {
    this.pushEvent('mouseup', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      target: this.getElementInfo(e.target)
    });
  }

  handleClick(e) {
    this.pushEvent('click', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      target: this.getElementInfo(e.target),
      is_honeypot: this.isHoneypot(e.target)
    });
  }

  /**
   * Keyboard handlers
   */
  handleKeyDown(e) {
    const key = e.key;
    const now = performance.now();
    
    if (!this.keyboardState[key]) {
      this.keyboardState[key] = { downTime: now };
      
      this.pushEvent('keydown', {
        timestamp: Date.now(),
        precise_time: now,
        key: key,
        code: e.code,
        key_code: e.keyCode,
        ctrl_key: e.ctrlKey,
        alt_key: e.altKey,
        shift_key: e.shiftKey,
        meta_key: e.metaKey,
        target: this.getElementInfo(e.target)
      });
    }
  }

  handleKeyUp(e) {
    const key = e.key;
    const now = performance.now();
    
    let flightTime = 0;
    if (this.keyboardState[key]) {
      flightTime = now - this.keyboardState[key].downTime;
      delete this.keyboardState[key];
    }
    
    this.pushEvent('keyup', {
      timestamp: Date.now(),
      precise_time: now,
      key: key,
      code: e.code,
      key_code: e.keyCode,
      flight_time: Math.round(flightTime * 100) / 100,
      target: this.getElementInfo(e.target)
    });
  }

  /**
   * Scroll handlers (ENHANCED)
   */
  handleScroll(e) {
    const now = performance.now();
    const timestamp = Date.now();
    
    const scrollY = window.scrollY;
    const timeDelta = now - this.scrollState.lastTimestamp;
    const distanceDelta = Math.abs(scrollY - this.scrollState.lastY);
    const scrollSpeed = timeDelta > 0 ? distanceDelta / timeDelta : 0;
    
    this.scrollState.scrollCount++;
    
    this.pushEvent('scroll', {
      timestamp,
      precise_time: now,
      scroll_x: window.scrollX,
      scroll_y: scrollY,
      scroll_height: document.documentElement.scrollHeight,
      client_height: document.documentElement.clientHeight,
      scroll_speed: Math.round(scrollSpeed * 1000) / 1000,
      scroll_count: this.scrollState.scrollCount
    });
    
    this.scrollState.lastY = scrollY;
    this.scrollState.lastTimestamp = now;
  }

  /**
   * Wheel handler (detect smooth vs jump scrolling)
   */
  handleWheel(e) {
    this.pushEvent('wheel', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      delta_x: e.deltaX,
      delta_y: e.deltaY,
      delta_z: e.deltaZ,
      delta_mode: e.deltaMode
    });
  }

  /**
   * Paste handler (NEW - BOTS OFTEN PASTE PASSWORDS)
   */
  handlePaste(e) {
    const target = e.target;
    
    this.pushEvent('paste', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(target),
      is_password_field: target.type === 'password',
      is_honeypot: this.isHoneypot(target),
      data_types: e.clipboardData ? Array.from(e.clipboardData.types) : []
    });
    
    // Flag if pasting into password field (common bot behavior)
    if (target.type === 'password') {
      this.pushEvent('password_paste', {
        timestamp: Date.now(),
        precise_time: performance.now(),
        target: this.getElementInfo(target),
        warning: 'Password pasted instead of typed'
      });
    }
  }

  /**
   * Copy handler (NEW)
   */
  handleCopy(e) {
    this.pushEvent('copy', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(e.target)
    });
  }

  /**
   * Context menu (right-click)
   */
  handleContextMenu(e) {
    this.pushEvent('contextmenu', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      target: this.getElementInfo(e.target)
    });
  }

  /**
   * Selection start
   */
  handleSelectStart(e) {
    this.pushEvent('selectstart', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(e.target)
    });
  }

  handleBlur(e) {
    this.pushEvent('blur', {
      timestamp: Date.now(),
      precise_time: performance.now()
    });
  }

  handleFocus(e) {
    this.pushEvent('focus', {
      timestamp: Date.now(),
      precise_time: performance.now()
    });
  }

  handleInput(e) {
    const target = e.target;
    
    this.pushEvent('input', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(target),
      value_length: target.value ? target.value.length : 0,
      is_honeypot: this.isHoneypot(target)
    });
  }

  handleChange(e) {
    const target = e.target;
    
    this.pushEvent('change', {
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(target),
      is_honeypot: this.isHoneypot(target)
    });
  }

  /**
   * Get element information
   */
  getElementInfo(element) {
    if (!element) return null;
    
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: element.className ? element.className.split(' ') : [],
      name: element.name || null,
      type: element.type || null
    };
  }

  /**
   * Check if element is honeypot
   */
  isHoneypot(element) {
    if (!element) return false;
    
    if (element.classList.contains('honeypot') || 
        element.dataset.honeypot === 'true') {
      return true;
    }
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || 
        style.visibility === 'hidden' || 
        style.opacity === '0' ||
        element.offsetParent === null) {
      return true;
    }
    
    return false;
  }

  /**
   * Push event to buffer
   */
  pushEvent(eventType, data) {
    const event = {
      session_id: this.sessionId,
      event_type: eventType,
      page_url: window.location.pathname,
      time_since_load: Date.now() - this.pageLoadTime,
      ...data
    };
    
    this.eventBuffer.push(event);
    
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Send session metadata
   */
  async sendSessionMetadata() {
    const metadata = {
      session_id: this.sessionId,
      fingerprint: this.fingerprint,
      page_load_time: this.pageLoadTime,
      referrer: document.referrer,
      page_url: window.location.href
    };
    
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
    } catch (e) {
      this.log('Failed to send session metadata', e);
    }
  }

  /**
   * Flush events to server
   */
  async flush() {
    if (this.eventBuffer.length === 0) return;
    
    const payload = {
      session_id: this.sessionId,
      events: [...this.eventBuffer],
      fingerprint: this.fingerprint
    };
    
    this.eventBuffer = [];
    
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
      
      if (response.ok) {
        this.log(`Sent ${payload.events.length} events`);
      }
    } catch (e) {
      this.log('Error sending events', e);
    }
  }

  /**
   * Force send events (for testing)
   */
  forceSendEvents() {
    this.flush();
  }

  startBatchTimer() {
    setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush();
      }
    }, this.config.batchInterval);
  }

  log(...args) {
    if (this.config.debug) {
      console.log('[BehaviorTracker]', ...args);
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.BotDetectorTracker = new BehaviorTracker({ debug: true });
  });
} else {
  window.BotDetectorTracker = new BehaviorTracker({ debug: true });
}