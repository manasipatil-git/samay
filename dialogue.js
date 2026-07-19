/* ============================================================
   dialogue.js — handles the bottom dialogue panel:
   portrait swap, name plate, typewriter text, continue prompt.
   ============================================================ */

class DialogueManager {
  constructor(root) {
    this.root = root;
    this.panel = root.querySelector(".dialogue-panel");
    this.nameEl = root.querySelector(".dialogue-name");
    this.textEl = root.querySelector(".dialogue-text");
    this.portraitEl = root.querySelector(".dialogue-portrait");
    this.continueEl = root.querySelector(".dialogue-continue");

    this.queue = [];
    this.speaker = "";
    this.portraitId = "";
    this.typing = false;
    this.charIndex = 0;
    this.typeSpeedMs = 22;
    this.onFinish = null;
    this._typeTimer = null;

    this.root.addEventListener("click", () => this._advanceOrSkip());
    window.addEventListener("keydown", (e) => {
      if (!this.root.classList.contains("is-active")) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this._advanceOrSkip();
      }
    });
  }

  /**
   * Start a sequence of lines from one speaker.
   * @param {string} speaker
   * @param {string} portraitId
   * @param {string[]} lines
   * @param {function} onFinish called after the last line is dismissed
   */
  say(speaker, portraitId, lines, onFinish) {
    this.speaker = speaker;
    this.portraitId = portraitId;
    this.queue = lines.slice();
    this.onFinish = onFinish || null;

    this.root.classList.add("is-active");
    this.nameEl.textContent = speaker;
    this._setPortrait(portraitId);
    this._next();
  }

  _setPortrait(id) {
    this.portraitEl.innerHTML = "";
    const tpl = document.getElementById(`portrait-${id}`);
    if (tpl) {
      this.portraitEl.appendChild(tpl.content.cloneNode(true));
    }
    this.portraitEl.classList.remove("portrait-pop");
    void this.portraitEl.offsetWidth;
    this.portraitEl.classList.add("portrait-pop");
  }

  _next() {
    if (this.queue.length === 0) {
      this._close();
      return;
    }
    const line = this.queue.shift();
    this._type(line);
  }

  _type(line) {
    this.typing = true;
    this.charIndex = 0;
    this.textEl.textContent = "";
    this.continueEl.classList.remove("is-visible");
    clearTimeout(this._typeTimer);

    // Scan for high-tension keywords to trigger a subtle camera shake on the dialogue panel
    const hasTension = /owe|reject|sour|blame|cost|price|depend|exploit|monopoly|starv/i.test(line);
    if (hasTension && this.panel) {
      this.panel.classList.add("camera-shake");
      setTimeout(() => {
        this.panel.classList.remove("camera-shake");
      }, 450);
    }

    const typeNextChar = () => {
      if (this.charIndex >= line.length) {
        this.typing = false;
        this.continueEl.classList.add("is-visible");
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("bell"); // carriage bell ring on paragraph finish
        }
        return;
      }

      this.charIndex++;
      const currentChar = line[this.charIndex - 1];
      this.textEl.textContent = line.slice(0, this.charIndex);

      // Play dynamic keyboard clack
      if (currentChar !== " " && window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("clack");
      }

      // Natural speed variation: pause longer for punctuation marks
      let currentDelay = this.typeSpeedMs;
      if (currentChar === "." || currentChar === "?" || currentChar === "!") {
        currentDelay = 380;
      } else if (currentChar === "," || currentChar === ";" || currentChar === "-") {
        currentDelay = 160;
      }

      this._typeTimer = setTimeout(typeNextChar, currentDelay);
    };

    this._currentFull = line;
    typeNextChar();
  }

  _advanceOrSkip() {
    if (!this.root.classList.contains("is-active")) return;
    if (this.typing) {
      clearTimeout(this._typeTimer);
      this.textEl.textContent = this._currentFull;
      this.typing = false;
      this.continueEl.classList.add("is-visible");
      return;
    }
    this._next();
  }

  _close() {
    this.root.classList.remove("is-active");
    this.continueEl.classList.remove("is-visible");
    const cb = this.onFinish;
    this.onFinish = null;
    if (cb) cb();
  }
}