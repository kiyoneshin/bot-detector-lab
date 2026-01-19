/**
 * Bot Detector Lab - Enhanced Device Fingerprinting
 * Collects comprehensive browser & hardware signatures
 */

class DeviceFingerprinter {
  constructor() {
    this.fingerprint = null;
  }

  /**
   * Generate complete device fingerprint
   */
  async generateFingerprint() {
    const fingerprint = {
      // Basic browser info
      user_agent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages || [],
      platform: navigator.platform,
      
      // Hardware info (ENHANCED)
      hardware_concurrency: navigator.hardwareConcurrency || 0,
      device_memory: navigator.deviceMemory || 0,
      max_touch_points: navigator.maxTouchPoints || 0,
      
      // Screen info
      screen: {
        width: screen.width,
        height: screen.height,
        avail_width: screen.availWidth,
        avail_height: screen.availHeight,
        color_depth: screen.colorDepth,
        pixel_depth: screen.pixelDepth,
        pixel_ratio: window.devicePixelRatio || 1
      },
      
      // Timezone info (ENHANCED)
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      
      // Date format fingerprint (ENHANCED)
      date_format: this.getDateFormat(),
      
      // Canvas fingerprint
      canvas_hash: await this.getCanvasFingerprint(),
      
      // WebGL info
      webgl: this.getWebGLInfo(),
      
      // Audio context fingerprint (NEW)
      audio_hash: await this.getAudioFingerprint(),
      
      // Font detection (NEW)
      fonts: this.detectFonts(),
      
      // Plugin info
      plugins: this.getPlugins(),
      
      // Battery API (if available) (NEW)
      battery: await this.getBatteryInfo(),
      
      // Connection info (NEW)
      connection: this.getConnectionInfo(),
      
      // Feature detection
      features: {
        touch_support: 'ontouchstart' in window,
        cookies_enabled: navigator.cookieEnabled,
        do_not_track: navigator.doNotTrack,
        storage_available: this.checkStorage(),
        webrtc_available: this.checkWebRTC(),
        webgl_available: this.checkWebGL()
      },
      
      // Timestamp
      generated_at: Date.now()
    };
    
    this.fingerprint = fingerprint;
    return fingerprint;
  }

  /**
   * Get date format based on locale
   */
  getDateFormat() {
    try {
      const date = new Date(2025, 0, 15, 13, 30, 0);
      return {
        short: date.toLocaleDateString(),
        long: date.toLocaleString(),
        time: date.toLocaleTimeString()
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate canvas fingerprint with hash
   */
  async getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      
      // Draw complex pattern
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      
      ctx.fillStyle = '#069';
      ctx.fillText('Bot Detector Lab 🤖🔍', 2, 15);
      
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Canvas Fingerprint', 4, 35);
      
      // Add geometric shapes
      ctx.fillStyle = '#f60';
      ctx.beginPath();
      ctx.arc(50, 50, 10, 0, Math.PI * 2);
      ctx.fill();
      
      const dataURL = canvas.toDataURL();
      return await this.simpleHash(dataURL);
    } catch (e) {
      return 'canvas_unavailable';
    }
  }

  /**
   * Audio context fingerprint
   */
  async getAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return 'audio_unavailable';
      
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      
      gainNode.gain.value = 0; // Mute
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(0);
      
      const audioData = await new Promise(resolve => {
        scriptProcessor.onaudioprocess = (event) => {
          const output = event.outputBuffer.getChannelData(0);
          const sum = Array.from(output).reduce((a, b) => a + Math.abs(b), 0);
          oscillator.stop();
          context.close();
          resolve(sum.toString());
        };
      });
      
      return await this.simpleHash(audioData);
    } catch (e) {
      return 'audio_unavailable';
    }
  }

  /**
   * WebGL vendor and renderer info
   */
  getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return { available: false };
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      return {
        available: true,
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
        version: gl.getParameter(gl.VERSION),
        shading_language: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        max_texture_size: gl.getParameter(gl.MAX_TEXTURE_SIZE)
      };
    } catch (e) {
      return { available: false };
    }
  }

  /**
   * Detect installed fonts
   */
  detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
      'Trebuchet MS', 'Impact', 'Tahoma', 'Helvetica'
    ];
    
    const detectedFonts = [];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    
    // Get baseline measurements
    const baseSizes = {};
    baseFonts.forEach(baseFont => {
      ctx.font = `${testSize} ${baseFont}`;
      baseSizes[baseFont] = ctx.measureText(testString).width;
    });
    
    // Test each font
    testFonts.forEach(testFont => {
      let detected = false;
      
      baseFonts.forEach(baseFont => {
        ctx.font = `${testSize} '${testFont}', ${baseFont}`;
        const width = ctx.measureText(testString).width;
        
        if (width !== baseSizes[baseFont]) {
          detected = true;
        }
      });
      
      if (detected) {
        detectedFonts.push(testFont);
      }
    });
    
    return detectedFonts;
  }

  /**
   * Get plugin information
   */
  getPlugins() {
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push({
        name: navigator.plugins[i].name,
        filename: navigator.plugins[i].filename,
        description: navigator.plugins[i].description
      });
    }
    return plugins;
  }

  /**
   * Battery API info
   */
  async getBatteryInfo() {
    try {
      if (!navigator.getBattery) return null;
      
      const battery = await navigator.getBattery();
      return {
        charging: battery.charging,
        level: battery.level,
        charging_time: battery.chargingTime,
        discharging_time: battery.dischargingTime
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Network connection info
   */
  getConnectionInfo() {
    try {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return null;
      
      return {
        effective_type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        save_data: connection.saveData
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Check storage availability
   */
  checkStorage() {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check WebRTC availability
   */
  checkWebRTC() {
    return !!(
      window.RTCPeerConnection ||
      window.mozRTCPeerConnection ||
      window.webkitRTCPeerConnection
    );
  }

  /**
   * Check WebGL availability
   */
  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Simple SHA-256 hash
   */
  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }
}

// Export for use in other scripts
window.DeviceFingerprinter = DeviceFingerprinter;

// Also create a singleton instance
window.BotDetectorFingerprint = {
  _instance: null,
  
  async getFingerprint() {
    if (!this._instance) {
      this._instance = new DeviceFingerprinter();
    }
    return await this._instance.generateFingerprint();
  }
};