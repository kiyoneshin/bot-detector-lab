/**
 * Bot Detector Lab - Browser Fingerprinting Module
 * Collects device signals to identify unique visitors without cookies.
 */

class Fingerprinter {
    constructor() {
        this.data = null;
    }

    /**
     * Generate complete browser fingerprint
     */
    async generate() {
        this.data = {
            user_agent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages || [],
            platform: navigator.platform,
            hardware_concurrency: navigator.hardwareConcurrency || 0,
            device_memory: navigator.deviceMemory || 0,
            screen: {
                width: screen.width,
                height: screen.height,
                avail_width: screen.availWidth,
                avail_height: screen.availHeight,
                color_depth: screen.colorDepth,
                pixel_depth: screen.pixelDepth
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezone_offset: new Date().getTimezoneOffset(),
            canvas_hash: await this.getCanvasFingerprint(),
            webgl_vendor: this.getWebGLVendor(),
            plugins: this.getPlugins(),
            touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            cookies_enabled: navigator.cookieEnabled,
            timestamp: Date.now()
        };
        return this.data;
    }

    /**
     * Generate Canvas Fingerprint (The most unique signal)
     */
    async getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');

            // Draw text with complex styles to trigger rendering differences
            ctx.textBaseline = 'top';
            ctx.font = '14px "Arial"';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('BotDetector Lab 🤖', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Canvas Fingerprint', 4, 35);

            const dataURL = canvas.toDataURL();
            return await this.simpleHash(dataURL);
        } catch (e) {
            console.warn('Canvas fingerprint failed', e);
            return 'canvas_unavailable';
        }
    }

    /**
     * Get WebGL Vendor & Renderer (Detects GPU)
     */
    getWebGLVendor() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    return {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                    };
                }
            }
        } catch (e) {}
        return null;
    }

    /**
     * Enumerate installed plugins
     */
    getPlugins() {
        const plugins = [];
        if (navigator.plugins) {
            for (let i = 0; i < navigator.plugins.length; i++) {
                plugins.push({
                    name: navigator.plugins[i].name,
                    filename: navigator.plugins[i].filename
                });
            }
        }
        return plugins;
    }

    /**
     * Cryptographic Hash Function (SHA-256)
     */
    async simpleHash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    }
}

// Make available globally
window.Fingerprinter = Fingerprinter;