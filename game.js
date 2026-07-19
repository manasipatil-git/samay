/* ============================================================
   game.js — orchestrates scenes, state, and save/load.
   ============================================================ */

const SAVE_KEY = "samay_milk_monopoly_save_v1";

class Game {
  constructor() {
    this.state = {
      scene: "splash",
      hoursLeft: 5,
      visited: [],
      clues: [],
      connectedPairs: [],
      meetingSolved: false,
      ending: null,
      wrongGuesses: 0
    };

    this.el = {
      app: document.getElementById("app"),
      scenes: document.querySelectorAll(".scene"),
      introLine: document.getElementById("intro-line"),
      skipIntro: document.getElementById("btn-skip-intro"),
      villageMap: document.getElementById("village-map"),
      hourLanterns: document.getElementById("hour-lanterns"),
      btnNotebook: document.getElementById("btn-notebook"),
      btnInventory: document.getElementById("btn-inventory"),
      panelNotebook: document.getElementById("panel-notebook"),
      panelInventory: document.getElementById("panel-inventory"),
      notebookEntries: document.getElementById("notebook-entries"),
      inventoryItems: document.getElementById("inventory-items"),
      btnToDetective: document.getElementById("btn-to-detective"),
      board: document.getElementById("board"),
      boardDeductions: document.getElementById("board-deductions"),
      btnToMeeting: document.getElementById("btn-to-meeting"),
      meetingOptions: document.getElementById("meeting-options"),
      decisionOptions: document.getElementById("decision-options"),
      endingTitle: document.getElementById("ending-title"),
      endingBody: document.getElementById("ending-body"),
      btnRestart: document.getElementById("btn-restart")
    };

    this.dialogue = new DialogueManager(document.getElementById("dialogue-overlay"));
    this.boardNodeEls = {};
    this.selectedNode = null;

    this._bindGlobalUI();

    if (this._loadSave()) {
      this._resumeFromSave();
    } else {
      this._playSplash();
    }
  }

  /* -------------------------------------------------------
     SAVE / LOAD
  ------------------------------------------------------- */
  _save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) { /* ignore quota / privacy errors */ }
  }

  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      this.state = Object.assign(this.state, parsed);
      return true;
    } catch (e) {
      return false;
    }
  }

  _resumeFromSave() {
    this._renderVillage();
    this._renderHours();
    this._renderNotebook();
    this._renderInventory();

    if (this.state.scene === "ending" && this.state.ending) {
      this._showEnding(this.state.ending);
    } else if (this.state.scene === "decision") {
      this._goToScene("decision");
    } else if (this.state.scene === "meeting") {
      this._enterMeeting();
    } else if (this.state.scene === "detective") {
      this._enterDetective();
    } else if (this.state.scene === "archive") {
      this._enterArchive();
    } else if (this.state.scene === "splash") {
      this._playSplash();
    } else {
      this._goToScene("village");
    }
  }

  /* -------------------------------------------------------
     GLOBAL UI (panels, restart, skip)
  ------------------------------------------------------- */
  _bindGlobalUI() {
    this.el.skipIntro.addEventListener("click", () => this._endIntro());

    this.el.btnNotebook.addEventListener("click", () => this._togglePanel("notebook"));
    this.el.btnInventory.addEventListener("click", () => this._togglePanel("inventory"));
    document.querySelectorAll(".panel-close").forEach(btn => {
      btn.addEventListener("click", () => this._togglePanel(btn.dataset.close, false));
    });

    this.el.btnToDetective.addEventListener("click", () => this._enterDetective());
    this.el.btnToMeeting.addEventListener("click", () => this._enterMeeting());
    this.el.btnRestart.addEventListener("click", () => {
      const solvedEnding = this.state.ending;
      this.state = {
        scene: "archive",
        hoursLeft: 5,
        visited: [],
        clues: [],
        connectedPairs: [],
        meetingSolved: false,
        ending: solvedEnding,
        wrongGuesses: 0
      };
      this._save();
      location.reload();
    });

    this.el.decisionOptions.querySelectorAll(".decision-card").forEach(card => {
      card.addEventListener("click", () => this._chooseEnding(card.dataset.ending));
    });

    // Archive drawer & wax seal click handlers
    const drawer1 = document.getElementById("drawer-case1");
    if (drawer1) {
      drawer1.addEventListener("click", () => {
        if (!drawer1.classList.contains("is-open")) {
          drawer1.classList.add("is-open");
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("paper");
          }
        }
      });
    }

    const seal1 = document.getElementById("wax-seal-1");
    if (seal1) {
      seal1.addEventListener("click", (e) => {
        e.stopPropagation();
        if (seal1.classList.contains("is-broken")) return;
        seal1.classList.add("is-broken");
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }
        setTimeout(() => {
          this._playBriefing();
        }, 900);
      });
    }

    // Skip briefing action
    const skipBriefing = document.getElementById("btn-skip-briefing");
    if (skipBriefing) {
      skipBriefing.addEventListener("click", (e) => {
        e.stopPropagation();
        this._skipBriefing();
      });
    }
  }

  _togglePanel(name, force) {
    const panel = name === "notebook" ? this.el.panelNotebook : this.el.panelInventory;
    const shouldOpen = force !== undefined ? force : !panel.classList.contains("is-open");
    panel.classList.toggle("is-open", shouldOpen);

    // Play paper rustle sound on panel toggle
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("paper");
    }
  }

  _goToScene(name) {
    this.el.scenes.forEach(s => s.classList.remove("is-active"));
    document.getElementById(`scene-${name}`).classList.add("is-active");
    this.state.scene = name;
    this._save();
  }

  /* -------------------------------------------------------
     ACT 1 — SPLASH & BRIEFING
  ------------------------------------------------------- */
  async _playSplash() {
    this._goToScene("splash");
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.unlock();
    }
    
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    await wait(800);
    await this._typeTo("splash-title", "SAMAY", 180);
    await wait(400);
    await this._typeTo("splash-tagline", "Every moment in history hides a mystery.", 45);
    await wait(2800);
    
    // Transition to Archive
    this._enterArchive();
  }

  _enterArchive() {
    this._goToScene("archive");
    this._startArchiveAmbient();

    // Mark Case 001 as solved if ending is completed
    const drawerLabel = document.querySelector("#drawer-case1 .drawer-label");
    if (drawerLabel && this.state.ending) {
      drawerLabel.innerHTML = `✓ CASE 001<br>The Milk Monopoly (Solved)`;
      drawerLabel.style.color = "#1c4a2a";
      drawerLabel.style.borderColor = "#7fa88b";
      drawerLabel.style.background = "#f0faf2";
    }
  }

  async _playBriefing() {
    const sheet = document.getElementById("folder-unfold-sheet");
    const container = document.getElementById("briefing-content");
    if (!sheet || !container) {
      this._endIntro();
      return;
    }

    container.innerHTML = "";
    sheet.classList.add("is-unfolded");
    
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("paper");
    }

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    this._briefingActive = true;

    await wait(1200);
    if (!this._briefingActive) return;

    // Line 1: NAI Meta
    const p1 = document.createElement("p");
    p1.className = "brief-meta";
    container.appendChild(p1);
    await this._typeTo(p1, "RECOVERED FROM THE NATIONAL ARCHIVES OF INDIA", 30);
    await wait(1500);
    if (!this._briefingActive) return;

    // Line 2: Access Granted
    const p2 = document.createElement("p");
    p2.className = "brief-access";
    container.appendChild(p2);
    await this._typeTo(p2, "ACCESS GRANTED // CASE FILE 001 // THE MILK MONOPOLY // 1946", 25);
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("bell");
    }
    await wait(1500);
    if (!this._briefingActive) return;

    // Line 3: Case Title
    const p3 = document.createElement("h3");
    p3.className = "brief-title";
    container.appendChild(p3);
    await this._typeTo(p3, "THE MILK MONOPOLY", 40);
    await wait(1200);
    if (!this._briefingActive) return;

    // Line 4: Core Quote
    const p4 = document.createElement("blockquote");
    p4.className = "brief-quote";
    container.appendChild(p4);
    await this._typeTo(p4, "“Milk is plentiful. Yet every family grows poorer.”", 45);
    await wait(1800);
    if (!this._briefingActive) return;

    // Line 5: Objective Statement
    const p5 = document.createElement("p");
    p5.className = "brief-objective";
    container.appendChild(p5);
    await this._typeTo(p5, "Tomorrow the village gathers. Tonight you must discover why.", 35);
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("bell");
    }
    await wait(3500);
    if (!this._briefingActive) return;

    // Fade out fold sheet and end Act 1
    sheet.classList.remove("is-unfolded");
    await wait(850);
    this._endIntro();
  }

  _skipBriefing() {
    this._briefingActive = false;
    const sheet = document.getElementById("folder-unfold-sheet");
    if (sheet) {
      sheet.classList.remove("is-unfolded");
    }
    this._endIntro();
  }

  _typeTo(elOrId, text, speed) {
    return new Promise(resolve => {
      const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
      if (!el) { resolve(); return; }
      el.textContent = "";
      let i = 0;
      
      const typeChar = () => {
        if (!this._briefingActive && el.id !== "splash-title" && el.id !== "splash-tagline") {
          resolve();
          return;
        }
        if (i >= text.length) {
          resolve();
          return;
        }
        el.textContent += text[i];
        if (text[i] !== " " && window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("clack");
        }
        i++;
        
        // Slight pause on punctuation
        let delay = speed;
        if (text[i-1] === "." || text[i-1] === "?" || text[i-1] === "!") {
          delay += 250;
        } else if (text[i-1] === ",") {
          delay += 100;
        }
        
        this._typeTimer = setTimeout(typeChar, delay);
      };
      typeChar();
    });
  }

  _startArchiveAmbient() {
    const canvas = document.getElementById("archive-dust");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    
    const particles = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.5,
        d: Math.random() * 0.3 + 0.08,
        alpha: Math.random() * 0.4 + 0.1,
        angle: Math.random() * Math.PI * 2
      });
    }
    
    let active = true;
    const draw = () => {
      if (this.state.scene !== "archive" || !active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236, 224, 196, ${p.alpha})`;
        ctx.fill();
        
        p.y -= p.d;
        p.x += Math.sin(p.angle) * 0.15;
        p.angle += 0.01;
        
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }
      });
      requestAnimationFrame(draw);
    };
    draw();
    
    this._stopArchiveAmbient = () => {
      active = false;
      window.removeEventListener("resize", resize);
    };
  }

  _endIntro() {
    if (this._stopArchiveAmbient) {
      this._stopArchiveAmbient();
    }
    clearTimeout(this._typeTimer);
    this._renderVillage();
    this._renderHours();
    this._goToScene("village");
  }

  /* -------------------------------------------------------
     ACT 2 — VILLAGE
  ------------------------------------------------------- */
  _renderVillage() {
    this.el.villageMap.querySelectorAll(".loc-marker").forEach(n => n.remove());

    Object.values(GAME_DATA.locations).forEach(loc => {
      const btn = document.createElement("button");
      btn.className = "loc-marker";
      btn.style.left = loc.x + "%";
      btn.style.top = loc.y + "%";

      const visited = this.state.visited.includes(loc.id);
      const locked = !visited && this.state.hoursLeft <= 0;
      if (visited) btn.classList.add("is-visited");
      if (locked) btn.classList.add("is-locked");

      const tpl = document.getElementById(`loc-${loc.id}`);
      const svgWrap = document.createElement("div");
      svgWrap.className = "loc-glow";
      btn.appendChild(svgWrap);
      if (tpl) btn.appendChild(tpl.content.cloneNode(true));

      const name = document.createElement("div");
      name.className = "loc-name";
      name.textContent = loc.name;
      const sub = document.createElement("div");
      sub.className = "loc-sub";
      sub.textContent = loc.sub;
      btn.appendChild(name);
      btn.appendChild(sub);

      btn.addEventListener("click", () => this._visitLocation(loc.id));
      this.el.villageMap.appendChild(btn);
    });

    this._updateProceedButton();
  }

  _visitLocation(id) {
    if (this.state.visited.includes(id)) return;
    if (this.state.hoursLeft <= 0) return;

    const loc = GAME_DATA.locations[id];
    this.dialogue.say(loc.speaker, loc.portrait, loc.lines, () => {
      this.state.visited.push(id);
      let gotNewClue = false;
      if (loc.clue && !this.state.clues.includes(loc.clue.id)) {
        this.state.clues.push(loc.clue.id);
        gotNewClue = true;
      }
      this.state.hoursLeft = Math.max(0, this.state.hoursLeft - 1);
      this._renderVillage();
      this._renderHours();
      this._renderNotebook();
      this._renderInventory();
      this._save();

      if (gotNewClue) {
        this._triggerClueFindAlert(loc.clue);
      }
    });
  }

  _triggerClueFindAlert(clue) {
    // 1. Slide open the notebook panel
    this._togglePanel("notebook", true);
    
    // 2. Identify the new entry element and add stamp effect
    setTimeout(() => {
      const entries = this.el.notebookEntries.querySelectorAll(".notebook-entry");
      const latest = entries[entries.length - 1];
      if (latest) {
        latest.classList.add("just-discovered");
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }
        
        setTimeout(() => {
          latest.classList.remove("just-discovered");
        }, 1800);
      }
    }, 600);
    
    // 3. Auto-close notebook after 3.2 seconds
    setTimeout(() => {
      this._togglePanel("notebook", false);
    }, 3200);
  }

  _renderHours() {
    this.el.hourLanterns.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const spent = i >= this.state.hoursLeft;
      const wrap = document.createElement("div");
      wrap.className = "hour-lantern" + (spent ? " is-spent" : "");
      wrap.innerHTML = `
        <svg viewBox="0 0 20 26">
          <path d="M4 8 L10 2 L16 8 L14 22 L6 22 Z" fill="#5f3a26" stroke="#dd9349" stroke-width="1"/>
          <ellipse class="flame" cx="10" cy="13" rx="3.4" ry="5" fill="#ffd894"/>
        </svg>`;
      this.el.hourLanterns.appendChild(wrap);
    }
    this._updateProceedButton();
  }

  _updateProceedButton() {
    this.el.btnToDetective.classList.toggle("is-ready", this.state.hoursLeft <= 0);
  }

  /* -------------------------------------------------------
     NOTEBOOK / INVENTORY
  ------------------------------------------------------- */
  _renderNotebook() {
    const box = this.el.notebookEntries;
    box.innerHTML = "";
    if (this.state.clues.length === 0) {
      box.innerHTML = `<p class="notebook-empty">Nothing written yet. Go and ask someone.</p>`;
      return;
    }
    this.state.clues.forEach(clueId => {
      const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
      const entry = document.createElement("div");
      entry.className = "notebook-entry";
      entry.innerHTML = `<b>${loc.clue.name}</b>${GAME_DATA.notebook[clueId]}`;
      box.appendChild(entry);
    });
  }

  _renderInventory() {
    const box = this.el.inventoryItems;
    box.innerHTML = "";
    if (this.state.clues.length === 0) {
      box.innerHTML = `<p class="inventory-empty">Your pockets are empty.</p>`;
      return;
    }
    this.state.clues.forEach(clueId => {
      const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
      const card = document.createElement("div");
      card.className = "inventory-item";
      const tpl = document.getElementById(`item-${clueId}`);
      if (tpl) card.appendChild(tpl.content.cloneNode(true));
      const label = document.createElement("div");
      label.className = "item-name";
      label.textContent = loc.clue.name;
      card.appendChild(label);
      box.appendChild(card);
    });
  }

  /* -------------------------------------------------------
     ACT 3 — DETECTIVE BOARD
  ------------------------------------------------------- */
  _enterDetective() {
    this._goToScene("detective");
    this._buildBoard();
  }

  _buildBoard() {
    const board = this.el.board;
    board.innerHTML = "";
    this.boardNodeEls = {};
    this.selectedNode = null;

    const svgNS = "http://www.w3.org/2000/svg";
    const linesLayer = document.createElementNS(svgNS, "svg");
    linesLayer.classList.add("board-connections");
    linesLayer.setAttribute("width", "100%");
    linesLayer.setAttribute("height", "100%");
    linesLayer.setAttribute("viewBox", "0 0 100 100");
    linesLayer.setAttribute("preserveAspectRatio", "none");
    board.appendChild(linesLayer);
    this.boardLinesLayer = linesLayer;

    const available = GAME_DATA.board.nodes.filter(id => this.state.clues.includes(id));
    const positions = this._scatterPositions(available.length);

    available.forEach((clueId, idx) => {
      const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
      const node = document.createElement("div");
      node.className = "board-node";
      node.dataset.clue = clueId;
      node.dataset.tilt = String((idx % 5) + 1);
      const pos = positions[idx];
      node.style.left = pos.x + "%";
      node.style.top = pos.y + "%";

      const pin = document.createElement("div");
      pin.className = "pin";
      node.appendChild(pin);

      const tpl = document.getElementById(`item-${clueId}`);
      if (tpl) node.appendChild(tpl.content.cloneNode(true));

      const label = document.createElement("div");
      label.className = "node-label";
      label.textContent = loc.clue.name;
      node.appendChild(label);

      this._makeDraggable(node, board);
      node.addEventListener("click", (e) => {
        if (node.dataset.wasDragged === "1") { node.dataset.wasDragged = "0"; return; }
        this._selectBoardNode(clueId, node);
      });

      board.appendChild(node);
      this.boardNodeEls[clueId] = node;
    });

    this.el.boardDeductions.innerHTML = "";
    this.state.connectedPairs.forEach(pairId => this._renderDeductionCard(pairId));
    this._redrawConnections();
    this._checkFinalDeduction();
    this._updateInsightScore();
  }

  _scatterPositions(count) {
    const spots = [
      { x: 14, y: 20 }, { x: 55, y: 14 }, { x: 80, y: 40 },
      { x: 30, y: 62 }, { x: 62, y: 68 }
    ];
    return spots.slice(0, count);
  }

  _makeDraggable(node, board) {
    let startX, startY, origLeft, origTop, dragging = false;

    const onPointerDown = (e) => {
      dragging = true;
      node.classList.add("is-dragging");
      node.dataset.wasDragged = "0";
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      origLeft = parseFloat(node.style.left);
      origTop = parseFloat(node.style.top);
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("touchmove", onPointerMove, { passive: false });
      window.addEventListener("mouseup", onPointerUp);
      window.addEventListener("touchend", onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      e.preventDefault && e.preventDefault();
      const p = e.touches ? e.touches[0] : e;
      const rect = board.getBoundingClientRect();
      const dx = ((p.clientX - startX) / rect.width) * 100;
      const dy = ((p.clientY - startY) / rect.height) * 100;
      if (Math.abs(dx) + Math.abs(dy) > 1.2) node.dataset.wasDragged = "1";
      let nx = Math.min(94, Math.max(2, origLeft + dx));
      let ny = Math.min(88, Math.max(4, origTop + dy));
      node.style.left = nx + "%";
      node.style.top = ny + "%";
      this._redrawConnections();
    };

    const onPointerUp = () => {
      dragging = false;
      node.classList.remove("is-dragging");
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };

    node.addEventListener("mousedown", onPointerDown);
    node.addEventListener("touchstart", onPointerDown, { passive: true });
  }

  _selectBoardNode(clueId, node) {
    if (!this.selectedNode) {
      this.selectedNode = { clueId, node };
      node.classList.add("is-selected");
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("clack");
      }
      return;
    }
    if (this.selectedNode.clueId === clueId) {
      node.classList.remove("is-selected");
      this.selectedNode = null;
      return;
    }

    const a = this.selectedNode.clueId;
    const b = clueId;
    this.selectedNode.node.classList.remove("is-selected");
    const prevNode = this.selectedNode.node;
    this.selectedNode = null;

    const pair = GAME_DATA.board.pairs.find(p =>
      (p.a === a && p.b === b) || (p.a === b && p.b === a)
    );

    if (pair && !this.state.connectedPairs.includes(pair.id)) {
      this.state.connectedPairs.push(pair.id);
      node.classList.add("is-linked");
      prevNode.classList.add("is-linked");
      this._renderDeductionCard(pair.id);
      this._redrawConnections();
      this._checkFinalDeduction();
      this._updateInsightScore();

      // Audio & haptic board feedback
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("pluck");
      }
      if (this.el.board) {
        this.el.board.classList.add("board-shake");
        setTimeout(() => this.el.board.classList.remove("board-shake"), 450);
      }

      this._save();
    } else {
      this.state.wrongGuesses = (this.state.wrongGuesses || 0) + 1;
      this._flashWrongGuess();
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("stamp");
      }
      this._save();
    }
  }

  _updateInsightScore() {
    const scoreEl = document.getElementById("board-score");
    if (scoreEl) {
      const totalPairs = GAME_DATA.board.pairs.length;
      const foundPairs = this.state.connectedPairs.length;
      const percentage = Math.round((foundPairs / totalPairs) * 100);
      scoreEl.textContent = `Insight: ${percentage}%`;
      if (percentage === 100) {
        scoreEl.classList.add("is-complete");
      } else {
        scoreEl.classList.remove("is-complete");
      }
    }
  }

  _flashWrongGuess() {
    const hint = document.getElementById("board-hint");
    const original = hint.textContent;
    const msg = GAME_DATA.board.wrongDeductions[
      Math.floor(Math.random() * GAME_DATA.board.wrongDeductions.length)
    ];
    hint.textContent = `That connection doesn't hold. ("${msg}")`;
    hint.style.color = "#e08a6f";
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      hint.textContent = original;
      hint.style.color = "";
    }, 2600);
  }

  _renderDeductionCard(pairId) {
    const pair = GAME_DATA.board.pairs.find(p => p.id === pairId);
    if (!pair) return;
    if (this.el.boardDeductions.querySelector(`[data-pair="${pairId}"]`)) return;
    const card = document.createElement("div");
    card.className = "deduction-card";
    card.dataset.pair = pairId;
    card.textContent = pair.deduction;
    this.el.boardDeductions.appendChild(card);
  }

  _checkFinalDeduction() {
    const allPairsFound = GAME_DATA.board.pairs.every(p => this.state.connectedPairs.includes(p.id));
    if (allPairsFound && !this.el.boardDeductions.querySelector(".is-final")) {
      const card = document.createElement("div");
      card.className = "deduction-card is-final";
      card.textContent = GAME_DATA.board.finalDeduction;
      this.el.boardDeductions.appendChild(card);
    }
    this.el.btnToMeeting.disabled = !allPairsFound;
  }

  _redrawConnections() {
    const layer = this.boardLinesLayer;
    if (!layer) return;
    layer.innerHTML = "";
    const svgNS = "http://www.w3.org/2000/svg";

    this.state.connectedPairs.forEach(pairId => {
      const pair = GAME_DATA.board.pairs.find(p => p.id === pairId);
      if (!pair) return;
      const nodeA = this.boardNodeEls[pair.a];
      const nodeB = this.boardNodeEls[pair.b];
      if (!nodeA || !nodeB) return;
      const ax = parseFloat(nodeA.style.left);
      const ay = parseFloat(nodeA.style.top) + 6;
      const bx = parseFloat(nodeB.style.left);
      const by = parseFloat(nodeB.style.top) + 6;

      // slight sag so the string reads as real yarn, not a ruler line
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2 + 4.5;

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute(
        "d",
        `M ${ax} ${ay} Q ${midX} ${midY} ${bx} ${by}`
      );
      path.setAttribute("vector-effect", "non-scaling-stroke");
      layer.appendChild(path);
    });
  }

  /* -------------------------------------------------------
     ACT 4 — MEETING
  ------------------------------------------------------- */
  _enterMeeting() {
    this._goToScene("meeting");
    this.el.meetingOptions.classList.remove("is-visible");
    this.el.meetingOptions.innerHTML = "";

    this.dialogue.say(
      GAME_DATA.locations.hall.speaker,
      "elder",
      [
        "You have heard every witness.",
        "The village places its trust in your judgement.",
        "What should we do?"
      ],
      () => this._showMeetingOptions()
    );
  }

  _showMeetingOptions() {
    const box = this.el.meetingOptions;
    box.innerHTML = "";
    GAME_DATA.meeting.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "meeting-option";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => this._chooseMeetingOption(opt, btn));
      box.appendChild(btn);
    });
    box.classList.add("is-visible");
  }

  _chooseMeetingOption(opt, btnEl) {
    this.el.meetingOptions.classList.remove("is-visible");
    this.dialogue.say("Village Meeting", "elder", [opt.response], () => {
      if (opt.correct) {
        this.state.meetingSolved = true;
        this._save();
        this._goToScene("decision");
      } else {
        btnEl.disabled = true;
        this._showMeetingOptions();
      }
    });
  }

  /* -------------------------------------------------------
     ENDING
  ------------------------------------------------------- */
  _chooseEnding(id) {
    this.state.ending = id;
    this._save();
    
    // Step 1: Transition to the Closed Stamp Screen
    this._goToScene("closed");
    
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    (async () => {
      await wait(400);
      const stamp = document.getElementById("closed-stamp-text");
      if (stamp) {
        stamp.classList.add("is-stamped");
      }
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("stamp");
      }
      
      await wait(2400);
      
      // Step 2: Show the Historical Record Reveal ending screen!
      this._showEnding(id);
    })();
  }

  _showEnding(id) {
    const ending = GAME_DATA.endings[id];
    this.el.endingTitle.textContent = ending.title;
    this.el.endingBody.innerHTML = ending.body.map(p => `<p>${p}</p>`).join("");

    // Dynamically inject the historical archive dispatcher text
    const histTextEl = document.getElementById("historical-text");
    if (histTextEl) {
      if (id === "cooperative") {
        histTextEl.textContent = "In December 1946, Anand's farmers, guided by Tribhuvandas Patel and advised by Sardar Vallabhbhai Patel, went on strike against Polson's dairy monopoly. They refused to sell milk unless they could form their own cooperative. This action birthed the Kaira Cooperative (Amul) and sparked India's White Revolution, turning India into the world's largest milk producer.";
      } else if (id === "accept") {
        histTextEl.textContent = "By accepting the low rates, the village remained in poverty. In reality, it took farmers organizing a milk strike in late 1946 and establishing a cooperative to bypass the middlemen and gain economic independence.";
      } else if (id === "cooling") {
        histTextEl.textContent = "Cooling tanks reduced spoilage but did not prevent economic exploitation. In history, Anand's farmers realized that cooling was merely technical; they needed collective ownership of distribution and processing to thrive.";
      }
    }

    // Calculate Deduction Rating & Archivist Rank
    const wrong = this.state.wrongGuesses || 0;
    let accuracy = "100%";
    let rankTitle = "Master Archivist";
    
    if (wrong === 0) {
      accuracy = "100%";
      rankTitle = "Master Archivist";
    } else if (wrong <= 2) {
      accuracy = "85%";
      rankTitle = "Senior Detective";
    } else if (wrong <= 5) {
      accuracy = "60%";
      rankTitle = "Field Investigator";
    } else {
      accuracy = "35%";
      rankTitle = "Junior Clerk";
    }

    const scoreStamp = document.getElementById("ending-score");
    if (scoreStamp) {
      scoreStamp.classList.remove("is-visible");
      scoreStamp.innerHTML = `Deduction<br><b>${accuracy}</b><br>${rankTitle}`;
      
      // Delay visual stamp reveal so it punches down after the timeline animations complete
      setTimeout(() => {
        scoreStamp.classList.add("is-visible");
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }
      }, 2500);
    }

    this._goToScene("ending");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.SAMAY_GAME = new Game();
});