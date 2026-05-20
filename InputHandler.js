/* ===================================================
   InputHandler.js — Keyboard + Multi-touch + Swipe controls
   =================================================== */
class InputHandler {
    constructor() {
        this.keys = { jump: false, crouch: false };
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._boundKeyDown);
        window.addEventListener('keyup', this._boundKeyUp);

        // Bind directly to elements to avoid inaccurate clientX / screen-width checks
        const crouchEl = document.getElementById('touch-crouch');
        const jumpEl = document.getElementById('touch-jump');

        if (crouchEl && jumpEl) {
            // Crouch events
            crouchEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.crouch = true;
                crouchEl.classList.add('pressed');
                this._triggerRipple(crouchEl, e.targetTouches[0]);
            }, { passive: false });

            crouchEl.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.crouch = false;
                crouchEl.classList.remove('pressed');
            }, { passive: false });

            crouchEl.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.keys.crouch = false;
                crouchEl.classList.remove('pressed');
            }, { passive: false });

            // Jump events
            jumpEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.jump = true;
                jumpEl.classList.add('pressed');
                this._triggerRipple(jumpEl, e.targetTouches[0]);
            }, { passive: false });

            jumpEl.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.jump = false;
                jumpEl.classList.remove('pressed');
            }, { passive: false });

            jumpEl.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.keys.jump = false;
                jumpEl.classList.remove('pressed');
            }, { passive: false });
        }

        // Swipe controls (fallback for general screen areas)
        this._initSwipeControls();
    }

    _onKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            this.keys.jump = true;
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            this.keys.crouch = true;
        }
    }

    _onKeyUp(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') this.keys.jump = false;
        if (e.code === 'ArrowDown') this.keys.crouch = false;
    }

    _triggerRipple(element, touch) {
        if (!touch) return;
        const ripple = element.querySelector('.touch-ripple');
        if (!ripple) return;

        // Coordinates relative to the touched element
        const rect = element.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        ripple.classList.remove('animate');
        void ripple.offsetWidth; // Force reflow
        ripple.classList.add('animate');
    }

    _initSwipeControls() {
        this.touchStartX = 0;
        this.touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            // Avoid conflict if touching hud control buttons (e.g. Pause)
            if (e.target.closest('button') || e.target.closest('.hud-ctrl-btn')) return;
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.target.closest('button') || e.target.closest('.hud-ctrl-btn')) return;
            if (!this.touchStartX || !this.touchStartY) return;

            const touch = e.touches[0];
            const diffX = touch.clientX - this.touchStartX;
            const diffY = touch.clientY - this.touchStartY;

            // Check if vertical swipe is dominant and exceeds threshold
            if (Math.abs(diffY) > Math.abs(diffX)) {
                if (diffY < -35) { // Swipe Up -> JUMP
                    this.keys.jump = true;
                    this.touchStartX = 0;
                    this.touchStartY = 0;
                    // Auto-release
                    setTimeout(() => { this.keys.jump = false; }, 120);
                } else if (diffY > 35) { // Swipe Down -> CROUCH
                    this.keys.crouch = true;
                    this.touchStartX = 0;
                    this.touchStartY = 0;
                    // Auto-release
                    setTimeout(() => { this.keys.crouch = false; }, 250);
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.touchStartX = 0;
            this.touchStartY = 0;
        });
    }

    reset() {
        this.keys.jump = false;
        this.keys.crouch = false;
        document.querySelectorAll('.touch-area-left, .touch-area-right').forEach(el => {
            el.classList.remove('pressed');
            const ripple = el.querySelector('.touch-ripple');
            if (ripple) ripple.classList.remove('animate');
        });
    }
}
