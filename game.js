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

    if (this.state.scene === "ending") {
      this._showEnding(this.state.ending || "cooperative");
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
    if (this.el.skipIntro) this.el.skipIntro.addEventListener("click", () => this._endIntro());

    if (this.el.btnNotebook) this.el.btnNotebook.addEventListener("click", () => this._togglePanel("notebook"));
    if (this.el.btnInventory) this.el.btnInventory.addEventListener("click", () => this._togglePanel("inventory"));
    document.querySelectorAll(".panel-close").forEach(btn => {
      btn.addEventListener("click", () => this._togglePanel(btn.dataset.close, false));
    });

    if (this.el.btnToDetective) this.el.btnToDetective.addEventListener("click", () => this._enterDetective());
    if (this.el.btnToMeeting) this.el.btnToMeeting.addEventListener("click", () => this._enterMeeting());
    if (this.el.btnRestart) {
      this.el.btnRestart.addEventListener("click", () => {
        const confirmed = window.confirm("Start a new investigation? This will reset your current case progress and let you choose a different recommendation.");
        if (!confirmed) return;

        this.state = {
          scene: "archive",
          hoursLeft: 5,
          visited: [],
          clues: [],
          connectedPairs: [],
          meetingSolved: false,
          ending: null,
          wrongGuesses: 0
        };
        this._save();
        location.reload();
      });
    }

    if (this.el.decisionOptions) {
      this.el.decisionOptions.querySelectorAll(".decision-card").forEach(card => {
        card.addEventListener("click", () => this._chooseEnding(card.dataset.ending));
      });
    }

    // Initialize Inspection Modal Handlers immediately on boot
    this._setupInspectionModal();

    // Setup Dev-Only Debug Menu (Toggle via ~ or F9)
    this._setupDevDebugMenu();

    // Archive drawer & fullscreen dossier click handlers
    const cabinetEl = document.querySelector(".cabinet");
    const drawer1 = document.getElementById("drawer-case1");
    const folderBtn1 = document.getElementById("folder-btn-milk-monopoly");
    const fullscreenDossier = document.getElementById("fullscreen-dossier");
    const dossierCover = document.getElementById("dossier-cover");
    const closeDossierBtn = document.getElementById("btn-close-dossier");
    const seal1 = document.getElementById("wax-seal-1");

    if (drawer1) {
      drawer1.addEventListener("click", (e) => {
        if (e.target !== drawer1 && !drawer1.contains(e.target) && e.target.closest(".drawer-contents")) return;

        if (!drawer1.classList.contains("is-open")) {
          drawer1.classList.add("is-open");
          cabinetEl.classList.add("drawer-open-active");
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("paper");
          }
        }
      });
    }

    if (folderBtn1 && fullscreenDossier) {
      folderBtn1.addEventListener("click", (e) => {
        e.stopPropagation();
        folderBtn1.classList.add("is-retrieving");
        fullscreenDossier.classList.add("is-active");
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("paper");
        }
      });
    }

    if (closeDossierBtn && fullscreenDossier) {
      closeDossierBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fullscreenDossier.classList.remove("is-active");
        if (dossierCover) {
          dossierCover.classList.remove("is-unfolded");
        }
        if (folderBtn1) {
          folderBtn1.classList.remove("is-retrieving");
        }
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("paper");
        }
      });
    }

    if (seal1) {
      seal1.addEventListener("click", (e) => {
        e.stopPropagation();
        if (seal1.classList.contains("is-broken")) return;
        seal1.classList.add("is-broken");
        if (dossierCover) {
          dossierCover.classList.add("is-unfolded");
        }
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
    const targetEl = document.getElementById(`scene-${name}`);
    if (targetEl) {
      targetEl.classList.add("is-active");
      this.state.scene = name;
      this._save();
    } else {
      // Fallback to archive scene if saved scene name is obsolete
      const fallbackEl = document.getElementById("scene-archive") || document.getElementById("scene-splash");
      if (fallbackEl) {
        fallbackEl.classList.add("is-active");
        this.state.scene = "archive";
        this._save();
      }
    }
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

    // Locked Drawers diegetic feedback (Audit Fix #8)
    document.querySelectorAll(".drawer.locked-drawer").forEach(drawer => {
      drawer.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
        const hintEl = document.querySelector(".archive-hint");
        if (hintEl) {
          const orig = hintEl.textContent;
          hintEl.style.color = "#8b0000";
          hintEl.style.fontWeight = "bold";
          hintEl.textContent = "🔒 CASE FILE RESTRICTED — Access clearance required for Bombay Presidency Archives (1946)";
          setTimeout(() => {
            hintEl.style.color = "";
            hintEl.style.fontWeight = "";
            hintEl.textContent = orig;
          }, 3200);
        }
      };
    });
  }

  async _playBriefing() {
    const dossierCover = document.getElementById("dossier-cover");
    if (dossierCover) {
      dossierCover.classList.add("is-unfolded");
    }
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("paper");
    }
  }

  _skipBriefing() {
    this._briefingActive = false;
    const sheet = document.getElementById("fullscreen-dossier");
    if (sheet) {
      sheet.classList.remove("is-active");
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
  _isLocationUnlocked(id) {
    if (id === "home") return true;
    const visited = this.state.visited;
    if (id === "collection") {
      return visited.includes("home");
    }
    if (id === "railway" || id === "buyer") {
      return visited.includes("collection");
    }
    if (id === "hall") {
      return visited.includes("railway") && visited.includes("buyer");
    }
    return false;
  }

  _renderVillage() {
    this.el.villageMap.querySelectorAll(".loc-marker").forEach(n => n.remove());

    Object.values(GAME_DATA.locations).forEach(loc => {
      const btn = document.createElement("button");
      btn.className = "loc-marker";
      btn.style.left = loc.x + "%";
      btn.style.top = loc.y + "%";

      const visited = this.state.visited.includes(loc.id);
      const narrativeLocked = !this._isLocationUnlocked(loc.id);
      const timeLocked = !visited && this.state.hoursLeft <= 0;
      const locked = narrativeLocked || timeLocked;

      if (visited) btn.classList.add("is-visited");
      if (locked) {
        btn.classList.add("is-locked");
        btn.disabled = true;
      }

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

    if (window.SAMAY_SOUND && window.SAMAY_SOUND.playLocationAmbient) {
      window.SAMAY_SOUND.playLocationAmbient(id);
    }

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
      entry.className = "notebook-entry clickable-evidence";
      entry.style.cursor = "pointer";
      entry.innerHTML = `<b>${loc.clue.name}</b>${GAME_DATA.notebook[clueId]}<div style="font-size:0.7rem; color:#8b0000; margin-top:8px; font-weight:bold; letter-spacing:0.05em; text-transform:uppercase;">Click to inspect document</div>`;
      entry.addEventListener("click", () => this._inspectEvidence(clueId));
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
      card.className = "inventory-item clickable-evidence";
      card.style.cursor = "pointer";
      const tpl = document.getElementById(`item-${clueId}`);
      if (tpl) card.appendChild(tpl.content.cloneNode(true));
      const label = document.createElement("div");
      label.className = "item-name";
      label.textContent = loc.clue.name;
      card.appendChild(label);
      card.addEventListener("click", () => this._inspectEvidence(clueId));
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

    // Append random physical paper chits and chalk notes to chalkboard corners
    const chitsData = [
      { text: "Why 4 AM milk rejection? ❓", left: 4, top: 12, rotate: -4, class: "sticky-yellow" },
      { text: "BOMBAY MILK SCHEME // 1946 🗞️", left: 78, top: 8, rotate: 5, class: "news-scrap" },
      { text: "POLSON ➔ BOMBAY FREIGHT YARD 🚆", left: 3, top: 76, rotate: 3, class: "tape-slip" },
      { text: "દૂધ ખરીદ દર: ૪ આના / ૧૨ આના 🖈", left: 75, top: 78, rotate: -4, class: "torn-memo" }
    ];

    chitsData.forEach(c => {
      const chit = document.createElement("div");
      chit.className = `board-chit-prop ${c.class}`;
      chit.style.left = c.left + "%";
      chit.style.top = c.top + "%";
      chit.style.transform = `rotate(${c.rotate}deg)`;
      chit.textContent = c.text;
      board.appendChild(chit);
    });

    this.el.boardDeductions.innerHTML = "";
    this.state.connectedPairs.forEach(pairId => this._renderDeductionCard(pairId));
    this._redrawConnections();
    this._checkFinalDeduction();
    this._updateInsightScore();

    const autoConnectBtn = document.getElementById("btn-auto-connect");
    if (autoConnectBtn) {
      autoConnectBtn.onclick = () => {
        const uncollected = GAME_DATA.board.pairs.find(p => !this.state.connectedPairs.includes(p.id));
        if (uncollected) {
          const nodeA = this.boardNodeEls[uncollected.a];
          const nodeB = this.boardNodeEls[uncollected.b];
          if (nodeA) nodeA.classList.add("is-selected");
          if (nodeB) nodeB.classList.add("is-selected");
          setTimeout(() => {
            if (nodeA) nodeA.classList.remove("is-selected");
            if (nodeB) nodeB.classList.remove("is-selected");
          }, 2400);

          const hint = document.getElementById("board-hint");
          if (hint) {
            const locA = Object.values(GAME_DATA.locations).find(l => l.clue.id === uncollected.a);
            const locB = Object.values(GAME_DATA.locations).find(l => l.clue.id === uncollected.b);
            hint.textContent = `Detective Hint: Connect "${locA ? locA.clue.name : uncollected.a}" with "${locB ? locB.clue.name : uncollected.b}"!`;
            hint.style.color = "#ffbd59";
            hint.style.fontWeight = "bold";
          }
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("clack");
          }
        }
      };
    }
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
      this._showSentencePrompt(pair, node, prevNode);
    } else {
      this.state.wrongGuesses = (this.state.wrongGuesses || 0) + 1;
      this._flashWrongGuess();
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("stamp");
      }
      this._save();
    }
  }

  _showSentencePrompt(pair, node, prevNode) {
    const overlay = document.getElementById("deduction-prompt-overlay");
    const qEl = document.getElementById("prompt-question");
    const hintEl = document.getElementById("prompt-hint-text");
    const sentEl = document.getElementById("prompt-sentence-text");
    const optsEl = document.getElementById("prompt-options");
    if (!overlay || !qEl || !sentEl || !optsEl) return;

    qEl.textContent = `EXPLAIN CONNECTION // ${pair.a.toUpperCase()} + ${pair.b.toUpperCase()}`;
    
    // Custom Detective Field Note Hints per pair
    const fieldHints = {
      p1: "Notice how the Milk Receipt shows low payout rates to local farmers while the Price Ledger lists high wholesale prices in Bombay!",
      p2: "Compare the timestamps of 'rejected' milk at the Collection Centre with the night freight dispatches on the Railway Manifest!",
      p3: "Connect the grievances signed by villagers in the Petition with the actual financial records in the Price Ledger!"
    };

    if (hintEl) {
      hintEl.textContent = fieldHints[pair.id] || "Compare the timestamps, prices, and signatures across both evidence items.";
    }

    sentEl.textContent = `"${pair.promptTemplate || 'Choose the key deduction linking these two pieces of evidence:'}"`;

    optsEl.innerHTML = "";
    const options = pair.sentenceChoices || [
      { text: pair.deduction, correct: true },
      { text: "This connection is purely accidental.", correct: false },
      { text: "The contractor has no involvement here.", correct: false }
    ];

    options.forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "prompt-option-btn";
      btn.textContent = choice.text;
      btn.onclick = () => {
        overlay.classList.remove("is-active");
        if (choice.correct) {
          this.state.connectedPairs.push(pair.id);
          node.classList.add("is-linked");
          prevNode.classList.add("is-linked");
          this._renderDeductionCard(pair.id);
          this._redrawConnections();
          this._updateInsightScore();
          this._checkFinalDeduction();
          this._save();
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("stamp");
          }
        } else {
          this.state.wrongGuesses = (this.state.wrongGuesses || 0) + 1;
          this._flashWrongGuess();
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("stamp");
          }
          this._save();
        }
      };
      optsEl.appendChild(btn);
    });

    overlay.classList.add("is-active");
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
    if (this.el.meetingOptions) {
      this.el.meetingOptions.classList.remove("is-visible");
      this.el.meetingOptions.innerHTML = "";
    }

    const tableSurface = document.getElementById("panchayat-table-surface");
    if (tableSurface) {
      tableSurface.style.display = "flex";
    }

    // Initialize evidence folder and table cards immediately
    this._showEvidenceDock();

    // Play Motibhai Patel intro sequence via DialogueManager overlay over table
    this.dialogue.say(
      GAME_DATA.locations.hall.speaker,
      "elder",
      [
        "You have gathered your records.",
        "Place before the assembly the documents that support your findings."
      ]
    );
  }

  _showEvidenceDock() {
    const folderContainer = document.getElementById("investigator-evidence-folder");
    const folderToggleBtn = document.getElementById("folder-toggle-btn");
    const folderToggleText = document.getElementById("folder-toggle-text");
    const folderGrid = document.getElementById("evidence-folder-cards");
    const dropZone = document.getElementById("table-drop-zone");
    const countBadge = document.getElementById("folder-count-badge");
    const decisionOptions = document.getElementById("decision-options");
    const threadPath = document.getElementById("crimson-investigation-thread");

    if (!folderGrid || !dropZone) return;

    const masterCluesList = [
      { id: "receipt", tag: "MILK RECEIPT #1402", title: "Contractor Receipt", desc: "Rs 1/6/0 for 8 seers (14 sent)" },
      { id: "ledger", tag: "POLSON PRICING LEDGER", title: "Price Breakdown", desc: "Bombay 12 Annas vs Farmer 3 Annas" },
      { id: "rejectedLog", tag: "MILK RECEIVING LOG", title: "Daily Rejection Log", desc: "Quotas fill at 08:15 AM, 100% loss" },
      { id: "manifest", tag: "B.B.&C.I. FREIGHT MANIFEST", title: "Railway Dispatch", desc: "Wagons sent only 45% loaded" },
      { id: "petition", tag: "FARMER UNION PETITION", title: "Village Council Petition", desc: "Sardar Patel strike advice" }
    ];

    const availableClues = masterCluesList.filter(c => this.state.clues.length === 0 || this.state.clues.includes(c.id));
    const allClues = availableClues.length > 0 ? availableClues : masterCluesList;

    console.log("MEETING: new _showEvidenceDock()");
    console.log("MEETING: evidence folder:", folderGrid);
    console.log("MEETING: available clues:", allClues.length);

    const dynamicContent = document.getElementById("assembly-dynamic-content") || dropZone;

    folderGrid.innerHTML = "";
    dynamicContent.innerHTML = "";
    if (decisionOptions) decisionOptions.style.display = "none";
    if (threadPath) threadPath.classList.remove("is-active");

    // Dossier Folder Open / Close Toggle Interaction
    if (folderToggleBtn && folderContainer) {
      folderToggleBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = folderContainer.classList.contains("is-open");
        if (isOpen) {
          folderContainer.classList.remove("is-open");
          folderContainer.classList.add("is-closed");
          if (folderToggleText) folderToggleText.textContent = "Click to Open Folder 📂";
        } else {
          folderContainer.classList.remove("is-closed");
          folderContainer.classList.add("is-open");
          if (folderToggleText) folderToggleText.textContent = "Click to Close Dossier 📁";
        }
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
      };
    }

    let placedClues = [];
    let assemblyThreads = [];
    let isEvaluating = false;
    let hasCreatedFirstThread = false;
    let verifiedDeductionIds = new Set(); // Tracks 3 canonical deduction IDs strictly

    // EXPLICIT GAME PROGRESSION STATE FLAGS
    let caseEvidenceSolved = false;
    let caseTheoryUnlocked = false;
    let caseTheorySolved = false;
    let recommendationUnlocked = false;

    // Toast feedback for thread connection or elder advice
    const triggerLinkRecordedToast = (msg = "LINK RECORDED 🖈") => {
      const toast = document.createElement("div");
      toast.className = "link-recorded-toast font-type";
      toast.textContent = msg;
      dropZone.appendChild(toast);
      setTimeout(() => toast.remove(), 1850);
    };

    // DIEGETIC PHYSICAL ARCHIVAL PROP: THE PANCHAYAT NOTE INTERACTION
    const noteProp = document.getElementById("panchayat-note-prop");
    if (noteProp) {
      const foldedEl = noteProp.querySelector(".panchayat-note-folded");
      const unfoldedEl = noteProp.querySelector(".panchayat-note-unfolded");
      const noteTextEl = document.getElementById("panchayat-note-text");

      const updatePanchayatNoteText = () => {
        if (!noteTextEl) return;
        if (!verifiedDeductionIds.has("price_discrepancy")) {
          noteTextEl.textContent = '"Examine the Polson Price Ledger alongside the Contractor\'s Milk Receipt—the contractor claims high overheads, but the receipt proves a massive 6 Pice margin profit!"';
        } else if (!verifiedDeductionIds.has("supply_control")) {
          noteTextEl.textContent = '"Cross-reference the Daily Rejection Log with the Price Ledger—notice how full milk cans are rejected at 08:15 AM every morning to force price drops!"';
        } else if (!verifiedDeductionIds.has("transport_control")) {
          noteTextEl.textContent = '"Compare the B.B.&C.I. Freight Manifest with the Village Council Petition—wagon #428 was sent half-empty to Bombay to manufacture transport bottlenecks!"';
        } else {
          noteTextEl.textContent = '"All three evidence connections are verified! Formulate your final case theory below to unite the village assembly."';
        }
      };

      noteProp.onclick = (e) => {
        e.stopPropagation();
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");

        const isCurrentlyUnfolded = unfoldedEl.style.display !== "none";
        if (isCurrentlyUnfolded) {
          // Re-fold paper note
          unfoldedEl.style.display = "none";
          foldedEl.style.display = "flex";
        } else {
          // Unfold physical paper note & update contextual advice
          updatePanchayatNoteText();
          foldedEl.style.display = "none";
          unfoldedEl.style.display = "block";
        }
      };

      // Click outside refolds the Panchayat Note
      document.addEventListener("click", (e) => {
        if (!noteProp.contains(e.target) && unfoldedEl.style.display !== "none") {
          unfoldedEl.style.display = "none";
          foldedEl.style.display = "flex";
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        }
      });
    }

    // 1-to-1 Canonical Deductions Registry
    const CANONICAL_DEDUCTIONS = {
      "ledger_receipt": {
        isCanonical: true,
        deductionId: "price_discrepancy",
        categoryLabel: "PRICE DISCREPANCY",
        prompt: "What does connecting the Contractor's Milk Receipt with the Polson Price Ledger reveal?",
        choices: [
          { text: "Farmers received Rs 1/6/0 per seer while Polson sold for 12 Annas in Bombay.", isCorrect: true },
          { text: "Bombay milk demand was declining in 1946.", isCorrect: false },
          { text: "Farmers voluntarily accepted contractor handling levies.", isCorrect: false }
        ],
        quote: "The price ledger confirms local farmers received only 25% of retail value while contractor margins captured 75%.",
        elder: '"That proves what our local farming families were losing to contractor price margins."'
      },
      "ledger_rejectedLog": {
        isCanonical: true,
        deductionId: "supply_control",
        categoryLabel: "SUPPLY CONTROL",
        prompt: "What does connecting the Daily Rejection Log with the Price Ledger reveal?",
        choices: [
          { text: "Contractors filled pasteurizer quotas by 08:15 AM, passing 100% of spoilage losses onto farmers.", isCorrect: true },
          { text: "Farmers delayed morning milk delivery to the collection depot.", isCorrect: false },
          { text: "Milk spoilage only occurred during severe winter months.", isCorrect: false }
        ],
        quote: "Rejection logs prove arbitrary morning cutoff times forced individual farmers to bear all spoilage risks.",
        elder: '"And when milk was arbitrarily rejected at 08:15 AM, individual families had no power to challenge it."'
      },
      "manifest_petition": {
        isCanonical: true,
        deductionId: "transport_control",
        categoryLabel: "TRANSPORT CONTROL",
        prompt: "What does connecting the Freight Manifest with the Union Petition demonstrate?",
        choices: [
          { text: "Railway bottlenecks were manufactured to prevent farmers from bypassing middlemen, advising a cooperative strike.", isCorrect: true },
          { text: "B.B.&C.I. Railways had zero freight wagons available for agricultural transit.", isCorrect: false },
          { text: "Farmers petitioned to increase railway freight tariffs.", isCorrect: false }
        ],
        quote: "Freight manifest #428 proves wagon space existed, confirming monopolistic transport control.",
        elder: '"Now you have shown the assembly why we must bypass the contractor and form our own cooperative under Sardar Patel\'s guidance!"'
      }
    };

    // Historical Deduction Interpretations Map per evidence pair
    const getDeductionData = (fromId, toId) => {
      const pairKey = [fromId, toId].sort().join("_");
      if (CANONICAL_DEDUCTIONS[pairKey]) {
        return CANONICAL_DEDUCTIONS[pairKey];
      }

      // Non-canonical pair fallback: UNCONFIRMED HYPOTHESIS ONLY (ALL CHOICES ARE INCORRECT)
      const nameA = masterCluesList.find(c => c.id === fromId)?.title || fromId;
      const nameB = masterCluesList.find(c => c.id === toId)?.title || toId;
      return {
        isCanonical: false,
        prompt: `Do the records in ${nameA} and ${nameB} corroborate a direct finding?`,
        choices: [
          { text: "Examine the figures further to check for direct historical corroboration.", isCorrect: false },
          { text: "These two records relate to separate administrative operational domains.", isCorrect: false }
        ],
        quote: "No direct archival corroboration established for this pair.",
        elder: '"Keep examining the records—not every document pair directly proves a systemic bottleneck."'
      };
    };

    // Helper: Calculate point along quadratic Bezier curve M(x1,y1) Q(cx,cy) (x2,y2) at parameter t
    const getQuadraticBezierPoint = (x1, y1, cx, cy, x2, y2, t) => {
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * t * cx + t * t * x2;
      const by = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * t * cy + t * t * y2;
      return { x: bx, y: by };
    };

    // Redraw all player-created evidence threads and deduction slips (IDEMPOTENT RENDERER)
    const redrawAssemblyThreads = () => {
      const threadSvgCanvas = document.getElementById("assembly-thread-canvas");
      if (!threadSvgCanvas) return;

      const tableSurfaceBox = document.getElementById("panchayat-table-surface") || dropZone;
      const surfaceRect = tableSurfaceBox.getBoundingClientRect();

      // Case Solved Celebration Toggle
      if (verifiedDeductionIds.size >= 3) {
        dropZone.classList.add("case-solved");
      } else {
        dropZone.classList.remove("case-solved");
      }

      // Remove orphaned annotation tags/slips for deleted threads
      const currentThreadIds = new Set(assemblyThreads.map(tr => tr.threadId || `thread_${[tr.fromId, tr.toId].sort().join('_')}`));
      dropZone.querySelectorAll(".assembly-deduction-slip, .assembly-thread-tag, .assembly-verified-tag").forEach(el => {
        if (!currentThreadIds.has(el.dataset.threadId)) {
          el.remove();
        }
      });

      // Clear existing SVG paths
      threadSvgCanvas.innerHTML = "";

      // Intelligent Bezier Tag Staggering (Collision avoidance)
      const placedTagCoords = [];
      const tCandidates = [0.5, 0.35, 0.65, 0.25, 0.75];

      assemblyThreads.forEach(t => {
        t.threadId = t.threadId || `thread_${[t.fromId, t.toId].sort().join('_')}`;

        const cardA = dropZone.querySelector(`.placed-on-table[data-id="${t.fromId}"]`);
        const cardB = dropZone.querySelector(`.placed-on-table[data-id="${t.toId}"]`);
        if (!cardA || !cardB) return;

        const anchorA = cardA.querySelector(".doc-thread-anchor") || cardA;
        const anchorB = cardB.querySelector(".doc-thread-anchor") || cardB;

        const rectA = anchorA.getBoundingClientRect();
        const rectB = anchorB.getBoundingClientRect();

        const x1 = (rectA.left + rectA.width / 2) - surfaceRect.left;
        const y1 = (rectA.top + rectA.height / 2) - surfaceRect.top;
        const x2 = (rectB.left + rectB.width / 2) - surfaceRect.left;
        const y2 = (rectB.top + rectB.height / 2) - surfaceRect.top;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const sag = Math.min(45, Math.max(15, dist * 0.15));

        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 + sag;

        // Choose t parameter along Bezier curve to stagger tags
        let chosenT = 0.5;
        for (const candidateT of tCandidates) {
          const pt = getQuadraticBezierPoint(x1, y1, cx, cy, x2, y2, candidateT);
          const hasCollision = placedTagCoords.some(coord => Math.hypot(coord.x - pt.x, coord.y - pt.y) < 55);
          if (!hasCollision) {
            chosenT = candidateT;
            break;
          }
        }

        const tagPt = getQuadraticBezierPoint(x1, y1, cx, cy, x2, y2, chosenT);
        placedTagCoords.push(tagPt);

        const midX = tagPt.x;
        const midY = tagPt.y;

        // Render SVG Path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const pathClass = t.verified 
          ? "assembly-crimson-thread is-verified" 
          : (t.attempted ? "assembly-crimson-thread is-unresolved" : "assembly-crimson-thread is-under-investigation");

        path.setAttribute("class", pathClass);
        path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);

        const removeThreadHandler = (e) => {
          if (caseEvidenceSolved) return; // Locked once evidence phase is solved
          e.preventDefault();
          e.stopPropagation();
          assemblyThreads = assemblyThreads.filter(tr => tr !== t);
          verifiedDeductionIds.clear();
          assemblyThreads.forEach(tr => {
            if (tr.verified && tr.deductionId) {
              verifiedDeductionIds.add(tr.deductionId);
            }
          });
          const uniqueVerifiedCount = verifiedDeductionIds.size;
          const hudCount = document.getElementById("hud-verified-count");
          if (hudCount) hudCount.textContent = `${uniqueVerifiedCount} / 3 Connections Verified`;
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("clack");
          redrawAssemblyThreads();
        };

        path.onclick = (e) => {
          e.stopPropagation();
          if (caseEvidenceSolved) return;
          const wasActive = t.isActive;
          assemblyThreads.forEach(tr => tr.isActive = false);
          t.isActive = !wasActive;
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
          redrawAssemblyThreads();
        };

        path.ondblclick = removeThreadHandler;
        path.oncontextmenu = removeThreadHandler;

        threadSvgCanvas.appendChild(path);

        const deductionData = getDeductionData(t.fromId, t.toId);

        // Render ONE ACTIVE INTERACTIVE HYPOTHESIS NOTE if t.isActive === true && !caseEvidenceSolved
        if (t.isActive && !t.verified && !caseEvidenceSolved) {
          // Remove any existing midpoint tag for this active thread
          const oldTag = dropZone.querySelector(`.assembly-thread-tag[data-thread-id="${t.threadId}"]`);
          if (oldTag) oldTag.remove();

          let slip = dropZone.querySelector(`.assembly-deduction-slip[data-thread-id="${t.threadId}"]`);
          const isNewSlip = !slip;

          if (isNewSlip) {
            slip = document.createElement("div");
            slip.dataset.threadId = t.threadId;

            // Physical Free Dragging Handler for Active Slip
            let isSlipDragging = false;
            let startX = 0;
            let startY = 0;
            let initialL = 0;
            let initialT = 0;

            slip.onpointerdown = (e) => {
              if (e.target.closest(".slip-choice-strip")) return;
              e.stopPropagation();
              isSlipDragging = true;
              startX = e.clientX;
              startY = e.clientY;
              initialL = slip.offsetLeft;
              initialT = slip.offsetTop;
              slip.classList.add("is-physically-lifted");
              try { slip.setPointerCapture(e.pointerId); } catch (_) {}
            };

            slip.onpointermove = (e) => {
              if (!isSlipDragging) return;
              const dx = e.clientX - startX;
              const dy = e.clientY - startY;

              let newL = initialL + dx;
              let newT = initialT + dy;

              const maxL = (dropZone.clientWidth || 900) - slip.offsetWidth;
              const maxT = (dropZone.clientHeight || 340) - slip.offsetHeight;

              newL = Math.max(5, Math.min(newL, maxL));
              newT = Math.max(5, Math.min(newT, maxT));

              slip.style.left = `${newL}px`;
              slip.style.top = `${newT}px`;

              t.customLeft = newL;
              t.customTop = newT;
            };

            const handleSlipDragEnd = (e) => {
              if (!isSlipDragging) return;
              isSlipDragging = false;
              slip.classList.remove("is-physically-lifted");
              try { slip.releasePointerCapture(e.pointerId); } catch (_) {}
              if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
            };

            slip.onpointerup = handleSlipDragEnd;
            slip.onpointercancel = handleSlipDragEnd;
          }

          const dropH = dropZone.clientHeight || 340;
          const estimatedSlipWidth = 220;
          const estimatedSlipHeight = 150;

          const cardBoxes = Array.from(dropZone.querySelectorAll(".placed-on-table")).map(el => ({
            left: el.offsetLeft - 8,
            right: el.offsetLeft + el.offsetWidth + 8,
            top: el.offsetTop - 8,
            bottom: el.offsetTop + el.offsetHeight + 8
          }));

          const baseL = midX - 110;
          const baseT = midY > (dropH * 0.5) ? (midY - estimatedSlipHeight - 15) : (midY + 25);

          const offsets = [
            { dx: 0, dy: 0 },
            { dx: 0, dy: (midY > dropH * 0.5 ? 180 : -180) },
            { dx: 150, dy: 0 },
            { dx: -150, dy: 0 }
          ];

          let chosenL = baseL;
          let chosenT = baseT;

          for (const off of offsets) {
            const testL = baseL + off.dx;
            const testT = baseT + off.dy;
            const testR = testL + estimatedSlipWidth;
            const testB = testT + estimatedSlipHeight;

            const hasCollision = cardBoxes.some(box => 
              !(testR < box.left || testL > box.right || testB < box.top || testT > box.bottom)
            );

            if (!hasCollision) {
              chosenL = testL;
              chosenT = testT;
              break;
            }
          }

          if (t.customLeft !== undefined && t.customTop !== undefined) {
            chosenL = t.customLeft;
            chosenT = t.customTop;
          }

          slip.style.left = `${chosenL}px`;
          slip.style.top = `${chosenT}px`;

          const targetClass = "assembly-deduction-slip font-type";
          if (slip.className !== targetClass || !slip.querySelector(".slip-choices-box")) {
            slip.className = targetClass;
            slip.innerHTML = `
              <div class="slip-header-strip font-type">
                <span class="slip-pin-head font-type">📌</span>
                <span class="slip-title font-type">HYPOTHESIS</span>
              </div>
              <div class="slip-prompt-question font-type">${deductionData.prompt}</div>
              <div class="slip-choices-box"></div>
            `;

            const choicesBox = slip.querySelector(".slip-choices-box");

            deductionData.choices.forEach(choice => {
              const strip = document.createElement("div");
              strip.className = "slip-choice-strip font-type";
              strip.textContent = `"${choice.text}"`;

              strip.onclick = (e) => {
                e.stopPropagation();
                t.isActive = false;
                t.attempted = true;
                if (deductionData.isCanonical && choice.isCorrect) {
                  t.verified = true;
                  t.deductionId = deductionData.deductionId;
                  t.verifiedQuote = deductionData.quote;
                  verifiedDeductionIds.add(deductionData.deductionId);

                  if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("pluck");

                  const uniqueVerifiedCount = verifiedDeductionIds.size;
                  const hudCount = document.getElementById("hud-verified-count");
                  if (hudCount) hudCount.textContent = `${uniqueVerifiedCount} / 3 Connections Verified`;

                  const elderFeedbackText = document.getElementById("elder-feedback-text");
                  if (elderFeedbackText) {
                    if (uniqueVerifiedCount === 1) elderFeedbackText.textContent = '"That proves what our local farming families were losing to contractor price margins."';
                    else if (uniqueVerifiedCount === 2) elderFeedbackText.textContent = '"And when milk was arbitrarily rejected at 08:15 AM, individual families had no power to challenge it."';
                    else elderFeedbackText.textContent = deductionData.elder;
                  }

                  // STATE TRANSITION: WHEN 3RD CANONICAL DEDUCTION IS VERIFIED
                  if (verifiedDeductionIds.size >= 3 && !caseEvidenceSolved) {
                    caseEvidenceSolved = true;

                    // 1. Clean up active/unconfirmed slips
                    dropZone.querySelectorAll(".assembly-deduction-slip").forEach(el => el.remove());

                    // 2. Hide any unverified/inactive thread tags
                    assemblyThreads.forEach(tr => {
                      if (!tr.verified) {
                        tr.isActive = false;
                      }
                    });

                    // 3. Update HUD text
                    if (hudCount) hudCount.textContent = "3 / 3 CONNECTIONS VERIFIED";

                    // 4. Update Motibhai Elder line
                    if (elderFeedbackText) {
                      elderFeedbackText.textContent = '"Now you have shown the assembly why we must bypass the contractor and form our own cooperative under Sardar Patel\'s guidance!"';
                    }

                    // 5. Unlock and reveal Case Theory Note
                    unlockCaseTheory();
                  }
                } else {
                  if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
                }
                redrawAssemblyThreads();
              };

              choicesBox.appendChild(strip);
            });
          }

          if (isNewSlip) dropZone.appendChild(slip);

        } else {
          // Remove active slip if present for inactive thread
          const activeSlip = dropZone.querySelector(`.assembly-deduction-slip[data-thread-id="${t.threadId}"]`);
          if (activeSlip) activeSlip.remove();

          // Render Midpoint Pinned State Tag (.assembly-thread-tag) for all threads
          let tag = dropZone.querySelector(`.assembly-thread-tag[data-thread-id="${t.threadId}"]`);
          const isNewTag = !tag;

          if (isNewTag) {
            tag = document.createElement("div");
            tag.dataset.threadId = t.threadId;

            tag.onclick = (e) => {
              e.stopPropagation();
              if (caseEvidenceSolved) return;
              const wasActive = t.isActive;
              assemblyThreads.forEach(tr => tr.isActive = false);
              t.isActive = !wasActive;
              if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
              redrawAssemblyThreads();
            };

            tag.ondblclick = removeThreadHandler;
            tag.oncontextmenu = removeThreadHandler;
          }

          tag.style.left = `${midX}px`;
          tag.style.top = `${midY}px`;

          let tagStateClass = "assembly-thread-tag is-under-investigation font-type";
          let tagText = "✦ UNDER INVESTIGATION";

          if (t.verified) {
            tagStateClass = "assembly-thread-tag is-verified font-type";
            tagText = `✓ VERIFIED // ${deductionData.categoryLabel || 'RECORD CROSS-CHECKED'}`;
          } else if (t.attempted) {
            tagStateClass = "assembly-thread-tag is-unresolved font-type";
            tagText = "✦ UNRESOLVED";
          }

          if (tag.className !== tagStateClass) {
            tag.className = tagStateClass;
            tag.innerHTML = `
              <span class="tag-pin font-type">📌</span>
              <span class="tag-label font-type">${tagText}</span>
            `;
          }

          if (isNewTag) dropZone.appendChild(tag);
        }
      });
    };

    // Case Reconstruction HUD click handler (allows inspecting Case Theory anytime)
    const hudBox = document.getElementById("case-reconstruction-hud");
    if (hudBox) {
      hudBox.style.cursor = "pointer";
      hudBox.onclick = (e) => {
        e.stopPropagation();
        unlockCaseTheory();
      };
    }

    // PHASE 2 & 3: UNLOCK & DISPLAY CASE THEORY NOTE (#investigator-case-theory-note)
    const unlockCaseTheory = () => {
      const theoryNote = document.getElementById("investigator-case-theory-note");
      if (!theoryNote) {
        console.error("SAMAY CRITICAL ERROR: Case Theory Note missing from DOM.");
        return;
      }

      if (caseTheoryUnlocked) return;
      caseTheoryUnlocked = true;

      // Reveal Case Theory Note in physical center negative space on table surface
      theoryNote.style.display = "block";
      theoryNote.style.position = "absolute";
      theoryNote.style.left = "50%";
      theoryNote.style.top = "45%";
      theoryNote.style.transform = "translate(-50%, -50%) rotate(-1deg)";
      theoryNote.style.zIndex = "150";

      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");

      const buttons = theoryNote.querySelectorAll(".theory-choice-btn");
      const feedback = document.getElementById("theory-feedback");

      buttons.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const isCorrect = btn.dataset.correct === "true";
          if (isCorrect) {
            if (caseTheorySolved) return;
            caseTheorySolved = true;

            if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
            if (feedback) {
              feedback.style.color = "#2e7d32";
              feedback.textContent = "✔ FINDING SUPPORTED 🖈 — Case theory confirmed by historical records.";
            }

            const elderFeedbackText = document.getElementById("elder-feedback-text");
            if (elderFeedbackText) {
              elderFeedbackText.textContent = '"Then you understand what the records were telling us. The farmers could not bargain with the system individually."';
            }

            // PHASE 3 -> PHASE 4: ARCHIVAL VERIFICATION & RECOMMENDATION CARDS
            setTimeout(() => {
              const banner = document.getElementById("archival-verification-banner");
              if (banner) {
                banner.style.display = "block";
                banner.style.zIndex = "160";
              }

              setTimeout(() => {
                if (decisionOptions && !recommendationUnlocked) {
                  recommendationUnlocked = true;
                  decisionOptions.style.display = "flex";
                  decisionOptions.style.animation = "introFade 1.2s ease forwards";
                  decisionOptions.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 1200);
            }, 1000);

          } else {
            if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("clack");
            if (feedback) {
              feedback.style.color = "#8b0000";
              feedback.textContent = "The evidence does not support this conclusion — examine the records again.";
            }
          }
        };
      });
    };

    // Render clues into folder
    const renderFolder = () => {
      folderGrid.innerHTML = "";
      const remainingClues = allClues.filter(c => !placedClues.some(p => p.id === c.id));
      console.log(`📂 renderFolder called. Rendering ${remainingClues.length} cards into #evidence-folder-cards.`);
      if (countBadge) {
        const unplacedCount = remainingClues.length;
        const placedCount = placedClues.length;
        if (placedCount === 0) {
          countBadge.textContent = "5 RECORDS AVAILABLE IN DOSSIER";
        } else if (unplacedCount === 0) {
          countBadge.textContent = "ALL 5 RECORDS PLACED ON TABLE";
        } else {
          countBadge.textContent = `${unplacedCount} IN DOSSIER (${placedCount} ON TABLE)`;
        }
      }

      remainingClues.forEach(c => {
        const card = document.createElement("div");
        card.className = `evidence-card-drag doc-style-${c.id} font-type`;
        card.draggable = true;
        card.dataset.id = c.id;
        card.innerHTML = `
          <span class="card-drag-tag font-type">${c.tag}</span>
          <h4 class="card-drag-title font-type">${c.title}</h4>
          <p class="card-drag-snippet font-type">${c.desc}</p>
          <span class="card-drag-action font-type">Drag or Click to Place 🖈</span>
        `;

        card.ondragstart = (e) => {
          e.dataTransfer.setData("text/plain", c.id);
        };

        card.onclick = () => {
          placeClueOnTable(c.id);
        };

        folderGrid.appendChild(card);
      });
    };

    const elderSpeechMap = {
      receipt: '"This receipt proves the contractor charges 6 Pice levy per seer, taking massive profits while farmers struggle."',
      ledger: '"The price ledger confirms Polson sells for 12 Annas in Bombay while paying our local farmers only 3 Annas!"',
      rejectedLog: '"This log shows full milk cans rejected at 08:15 AM every morning once contractor quotas are filled."',
      manifest: '"Look at the freight manifest—wagon #428 is sent to Bombay half-empty! Transport bottlenecks are manufactured!"',
      petition: '"The petition shows every farmer family in Kaira is ready to unite under Sardar Patel\'s strike advice."'
    };

    // Place clue onto table (Allow placing all available 5 evidence items)
    const placeClueOnTable = (clueId) => {
      if (placedClues.length >= allClues.length) return;
      const clue = allClues.find(c => c.id === clueId);
      if (!clue) return;

      placedClues.push(clue);
      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");

      // Update Motibhai Patel Live Subtitle Bar
      const elderFeedbackText = document.getElementById("elder-feedback-text");
      if (elderFeedbackText && elderSpeechMap[clue.id]) {
        elderFeedbackText.textContent = elderSpeechMap[clue.id];
      }

      renderTable();
      renderFolder();
    };

    // Render items placed on table
    const renderTable = () => {
      // Clear previous placed cards
      dropZone.querySelectorAll(".evidence-card-drag.placed-on-table").forEach(el => el.remove());

      const tilts = [-2.5, 1.8, -1.2, 3.2, -2.0];
      const posXList = [185, 355, 525, 695, 865];
      const posYList = [12, 45, 15, 50, 20];

      placedClues.forEach((c, idx) => {
        // Initialize default organic coordinates on table if not set
        if (c.posX === undefined) {
          c.posX = Math.round(posXList[idx % posXList.length]);
          c.posY = Math.round(posYList[idx % posYList.length]);
          c.rot = tilts[idx % tilts.length];
          c.zIndex = 20 + idx;
        }

        const card = document.createElement("div");
        card.className = `evidence-card-drag doc-style-${c.id} placed-on-table font-type`;
        card.style.position = "absolute";
        card.style.left = `${c.posX}px`;
        card.style.top = `${c.posY}px`;
        card.style.transform = `rotate(${c.rot}deg)`;
        card.style.zIndex = c.zIndex;
        card.dataset.id = c.id;

        card.innerHTML = `
          <span class="doc-pin font-type">📌</span>
          <span class="doc-thread-anchor font-type" title="Drag string to another evidence card to cross-reference">
            <div class="anchor-pin-visual"><div class="anchor-pin-head"></div></div>
          </span>
          <span class="card-drag-tag font-type">${c.tag}</span>
          <h4 class="card-drag-title font-type">${c.title}</h4>
          <p class="card-drag-snippet font-type">${c.desc}</p>
          <span class="card-drag-action font-type">Click to Inspect 🔍</span>
        `;

        // Interactive Red-Thread String Dragging Handler from Document Anchor
        const anchorEl = card.querySelector(".doc-thread-anchor");
        anchorEl.onpointerdown = (ev) => {
          ev.stopPropagation();
          try { anchorEl.setPointerCapture(ev.pointerId); } catch (_) {}

          let isDrawingThread = true;
          const tableSurfaceBox = document.getElementById("panchayat-table-surface") || dropZone;
          const surfaceRect = tableSurfaceBox.getBoundingClientRect();
          const anchorRect = anchorEl.getBoundingClientRect();

          const startX = (anchorRect.left + anchorRect.width / 2) - surfaceRect.left;
          const startY = (anchorRect.top + anchorRect.height / 2) - surfaceRect.top;

          let activeTempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          activeTempPath.setAttribute("class", "assembly-crimson-thread is-drawing");
          document.getElementById("assembly-thread-canvas").appendChild(activeTempPath);

          anchorEl.onpointermove = (moveEv) => {
            if (!isDrawingThread) return;
            const curX = moveEv.clientX - surfaceRect.left;
            const curY = moveEv.clientY - surfaceRect.top;
            const dist = Math.hypot(curX - startX, curY - startY);
            const sag = Math.min(30, Math.max(10, dist * 0.12));
            const midX = (startX + curX) / 2;
            const midY = (startY + curY) / 2 + sag;
            activeTempPath.setAttribute("d", `M ${startX} ${startY} Q ${midX} ${midY} ${curX} ${curY}`);

            // Bounding Box Hit Testing for Target Card Highlight
            const clientX = moveEv.clientX;
            const clientY = moveEv.clientY;
            dropZone.querySelectorAll(".placed-on-table").forEach(cardEl => {
              if (cardEl.dataset.id === c.id) return;
              const rect = cardEl.getBoundingClientRect();
              const isInside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
              if (isInside) {
                cardEl.classList.add("is-connection-target");
              } else {
                cardEl.classList.remove("is-connection-target");
              }
            });
          };

          const handleThreadEnd = (ev) => {
            if (!isDrawingThread) return;
            isDrawingThread = false;
            try { anchorEl.releasePointerCapture(ev.pointerId); } catch (_) {}
            if (activeTempPath) { activeTempPath.remove(); activeTempPath = null; }
            anchorEl.onpointermove = null;
            anchorEl.onpointerup = null;
            anchorEl.onpointercancel = null;

            // Clear target highlights
            dropZone.querySelectorAll(".placed-on-table.is-connection-target").forEach(el => el.classList.remove("is-connection-target"));

            // Explicit Bounding Box Hit Testing
            const clientX = ev.clientX;
            const clientY = ev.clientY;
            let targetCard = null;

            dropZone.querySelectorAll(".placed-on-table").forEach(cardEl => {
              if (cardEl.dataset.id === c.id) return;
              const rect = cardEl.getBoundingClientRect();
              if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                targetCard = cardEl;
              }
            });

            if (targetCard) {
              const targetId = targetCard.dataset.id;
              const exists = assemblyThreads.some(t => 
                (t.fromId === c.id && t.toId === targetId) || (t.fromId === targetId && t.toId === c.id)
              );
              if (!exists) {
                assemblyThreads.forEach(tr => tr.isActive = false);
                assemblyThreads.push({ fromId: c.id, toId: targetId, isActive: false });
                
                // Hide tutorial card after first connection
                const tutCard = document.getElementById("connection-tutorial-card");
                if (tutCard) tutCard.style.display = "none";

                triggerLinkRecordedToast();
                if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("pluck");
                redrawAssemblyThreads();
              } else {
                if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("clack");
              }
            } else {
              if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("clack");
            }
          };

          anchorEl.onpointerup = handleThreadEnd;
          anchorEl.onpointercancel = handleThreadEnd;
        };

        card.appendChild(anchorEl);

        // Physical Free Dragging Handler
        let isPointerDown = false;
        let hasMoved = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        card.onpointerdown = (e) => {
          isPointerDown = true;
          hasMoved = false;
          startX = e.clientX;
          startY = e.clientY;
          initialLeft = card.offsetLeft;
          initialTop = card.offsetTop;

          try { card.setPointerCapture(e.pointerId); } catch (_) {}

          // Bring card to top layer
          const maxZ = Math.max(20, ...placedClues.map(p => p.zIndex || 20));
          c.zIndex = maxZ + 1;
          card.style.zIndex = c.zIndex;
        };

        card.onpointermove = (e) => {
          if (!isPointerDown) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          if (Math.hypot(dx, dy) > 4) {
            if (!hasMoved) {
              hasMoved = true;
              card.classList.add("is-physically-lifted");
            }

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // Clamp bounds within dropZone boundary
            const maxLeft = dropZone.clientWidth - card.offsetWidth;
            const maxTop = dropZone.clientHeight - card.offsetHeight;
            newLeft = Math.max(-10, Math.min(newLeft, maxLeft + 10));
            newTop = Math.max(-5, Math.min(newTop, maxTop + 5));

            card.style.left = `${newLeft}px`;
            card.style.top = `${newTop}px`;

            c.posX = newLeft;
            c.posY = newTop;

            // Update thread endpoint positions live as document moves
            redrawAssemblyThreads();
          }
        };

    // 1946 Historical Archival Reverse-Side Data Map
    const documentBackData = {
      receipt: {
        backTitle: "Anand Collection Depot Levy Register 1946",
        backBody: "Official Archival Record #1402: Issued by contractor agent in Anand. Local farmers were paid Rs 1/6/0 per 8 seers of raw milk. However, contractors deducted a mandatory 6 Pice handling & transport levy per seer before payout.",
        marginalia: "✏️ Marginalia Note: 'Handling levies are pocketed directly by contractors without receipt stub returns.'"
      },
      ledger: {
        backTitle: "Bombay Municipal Milk Scheme Audit 1946",
        backBody: "Financial Audit Report 1946: Polson Dairy purchased raw Anand village milk at 3 Annas per seer and retailed pasteurized milk in Bombay at 12 Annas per seer, capturing a 75% gross profit margin.",
        marginalia: "✏️ Marginalia Note: 'Proves contractor monopoly pricing margin of 4x village buy-rate.'"
      },
      rejectedLog: {
        backTitle: "Anand Pasteurizer Daily Cutoff Logbook",
        backBody: "Depot Logbook 1946: Contractor pasteurizing plants filled daily Bombay supply quotas by 08:15 AM each morning. All farmer milk brought to collection centers after 08:15 AM was summarily logged as 'soured' with 100% loss borne by local farmers.",
        marginalia: "✏️ Marginalia Note: 'Arbitrary morning cutoff forced small producers to absorb all spoilage risk.'"
      },
      manifest: {
        backTitle: "B.B.&C.I. Railway Station Wagon Dispatch",
        backBody: "Railway Freight Record #428: Inspected at Anand Junction Station. Insulated milk wagons bound for Bombay Central were intentionally dispatched at only 45% container capacity.",
        marginalia: "✏️ Marginalia Note: 'Wagon dispatches dispatched half-full prove transport bottlenecks were manufactured to lock prices.'"
      },
      petition: {
        backTitle: "Kaira District Cooperative Union Minutes 1946",
        backBody: "Village Assembly Minutes 1946: Signed by over 2,000 dairy farming families of Kaira District following Sardar Vallabhbhai Patel's counsel to demand direct marketing rights or launch a total milk strike.",
        marginalia: "✏️ Marginalia Note: 'Unanimous resolution to bypass contractors and form an independent cooperative union.'"
      }
    };

    // Open Physical Lamp Document Inspection Overlay
    const openDocumentInspectionModal = (c) => {
      const modal = document.getElementById("document-inspection-modal");
      const card3d = document.getElementById("inspection-card-3d");
      if (!modal || !card3d) return;

      const backData = documentBackData[c.id] || {
        backTitle: `${c.title} — Archival Notes`,
        backBody: `Historical Record ${c.tag}: Contains verified archival documentation regarding the 1946 Kaira Milk Union movement.`,
        marginalia: "✏️ Marginalia Note: 'Verified archival evidence record.'"
      };

      const tagEl = document.getElementById("inspect-tag");
      const titleEl = document.getElementById("inspect-title");
      const bodyEl = document.getElementById("inspect-body");
      const margEl = document.getElementById("inspect-marginalia");

      if (tagEl) tagEl.textContent = c.tag;
      if (titleEl) titleEl.textContent = c.title;
      if (bodyEl) bodyEl.textContent = c.desc;
      if (margEl) margEl.textContent = `✏️ Marginalia Note: ${c.title} verified against village records.`;

      const backTitleEl = document.getElementById("inspect-back-title");
      const backBodyEl = document.getElementById("inspect-back-body");
      const backMargEl = document.getElementById("inspect-back-marginalia");

      if (backTitleEl) backTitleEl.textContent = backData.backTitle;
      if (backBodyEl) backBodyEl.textContent = backData.backBody;
      if (backMargEl) backMargEl.textContent = backData.marginalia;

      card3d.classList.remove("is-flipped");
      modal.style.display = "flex";
      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");

      const closeInspection = () => {
        modal.style.display = "none";
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
      };

      const closeBtnFront = document.getElementById("inspect-close-btn");
      const closeBtnBack = document.getElementById("inspect-close-btn-back");
      const backdrop = document.getElementById("modal-backdrop-vignette");

      if (closeBtnFront) closeBtnFront.onclick = closeInspection;
      if (closeBtnBack) closeBtnBack.onclick = closeInspection;
      if (backdrop) backdrop.onclick = closeInspection;

      const flipBtnFront = document.getElementById("inspect-flip-btn");
      const flipBtnBack = document.getElementById("inspect-flip-back-btn");

      if (flipBtnFront) {
        flipBtnFront.onclick = () => {
          card3d.classList.add("is-flipped");
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        };
      }
      if (flipBtnBack) {
        flipBtnBack.onclick = () => {
          card3d.classList.remove("is-flipped");
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        };
      }
    };

        const handlePointerEnd = (e) => {
          if (!isPointerDown) return;
          isPointerDown = false;
          try { card.releasePointerCapture(e.pointerId); } catch (_) {}
          card.classList.remove("is-physically-lifted");

          if (hasMoved) {
            // Settle document on table with paper sound
            if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
            redrawAssemblyThreads();
          } else {
            // Pure click without dragging -> Open Physical Lamp Document Inspection Overlay!
            openDocumentInspectionModal(c);
          }
        };

        card.onpointerup = handlePointerEnd;
        card.onpointercancel = handlePointerEnd;

        const dynamicContent = document.getElementById("assembly-dynamic-content") || dropZone;
        dynamicContent.appendChild(card);
      });

      redrawAssemblyThreads();
    };

    // Setup drag and drop from folder onto table surface
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add("drag-over-active"); };
    dropZone.ondragleave = () => { dropZone.classList.remove("drag-over-active"); };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over-active");
      const clueId = e.dataTransfer.getData("text/plain");
      if (clueId) placeClueOnTable(clueId);
    };

    // Initial render of folder and table cards on scene load
    renderFolder();
    renderTable();

    // MOTIBHAI PATEL'S EVALUATION VIA DIALOGUE OVERLAY & RECOMMENDATION UNLOCK
    const evaluateTableEvidence = () => {
      isEvaluating = true;

      // 1.2 Second Quiet Pacing Delay
      setTimeout(() => {
        const ids = placedClues.map(c => c.id);
        const hasPriceProof = ids.includes("receipt") || ids.includes("ledger");
        const hasSpoilageProof = ids.includes("rejectedLog");
        const hasTransportProof = ids.includes("manifest") || ids.includes("petition");

        const isCorrectCombo = hasPriceProof && hasSpoilageProof && hasTransportProof;

        if (isCorrectCombo) {
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("pluck");

          this.dialogue.say(
            GAME_DATA.locations.hall.speaker,
            "elder",
            [
              "These records tell the same story.",
              "The assembly understands."
            ],
            () => {
              if (decisionOptions) {
                decisionOptions.style.display = "flex";
                decisionOptions.style.animation = "introFade 1.2s ease forwards";
                decisionOptions.querySelectorAll(".conclusion-note").forEach(btn => {
                  btn.onclick = () => {
                    const endingId = btn.dataset.ending;
                    this._chooseEnding(endingId);
                  };
                });
              }
            }
          );
        } else {
          // Wrong combination — Motibhai Patel speaks through Dialogue Overlay
          this.dialogue.say(
            GAME_DATA.locations.hall.speaker,
            "elder",
            [
              "This supports your argument...",
              "But something important is still missing to prove the monopoly."
            ],
            () => {
              if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
              placedClues.pop(); // return last placed document
              renderTable();
              renderFolder();
              isEvaluating = false;
            }
          );
        }
      }, 1200);
    };

    renderFolder();
  }



  /* -------------------------------------------------------
     ENDING
  ------------------------------------------------------- */
  /* -------------------------------------------------------
     ENDING (11-STEP CINEMATIC ARCHIVAL SEQUENCE)
  ------------------------------------------------------- */
  _chooseEnding(id) {
    this.state.ending = id;
    this._save();
    
    // Play stamp audio & lift card
    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("stamp");
    }

    // Direct transition to the continuous Interactive Oak Desk (#scene-ending)
    setTimeout(() => {
      this._showEnding(id);
    }, 600);
  }

  _showEnding(id) {
    this._goToScene("ending");
    this._setupInspectionModal();

    // 1. DOSSIER UNSEAL: Unfold Historical Record & Reveal Desk Artifacts
    const sealedFolderBtn = document.getElementById("unseal-historical-folder");
    const unfoldedSpread = document.getElementById("unfolded-comparison-spread");
    const stageArtifacts = document.getElementById("stage-artifacts");
    const stageEnvelope = document.getElementById("stage-envelope");
    const peekingCorner = document.getElementById("peeking-resolution-corner");
    const tuckedRecord = document.getElementById("tucked-archive-record");
    const approvalSlip = document.getElementById("approval-stamp-slip");

    const compPlayerTitle = document.getElementById("comp-player-title");
    const compPlayerDesc = document.getElementById("comp-player-desc");
    const compPencilText = document.getElementById("comp-pencil-text");

    // PHYSICAL DOSSIER BINDER TAB NAVIGATION
    const tabBtns = document.querySelectorAll(".binder-tab-btn");
    const tabPages = document.querySelectorAll(".binder-page-spread");

    tabBtns.forEach(btn => {
      btn.onclick = () => {
        const tabId = btn.dataset.tab;
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("page");

        tabBtns.forEach(b => b.classList.remove("is-active"));
        tabPages.forEach(p => {
          p.classList.remove("is-active");
          p.style.display = "none";
        });

        btn.classList.add("is-active");
        const activePage = document.getElementById(`tab-page-${tabId}`);
        if (activePage) {
          activePage.classList.add("is-active");
          activePage.style.display = "block";
        }
      };
    });

    if (unfoldedSpread) {
      unfoldedSpread.classList.remove("is-unsealed");
      unfoldedSpread.style.display = "none";
    }
    if (tuckedRecord) tuckedRecord.style.display = "none";
    if (peekingCorner) peekingCorner.style.display = "block";
    if (stageArtifacts) stageArtifacts.style.display = "block";
    if (stageEnvelope) stageEnvelope.style.display = "block";
    if (sealedFolderBtn) sealedFolderBtn.style.display = "block";

    if (id === "cooperative") {
      if (compPlayerTitle) compPlayerTitle.textContent = "Form a Cooperative";
      if (compPlayerDesc) compPlayerDesc.textContent = "You recommended collecting, grading, and selling milk together.";
      if (compPencilText) compPencilText.textContent = '"Your investigation reached the same conclusion recorded in the historical archive."';
    } else if (id === "accept") {
      if (compPlayerTitle) compPlayerTitle.textContent = "Accept Polson's Rates";
      if (compPlayerDesc) compPlayerDesc.textContent = "You recommended accepting contractor terms to avoid immediate dispute.";
      if (compPencilText) compPencilText.textContent = '"Your investigation reached a different conclusion."';
    } else if (id === "cooling") {
      if (compPlayerTitle) compPlayerTitle.textContent = "Install Cooling Tanks";
      if (compPlayerDesc) compPlayerDesc.textContent = "You recommended technical cooling upgrades to prevent milk spoilage.";
      if (compPencilText) compPencilText.textContent = '"Your investigation reached a different conclusion."';
    }

    if (sealedFolderBtn) {
      sealedFolderBtn.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
        sealedFolderBtn.style.display = "none";
        if (unfoldedSpread) {
          unfoldedSpread.classList.add("is-unsealed");
          unfoldedSpread.style.display = "flex";
        }
        if (stageArtifacts) stageArtifacts.style.display = "block";
        if (stageEnvelope) stageEnvelope.style.display = "block";
      };
    }

    // PEEKING RESOLUTION SLIDER
    const carbonMemo = document.getElementById("torn-carbon-memo");
    if (peekingCorner && tuckedRecord) {
      peekingCorner.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        tuckedRecord.style.display = "flex";
        if (carbonMemo) carbonMemo.style.display = "block";
        peekingCorner.style.display = "none";
      };
    }

    // 3. FLIPPABLE HISTORIC PHOTO CARD HANDLER
    const photoCard = document.getElementById("legacy-photo-card");
    if (photoCard) {
      photoCard.onclick = () => {
        const front = photoCard.querySelector(".photo-card-front");
        const back = photoCard.querySelector(".photo-card-back");
        if (front && back) {
          if (front.style.display === "none") {
            front.style.display = "block";
            back.style.display = "none";
          } else {
            front.style.display = "none";
            back.style.display = "block";
          }
          if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("page");
        }
      };
    }

    // 4. STRING WASHER UNWRAPPER (CONCEPT 1 DISCOVERY RITUAL)
    const stringWasherBtn = document.getElementById("string-washer-btn");
    const sealedSleeve = document.getElementById("sealed-discovery-sleeve");
    const unfoldedRecord = document.getElementById("unfolded-historical-record");

    if (stringWasherBtn) {
      stringWasherBtn.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        if (sealedSleeve) sealedSleeve.style.display = "none";
        if (unfoldedRecord) unfoldedRecord.style.display = "block";
      };
    }

    // Global samayOpenEnvelope helper for Tab 3 discovery button
    window.samayOpenEnvelope = () => {
      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
      if (envelopeBox) envelopeBox.style.display = "none";
      if (legacyContainer) {
        legacyContainer.style.display = "block";
        legacyContainer.style.animation = "slideOutHistoricalDeed 0.6s ease forwards";
      }
    };

    if (envelopeBtn) {
      envelopeBtn.onclick = () => {
        window.samayOpenEnvelope();

        // Show specific branching outcome block or update sleek final dossier
        const playerTitle = document.getElementById("dossier-player-title");
        const playerDesc = document.getElementById("dossier-player-desc");
        
        if (id === "cooperative") {
          if (playerTitle) playerTitle.textContent = "Form a Cooperative Union";
          if (playerDesc) playerDesc.textContent = "You recommended collective milk pooling, grading, and direct transport to Bombay Municipality, bypassing contractor monopoly.";
        } else if (id === "accept") {
          if (playerTitle) playerTitle.textContent = "Accept Polson's Contractor Rates";
          if (playerDesc) playerDesc.textContent = "You recommended accepting contractor rates to avoid immediate conflict, leaving Kaira farmers in long-term economic distress.";
        } else if (id === "cooling") {
          if (playerTitle) playerTitle.textContent = "Build Cooling Tanks Only";
          if (playerDesc) playerDesc.textContent = "You recommended technical cooling upgrades without farmer ownership; contractor Polson Ltd captured 100% of efficiency gains.";
        }

        const branchOutcomeId = id === "cooperative" ? "branch-outcome-cooperative" :
                                (id === "accept" ? "branch-outcome-accept" : "branch-outcome-cooling");
        const branchEl = document.getElementById(branchOutcomeId);
        if (branchEl) branchEl.style.display = "block";
      };
    }

    // 5. UNIFIED PHYSICAL RUBBER STAMP & CABINET DRAWER CLOSING ACTION
    if (stampBtn) {
      stampBtn.onclick = (e) => {
        e.preventDefault();
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
        stampBtn.style.display = "none";

        const dossier = document.getElementById("sleek-final-dossier") || document.getElementById("open-casebook-journal") || document.getElementById("final-dispatch-dossier");
        if (dossier) {
          dossier.style.transition = "transform 0.8s ease, opacity 0.8s ease";
          dossier.style.transform = "translateY(60vh) scale(0.85)";
          dossier.style.opacity = "0";
        }

        setTimeout(() => {
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("stamp");
          }

          // 1. Reset dossier transform
          if (dossier) {
            dossier.style.transform = "none";
            dossier.style.opacity = "1";
          }

          // 2. Go to Archive scene
          this._goToScene("archive");

          // 3. Smooth Mechanical Cabinet Drawer Slam & Lock Sequence
          const drawer1 = document.getElementById("drawer-case1");
          const cabinetEl = document.querySelector(".cabinet");
          
          if (drawer1) {
            drawer1.classList.remove("is-open");
            drawer1.classList.add("case-completed");
            
            const drawerLabel = drawer1.querySelector(".drawer-label");
            if (drawerLabel) {
              drawerLabel.innerHTML = `<span style="color:#aa7c11; font-weight:bold;">✔ CASE 001 RESOLVED</span><br>Foundation of AMUL (1946-1950)`;
            }
          }
          if (cabinetEl) {
            cabinetEl.classList.remove("drawer-open-active");
          }

          // 4. Update Archive Room Header Status & Show Restart Button
          const archiveHint = document.querySelector(".archive-hint");
          if (archiveHint) {
            archiveHint.innerHTML = `<span style="color:#aa7c11; font-weight:bold;">✔ CASE #001 OFFICIALLY RESOLVED & FILED IN THE NATIONAL ARCHIVES</span>`;
          }

          const btnRestart = document.getElementById("btn-restart");
          if (btnRestart) {
            btnRestart.style.display = "inline-flex";
            btnRestart.style.margin = "12px auto 0";
          }
        }, 850);
      };
    }
  }

  _findLocationByClue(clueId) {
    const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
    return loc ? loc.id : null;
  }



  _setupInspectionModal() {
    if (this._inspectionModalInitialized) return;
    this._inspectionModalInitialized = true;

    const inspectedSet = new Set();

    const artifactDetails = {
      price: {
        title: "📕 BOMBAY PROCUREMENT LEDGER (1946)",
        badge: "MARGIN ACCOUNTING AUDIT",
        body: `<div class="ledger-modal-inspect font-type">
                <h4 style="color:#8b0000;margin-bottom:12px;">BOMBAY MILK PROCUREMENT MARGINS</h4>
                <p>Private contractors retained <span class="pencil-underline">9 Annas margin</span> per seer in Bombay, paying Anand farmers only 3 Annas per seer.</p>
                <div style="background:rgba(43,23,12,0.06);padding:12px;border-left:3px solid #aa7c11;margin:16px 0;">
                  <strong style="color:#2b170c;display:block;">Graphite Audit Note:</strong>
                  <em>"Contractor profit margins reached 75% of retail price. Middleman monopoly verified. See Transit Permit #402."</em>
                </div>
              </div>`
      },
      patel: {
        title: "⚡ TELEGRAM DISPATCH #402",
        badge: "INDIAN TELEGRAPH DEPT // 1946",
        body: `<div class="wire-modal-inspect font-type">
                <h4 style="color:#8b0000;margin-bottom:12px;">SARDAR VALLABHBHAI PATEL DIRECTIVE</h4>
                <p>"Sardar Patel advised the Kaira farmers that only a <span class="pencil-underline">15-day complete milk strike</span> could break contractor monopoly power over Bombay supply lines."</p>
                <div style="background:rgba(139,0,0,0.06);padding:12px;border-left:3px solid #8b0000;margin:16px 0;">
                  <strong style="color:#8b0000;display:block;">Dispatch Priority: CONFIDENTIAL</strong>
                  <em>"Prepare village committees for collective boycott of contractor milk collection centers."</em>
                </div>
              </div>`
      },
      rail: {
        title: "🚂 B.B. & C.I. RAILWAY FREIGHT PASS #402",
        badge: "TRANSIT FREIGHT CLEARANCE",
        body: `<div class="rail-modal-inspect font-type">
                <h4 style="color:#1b2a4a;margin-bottom:12px;">DIRECT RAIL TRANSIT PERMIT #402</h4>
                <p>"Bombay Municipality granted <span class="pencil-underline">direct rail transit permits</span> exclusively to the independent Kaira Cooperative."</p>
                <div style="background:rgba(27,42,74,0.06);padding:12px;border-left:3px solid #1b2a4a;margin:16px 0;">
                  <strong style="color:#1b2a4a;display:block;">Freight Authorization: PASSED</strong>
                  <em>"Allows cooperative milk tankers direct priority dispatch on Anand-Bombay express rail line."</em>
                </div>
              </div>`
      }
    };

    const openInspectionModal = window.samayOpenInspect = (docId) => {
      const inspectOverlay = document.getElementById("artifact-inspect-overlay");
      const inspectContent = document.getElementById("inspect-content-body");
      const approvalSlip = document.getElementById("approval-stamp-slip");

      if (!inspectOverlay || !inspectContent) return;
      const data = artifactDetails[docId];
      if (!data) return;

      inspectedSet.add(docId);
      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("page");

      inspectContent.innerHTML = `
        <span class="clipping-tag font-type" style="display:block;margin-bottom:4px;">${data.badge}</span>
        <h3 style="font-family:var(--font-display);color:#3c2416;margin:0 0 16px;">${data.title}</h3>
        ${data.body}
      `;

      inspectOverlay.classList.add("is-active");
      inspectOverlay.style.setProperty("display", "flex", "important");

      if (inspectedSet.size >= 2 && approvalSlip) {
        approvalSlip.style.display = "block";
      }
    };

    const closeInspectionModal = window.samayCloseInspect = () => {
      const inspectOverlay = document.getElementById("artifact-inspect-overlay");
      if (inspectOverlay) {
        inspectOverlay.classList.remove("is-active");
        inspectOverlay.style.setProperty("display", "none", "important");
      }
      if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
    };

    // Robust event delegation for inspection modal triggers
    document.addEventListener("click", (e) => {
      if (e.target.closest("#btn-close-inspect, #inspect-backdrop")) {
        closeInspectionModal();
        return;
      }

      const trigger = e.target.closest("#why-doc-price, #why-doc-patel, #why-doc-rail, .btn-inspect-artifact, [data-doc]");
      if (trigger) {
        const docTarget = trigger.dataset.doc || trigger.closest("[data-doc]")?.dataset.doc;
        if (docTarget && artifactDetails[docTarget]) {
          openInspectionModal(docTarget);
        }
      }
    });
  }

  _inspectEvidence(clueId) {
    const modal = document.getElementById("modal-evidence-inspect");
    const label = document.getElementById("inspect-warning-label");
    const body = document.getElementById("inspect-document-body");
    const flipBtn = document.getElementById("btn-inspect-flip");
    const closeBtn = document.getElementById("btn-inspect-close");

    if (window.SAMAY_SOUND) {
      window.SAMAY_SOUND.play("page");
    }

    modal.classList.remove("is-flipped");
    flipBtn.style.display = clueId === "petition" ? "block" : "none";

    let warningText = "HISTORICALLY RECONSTRUCTED DOCUMENT";
    if (clueId === "ledger") {
      warningText = "HISTORICALLY DOCUMENTED RATES AND CONFLICTS";
    } else if (clueId === "petition") {
      warningText = "HISTORICALLY DOCUMENTED RESOLUTION AND ADVICE";
    }
    label.textContent = warningText;

    let html = "";
    if (clueId === "receipt") {
      html = `
        <div class="inspect-receipt">
          <h4>POLSON'S MODEL DAIRY</h4>
          <div class="receipt-sub">AUTHORIZED PROCUREMENT DEPOT — ANAND</div>
          <div class="receipt-row"><strong>Receipt No:</strong> A-4029</div>
          <div class="receipt-row"><strong>Date:</strong> 3 Jan 1946</div>
          <div class="receipt-row"><strong>Producer:</strong> D. Patel (Samarkha)</div>
          <table class="receipt-table">
            <thead>
              <tr><th>Particulars</th><th>Qty / fat</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Milk Delivered</td><td>14 Seers (Fat: 4.8%)</td><td>—</td></tr>
              <tr><td>Milk Credited</td><td>8 Seers (Fat: 3.8% Base)</td><td>Re. 2 / 0 / 0</td></tr>
              <tr><td>Fat Variance Penalty</td><td>-6 Seers (Deducted)</td><td>—</td></tr>
              <tr><td>Agent Freight Charge</td><td>6 Pice/Seer Levy</td><td>Rs. 0 / 10 / 0</td></tr>
            </tbody>
          </table>
          <div class="receipt-row" style="margin-top: 16px; border-top: 1px dashed #555; padding-top: 10px;">
            <strong>NET PAYOUT:</strong> <strong>Rs. 1 / 6 / 0</strong>
          </div>
          <div class="stamp-red">POLSON AGENT<br>3-JAN-1946</div>
        </div>
      `;
    } else if (clueId === "ledger") {
      html = `
        <div class="inspect-ledger">
          <div class="ledger-folio-num">Folio: 92 (Bombay Scheme Accounts)</div>
          <h4>POLSON LIMITED — ANAND FACTORY</h4>
          <div class="receipt-sub">LEDGER ACCOUNTS — BOMBAY MILK SUPPLY CONTRACT</div>
          <table class="ledger-table">
            <thead>
              <tr><th>Particulars</th><th>Debit (Procurement)</th><th>Credit (Sales)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Government Contract Price (Bombay Municipal Milk Scheme)</td>
                <td>—</td>
                <td>12 Annas / Seer</td>
              </tr>
              <tr>
                <td>Kaira District Local Agent Base Purchase Rate</td>
                <td>3 Annas / Seer</td>
                <td>—</td>
              </tr>
              <tr class="ledger-row-red">
                <td>Surplus Margin (Contractor Retained)</td>
                <td>—</td>
                <td>9 Annas / Seer</td>
              </tr>
            </tbody>
          </table>
          <div class="log-note" style="margin-top: 16px;">
            *Note: Local agent commission and handling costs to be subtracted from farmer's base rate.
          </div>
        </div>
      `;
    } else if (clueId === "rejectedLog") {
      html = `
        <div class="inspect-log">
          <h4>POLSON DAIRY CO. — RECEIVING LOG</h4>
          <div class="receipt-sub">ANAND PASTEURISING FACTORY</div>
          <table class="log-table">
            <thead>
              <tr><th>Time</th><th>Batch No</th><th>Producer</th><th>Qty</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>08:10 AM</td><td>B-110</td><td>R. Patel</td><td>18 Seers</td><td>ACCEPT</td></tr>
              <tr><td>08:15 AM</td><td>B-111</td><td>K. Solanki</td><td>12 Seers</td><td class="log-status-reject">REJECT (Sour)</td></tr>
              <tr><td>08:15 AM</td><td>B-112</td><td>D. Parmar</td><td>15 Seers</td><td class="log-status-reject">REJECT (Sour)</td></tr>
              <tr><td>08:15 AM</td><td>B-113</td><td>M. Vaghela</td><td>20 Seers</td><td class="log-status-reject">REJECT (Sour)</td></tr>
            </tbody>
          </table>
          <div class="log-note">
            *Plant Manager Directive: Pasteuriser Tank #1 capacity limit reached. Reject subsequent batches. — Plant Mgr.
          </div>
        </div>
      `;
    } else if (clueId === "manifest") {
      html = `
        <div class="inspect-waybill">
          <h4>BOMBAY, BARODA & CENTRAL INDIA RY.</h4>
          <div class="receipt-sub">GOODS CARRIAGE RECEIPT (WAYBILL)</div>
          <div class="waybill-grid">
            <div><strong>Waybill No:</strong> W-90821</div>
            <div><strong>Date:</strong> 3 Jan 1946</div>
            <div><strong>Consignor:</strong> Polson Ltd.</div>
            <div><strong>Consignee:</strong> Milk Comm., Bombay Scheme</div>
          </div>
          <div class="waybill-grid" style="border-top: 1px dashed #8fa89b; padding-top: 8px;">
            <div><strong>Carriage:</strong> Wagon #428</div>
            <div><strong>Route:</strong> Anand to Bombay Central</div>
            <div><strong>Load Weight:</strong> 112 Maunds</div>
            <div><strong>Freight:</strong> Rs. 42 / 8 / 0 (Prepaid)</div>
          </div>
          <div class="waybill-gauge">
            <strong>CARRIAGE CAPACITY UTILISATION:</strong>
            <div class="gauge-bar-outer">
              <div class="gauge-bar-inner" style="width: 45%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
              <span>Loaded: 45% (48 Maunds)</span>
              <span>Empty Space: 55% (64 Maunds)</span>
            </div>
          </div>
        </div>
      `;
    } else if (clueId === "petition") {
      html = `
        <div class="inspect-petition">
          <div class="inspect-petition-front" id="petition-front">
            <h4>KAIRA DISTRICT FARMERS RESOLUTION</h4>
            <div class="receipt-sub">SAMARKHA VILLAGE COUNCIL MEETING</div>
            <p>We, the dairy producers of Kaira District, resolve to bypass the Polson monopoly agents and bargain directly with the Bombay Municipal Milk Scheme under our own Cooperative Union.</p>
            <div style="margin-top: 24px; font-size: 0.75rem;">
              <strong>Representatives:</strong> Tribhuvandas K. Patel <span class="inspect-petition-thumbprint"></span>
            </div>
          </div>
          <div class="inspect-petition-back" id="petition-back" style="display:none;">
            <h4>SARDAR PATEL'S GUIDANCE (SUMMARY)</h4>
            <div class="receipt-sub">WRITTEN MEMORANDUM TO ANAND FARMERS</div>
            <p style="color: #8b0000; font-family: 'Special Elite', Courier, monospace;">
              Sardar Vallabhbhai Patel advised the farmers to establish their own cooperative pasteurisation plant. If the Bombay Government refused to purchase direct, the farmers must go on a strike and refuse to sell a single drop of milk.
            </p>
          </div>
        </div>
      `;
    }

    body.innerHTML = html;
    modal.classList.add("is-active");

    const flipAction = (e) => {
      e.preventDefault();
      const front = document.getElementById("petition-front");
      const back = document.getElementById("petition-back");
      if (front && back) {
        if (front.style.display === "none") {
          front.style.display = "block";
          back.style.display = "none";
        } else {
          front.style.display = "none";
          back.style.display = "block";
        }
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("page");
        }
      }
    };

    const closeAction = (e) => {
      e.preventDefault();
      modal.classList.remove("is-active");
      flipBtn.removeEventListener("click", flipAction);
      closeBtn.removeEventListener("click", closeAction);
      if (window.SAMAY_SOUND) {
        window.SAMAY_SOUND.play("clack");
      }
    };
  }

  /* -------------------------------------------------------
     DEV-ONLY DEBUG MENU (SCENE JUMPER)
  ------------------------------------------------------- */
  _setupDevDebugMenu() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") !== "1") return;

    const overlay = document.getElementById("dev-debug-overlay");
    const closeBtn = document.getElementById("dev-debug-close-btn");

    const toggleOverlay = () => {
      if (overlay) {
        overlay.classList.toggle("is-active");
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("click");
      }
    };

    // Listen for ~ (backtick/tilde) or F9
    window.addEventListener("keydown", (e) => {
      if (e.key === "~" || e.key === "`" || e.key === "F9") {
        e.preventDefault();
        toggleOverlay();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", toggleOverlay);
    }

    // Bind Jump Buttons
    document.querySelectorAll(".dev-jump-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.jump;
        this._devJumpToScene(target);
        if (overlay) overlay.classList.remove("is-active");
      });
    });
  }

  _devJumpToScene(target) {
    const allClues = ["price", "receipt", "waybill", "monopoly", "cooperative"];
    
    // Get target ending choice from radio options
    const selectedEndingRadio = document.querySelector('input[name="dev-ending-choice"]:checked');
    const selectedEnding = selectedEndingRadio ? selectedEndingRadio.value : "cooperative";

    switch (target) {
      case "archive":
        this.state.scene = "archive";
        this._goToScene("archive");
        break;

      case "drawer":
        this._goToScene("archive");
        const drawer = document.getElementById("drawer-case1");
        if (drawer) drawer.classList.add("is-drawer-open");
        break;

      case "folder":
        this._goToScene("archive");
        const dossier = document.getElementById("fullscreen-dossier");
        if (dossier) dossier.classList.add("is-unfolded");
        break;

      case "seal":
        this._goToScene("intro");
        const cover = document.getElementById("dossier-cover");
        if (cover) cover.classList.remove("is-unfolded");
        break;

      case "briefing":
        this._goToScene("intro");
        this._playBriefing();
        break;

      case "map":
        this.state.clues = ["price"];
        this.state.visited = ["depot"];
        this._goToScene("village");
        this._renderNotebook();
        this._renderInventory();
        break;

      case "witnesses":
        this.state.clues = ["price", "receipt"];
        this.state.visited = ["depot", "farm"];
        this._goToScene("village");
        this.dialogue.say(
          "Tribhuvandas Patel",
          "leader",
          ["Sardar Patel says we must stop selling milk to Polson completely. Only a cooperative union can save Anand's farmers."],
          () => {}
        );
        break;

      case "board":
        this.state.clues = [...allClues];
        this.state.visited = ["depot", "farm", "station", "panchayat", "office"];
        this._goToScene("detective");
        this._renderBoard();
        this._renderNotebook();
        this._renderInventory();
        break;

      case "recommendation":
        this.state.clues = [...allClues];
        this.state.visited = ["depot", "farm", "station", "panchayat", "office"];
        this.state.connectedPairs = ["price-receipt", "monopoly-cooperative"];
        this._goToScene("meeting");
        const decisionOptions = document.getElementById("decision-options");
        if (decisionOptions) decisionOptions.style.display = "flex";
        this._renderNotebook();
        this._renderInventory();
        break;

      case "ending":
        this.state.clues = [...allClues];
        this.state.ending = selectedEnding;
        this._showEnding(selectedEnding);
        break;

      default:
        this._goToScene("archive");
        break;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.SAMAY_GAME = new Game();
});