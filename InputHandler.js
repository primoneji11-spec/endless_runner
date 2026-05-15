/* ===================================================
   InputHandler.js — Keyboard + Touch controls
   =================================================== */
class InputHandler {
    constructor() {
        this.keys = { jump: false, crouch: false };
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundKeyUp = this._onKeyUp.bind(this);
        this._boundTouchStart = this._onTouchStart.bind(this);
        this._boundTouchEnd = this._onTouchEnd.bind(this);

        window.addEventListener('keydown', this._boundKeyDown);
        window.addEventListener('keyup', this._boundKeyUp);
        window.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        window.addEventListener('touchend', this._boundTouchEnd, { passive: false });
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

    _onTouchStart(e) {
        // Only handle game-area touches
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.clientX > window.innerWidth * 0.5) {
                this.keys.jump = true;
            } else {
                this.keys.crouch = true;
            }
        }
    }

    _onTouchEnd(e) {
        this.keys.jump = false;
        this.keys.crouch = false;
        // Re-check remaining touches
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (t.clientX > window.innerWidth * 0.5) this.keys.jump = true;
            else this.keys.crouch = true;
        }
    }

    reset() {
        this.keys.jump = false;
        this.keys.crouch = false;
    }
}
