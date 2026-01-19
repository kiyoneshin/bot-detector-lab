/**
 * Bot Detector Lab - Behavioral Tracking Engine
 * Captures high-precision mouse, keyboard, and scroll events.
 */

class BehaviorTracker {
  constructor(config = {}) {
    // Configuration
    this.config = {
      batchSize: config.batchSize || 50,
      batchInterval: config.batchInterval || 2000, // 2 seconds
      endpoint: config.endpoint || '/api/collect',
      debug: config.debug || false
    };

    // State
    this.sessionId = this.generateSessionId();
    this.eventBuffer = [];
    this.sessionStartTime = performance.now();
    this.pageLoadTime = Date.now();
    this.fingerprint = null;
    this.lastMousePosition = { x: 0, y: 0, timestamp: 0 };
    this.keyboardState = {}; // Track key down times for flight time
    
    // Initialize
    this.init();
  }

  /**
   * Initialize tracking
   */
  async init() {
    // 1. Generate fingerprint using the external module
    if (window.Fingerprinter) {
        const fingerprinter = new window.Fingerprinter();
        this.fingerprint = await fingerprinter.generate();
    } else {
        console.error('Fingerprinter module not loaded!');
        this.fingerprint = { error: 'missing_dependency' };
    }
    
    // 2. Set up event listeners
    this.attachEventListeners();
    
    // 3. Set up batch flushing
    this.startBatchTimer();
    
    // 4. Send initial session metadata
    this.sendSessionMetadata();
    
    // 5. Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
    
    this.log('Tracker initialized', { sessionId: this.sessionId, fingerprint: this.fingerprint });
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Mouse movement - high frequency capture
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    
    // Mouse clicks
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: true });
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: true });
    document.addEventListener('click', this.handleClick.bind(this), { passive: true });
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this), { passive: true });
    document.addEventListener('keyup', this.handleKeyUp.bind(this), { passive: true });
    
    // Scroll events
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    
    // Focus events (tab switching detection)
    window.addEventListener('blur', this.handleBlur.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    
    // Form interactions (honeypot detection)
    document.addEventListener('input', this.handleInput.bind(this), { passive: true });
    document.addEventListener('change', this.handleChange.bind(this), { passive: true });
  }

  /**
   * Mouse move handler - captures trajectory
   */
  handleMouseMove(e) {
    const now = performance.now();
    const timestamp = Date.now();
    
    // Calculate velocity
    const timeDelta = now - this.lastMousePosition.timestamp;
    const distance = Math.sqrt(
      Math.pow(e.clientX - this.lastMousePosition.x, 2) +
      Math.pow(e.clientY - this.lastMousePosition.y, 2)
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;
    
    this.addEvent({
      event_type: 'mousemove',
      timestamp: timestamp,
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
    this.addEvent({
      event_type: 'mousedown',
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      target: this.getElementInfo(e.target)
    });
  }

  handleMouseUp(e) {
    this.addEvent({
      event_type: 'mouseup',
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      target: this.getElementInfo(e.target)
    });
  }

  handleClick(e) {
    const target = e.target;
    this.addEvent({
      event_type: 'click',
      timestamp: Date.now(),
      precise_time: performance.now(),
      x: e.clientX,
      y: e.clientY,
      target: this.getElementInfo(target),
      is_honeypot: this.isHoneypot(target)
    });
  }

  handleKeyDown(e) {
    const key = e.key;
    const now = performance.now();
    if (!this.keyboardState[key]) {
      this.keyboardState[key] = { downTime: now };
      this.addEvent({
        event_type: 'keydown',
        timestamp: Date.now(),
        precise_time: now,
        key: key,
        code: e.code,
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
    this.addEvent({
      event_type: 'keyup',
      timestamp: Date.now(),
      precise_time: now,
      key: key,
      code: e.code,
      flight_time: Math.round(flightTime * 100) / 100,
      target: this.getElementInfo(e.target)
    });
  }

  handleScroll(e) {
    this.addEvent({
      event_type: 'scroll',
      timestamp: Date.now(),
      precise_time: performance.now(),
      scroll_x: window.scrollX,
      scroll_y: window.scrollY
    });
  }

  handleBlur() {
    this.addEvent({ event_type: 'blur', timestamp: Date.now(), precise_time: performance.now() });
  }

  handleFocus() {
    this.addEvent({ event_type: 'focus', timestamp: Date.now(), precise_time: performance.now() });
  }

  handleInput(e) {
    this.addEvent({
      event_type: 'input',
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(e.target),
      is_honeypot: this.isHoneypot(e.target)
    });
  }

  handleChange(e) {
    this.addEvent({
      event_type: 'change',
      timestamp: Date.now(),
      precise_time: performance.now(),
      target: this.getElementInfo(e.target),
      is_honeypot: this.isHoneypot(e.target)
    });
  }

  getElementInfo(element) {
    if (!element) return null;
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: element.className ? (typeof element.className === 'string' ? element.className.split(' ') : []) : [],
      name: element.name || null,
      type: element.type || null
    };
  }

  isHoneypot(element) {
    if (!element) return false;
    if (element.classList.contains('honeypot') || element.dataset.honeypot === 'true') return true;
    
    // Check computed styles for hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || element.offsetParent === null) {
      return true;
    }
    return false;
  }

  addEvent(event) {
    event.session_id = this.sessionId;
    event.page_url = window.location.pathname;
    event.time_since_load = Date.now() - this.pageLoadTime;
    
    this.eventBuffer.push(event);
    
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

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
    } catch (e) {
      this.log('Error sending events', e);
    }
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
    window.behaviorTracker = new BehaviorTracker({ debug: true });
  });
} else {
  window.behaviorTracker = new BehaviorTracker({ debug: true });
}