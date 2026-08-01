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
    }

    if (this.el.decisionOptions) {
      this.el.decisionOptions.querySelectorAll(".decision-card").forEach(card => {
        card.addEventListener("click", () => this._chooseEnding(card.dataset.ending));
      });
    }

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

    // Mark Case 001 as solved if ending is completed
    const drawerLabel = document.querySelector("#drawer-case1 .drawer-label");
    if (drawerLabel && this.state.ending) {
      drawerLabel.innerHTML = `CASE 001<br>The Milk Monopoly<br><span class="stamp-archived">ARCHIVED</span>`;
      drawerLabel.style.color = "#a8452f";
      drawerLabel.style.borderColor = "#aa7c11";
      drawerLabel.style.background = "#faf6eb";
    }
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
    this.el.meetingOptions.classList.remove("is-visible");
    this.el.meetingOptions.innerHTML = "";

    this.dialogue.say(
      GAME_DATA.locations.hall.speaker,
      "elder",
      [
        "You have heard every witness.",
        "The village places its trust in your judgement.",
        "Show us what evidence supports your recommendation."
      ],
      () => this._showEvidenceDock()
    );
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

    // Track Question 2 inspected documents
    const inspectedDocs = new Set();

    // 1. QUESTION 1 SETUP: Unseal Historical Folder
    const sealedFolderBtn = document.getElementById("unseal-historical-folder");
    const unfoldedSpread = document.getElementById("unfolded-comparison-spread");
    const stageQ2 = document.getElementById("stage-q2");
    const stageQ3 = document.getElementById("stage-q3");

    const compPlayerTitle = document.getElementById("comp-player-title");
    const compPlayerDesc = document.getElementById("comp-player-desc");
    const compPencilText = document.getElementById("comp-pencil-text");

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
        if (unfoldedSpread) unfoldedSpread.style.display = "flex";

        // Unlock Question 2 after a brief pause
        setTimeout(() => {
          if (stageQ2) stageQ2.style.display = "block";
        }, 1200);
      };
    }

    // 2. QUESTION 2 SETUP: 3 Interactive Inspectable Evidence Documents
    document.querySelectorAll(".why-doc-card").forEach(card => {
      card.onclick = () => {
        const docId = card.dataset.doc;
        inspectedDocs.add(docId);
        card.classList.add("is-inspected");
        
        const revealedText = card.querySelector(".doc-revealed-text");
        const prompt = card.querySelector(".doc-inspect-prompt");
        if (revealedText) revealedText.style.display = "block";
        if (prompt) prompt.textContent = "✓ Evidence Inspected";

        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("page");

        // Unlock Question 3 when all 3 docs are inspected
        if (inspectedDocs.size >= 3) {
          setTimeout(() => {
            if (stageQ3) stageQ3.style.display = "block";
          }, 600);
        }
      };
    });

    // 3. STEP 3 SETUP: String-Tied AMUL Discovery Envelope & Rubber Stamp Slam
    const envelopeBtn = document.getElementById("btn-open-amul-envelope");
    const envelopeBox = document.getElementById("amul-discovery-envelope");
    const legacyContainer = document.getElementById("legacy-reveal-container");
    const stampBtn = document.getElementById("btn-stamp-case-closed");
    const footerAction = document.getElementById("ending-footer-action");

    if (envelopeBtn) {
      envelopeBtn.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("paper");
        if (envelopeBox) envelopeBox.style.display = "none";
        if (legacyContainer) legacyContainer.style.display = "block";
      };
    }

    if (stampBtn) {
      stampBtn.onclick = () => {
        if (window.SAMAY_SOUND) window.SAMAY_SOUND.play("stamp");
        stampBtn.style.display = "none";
        if (footerAction) footerAction.style.display = "block";
      };
    }

    // Physical Case Closing & Cabinet Drawer Lock Action
    const restartBtn = document.getElementById("btn-restart");
    if (restartBtn) {
      restartBtn.onclick = (e) => {
        e.preventDefault();
        const dossierFrame = document.getElementById("final-dispatch-dossier");
        
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }

        if (dossierFrame) {
          dossierFrame.style.transform = "translateY(100vh) scale(0.9)";
          dossierFrame.style.opacity = "0";
        }

        setTimeout(() => {
          if (window.SAMAY_SOUND) {
            window.SAMAY_SOUND.play("bell");
          }
          if (dossierFrame) {
            dossierFrame.style.transform = "none";
            dossierFrame.style.opacity = "1";
          }
          this._goToScene("archive");
        }, 750);
      };
    }
  }

  _findLocationByClue(clueId) {
    const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
    return loc ? loc.id : null;
  }

  _showSentencePrompt(pair, node, prevNode) {
    const overlay = document.getElementById("deduction-prompt-overlay");
    const question = document.getElementById("prompt-question");
    const sentenceText = document.getElementById("prompt-sentence-text");
    const optionsBox = document.getElementById("prompt-options");

    overlay.classList.add("is-active");
    question.textContent = `Correlation: ${GAME_DATA.locations[this._findLocationByClue(pair.a)].clue.name} & ${GAME_DATA.locations[this._findLocationByClue(pair.b)].clue.name}`;

    let tempText = pair.sentence.text;
    let blankIndex = 0;
    while (tempText.includes("[ _____ ]")) {
      tempText = tempText.replace("[ _____ ]", `<span class="blank-slot" id="blank-${blankIndex}">[ Slot ]</span>`);
      blankIndex++;
    }
    sentenceText.innerHTML = tempText;

    const selectedAnswers = Array(pair.sentence.blanks.length).fill(null);
    let currentBlank = 0;

    const renderBlankOptions = () => {
      optionsBox.innerHTML = "";
      if (currentBlank < pair.sentence.blanks.length) {
        const blankData = pair.sentence.blanks[currentBlank];
        const label = document.createElement("div");
        label.className = "prompt-blank-label";
        label.style.fontWeight = "bold";
        label.style.fontSize = "0.75rem";
        label.style.color = "#7d6542";
        label.style.marginBottom = "8px";
        label.textContent = `CHOOSE TERM FOR SLOT ${currentBlank + 1}:`;
        optionsBox.appendChild(label);

        const choices = [...blankData.choices].sort(() => Math.random() - 0.5);

        choices.forEach(choice => {
          const btn = document.createElement("button");
          btn.className = "prompt-option-btn";
          btn.textContent = choice;
          btn.addEventListener("click", () => {
            selectedAnswers[currentBlank] = choice;
            const slotEl = document.getElementById(`blank-${currentBlank}`);
            if (slotEl) {
              slotEl.textContent = choice;
              slotEl.style.color = "#4e8068";
            }
            if (window.SAMAY_SOUND) {
              window.SAMAY_SOUND.play("clack");
            }
            currentBlank++;
            renderBlankOptions();
          });
          optionsBox.appendChild(btn);
        });
      } else {
        const isCorrect = pair.sentence.blanks.every((b, idx) => selectedAnswers[idx] === b.answer);
        if (isCorrect) {
          setTimeout(() => {
            overlay.classList.remove("is-active");
            
            this.state.connectedPairs.push(pair.id);
            node.classList.add("is-linked");
            prevNode.classList.add("is-linked");
            this._renderDeductionCard(pair.id);
            this._redrawConnections();
            this._checkFinalDeduction();
            this._updateInsightScore();

            if (window.SAMAY_SOUND) {
              window.SAMAY_SOUND.play("pluck");
            }
            if (this.el.board) {
              this.el.board.classList.add("board-shake");
              setTimeout(() => this.el.board.classList.remove("board-shake"), 450);
            }
            this._save();
          }, 600);
        } else {
          setTimeout(() => {
            overlay.classList.remove("is-active");
            this.state.wrongGuesses = (this.state.wrongGuesses || 0) + 1;
            this._flashWrongGuess();
            if (window.SAMAY_SOUND) {
              window.SAMAY_SOUND.play("stamp");
            }
            this._save();
          }, 800);
        }
      }
    };

    renderBlankOptions();
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

    flipBtn.addEventListener("click", flipAction);
    closeBtn.addEventListener("click", closeAction);
  }

  _showEvidenceDock() {
    const dock = document.getElementById("meeting-evidence-dock");
    const grid = document.getElementById("evidence-dock-grid");
    const submitBtn = document.getElementById("btn-submit-evidence");

    grid.innerHTML = "";
    dock.classList.add("is-active");

    const selectedClues = [];

    this.state.clues.forEach(clueId => {
      const loc = Object.values(GAME_DATA.locations).find(l => l.clue.id === clueId);
      const card = document.createElement("div");
      card.className = "evidence-dock-card";
      card.innerHTML = `
        <div class="evidence-dock-checkbox"></div>
        <span>${loc.clue.name}</span>
      `;
      card.addEventListener("click", () => {
        if (card.classList.contains("is-selected")) {
          card.classList.remove("is-selected");
          const idx = selectedClues.indexOf(clueId);
          if (idx > -1) selectedClues.splice(idx, 1);
        } else {
          card.classList.add("is-selected");
          selectedClues.push(clueId);
        }
        submitBtn.disabled = selectedClues.length !== 3;
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("clack");
        }
      });
      grid.appendChild(card);
    });

    const submitAction = () => {
      const correct = selectedClues.includes("ledger") && 
                      selectedClues.includes("rejectedLog") && 
                      selectedClues.includes("petition");

      if (correct) {
        // Disable evidence cards so they stay fixed on the table
        grid.querySelectorAll(".evidence-dock-card").forEach(c => {
          c.style.pointerEvents = "none";
          c.style.opacity = "0.85";
        });
        submitBtn.style.display = "none";
        submitBtn.removeEventListener("click", submitAction);

        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }
        this.dialogue.say(
          GAME_DATA.locations.hall.speaker,
          "elder",
          [
            "The proof is clear.",
            "Polson charges 12 Annas in Bombay while paying us 3 Annas, rejects our milk arbitrarily at 08:15 AM, and Sardar Patel advises us to bypass the middlemen.",
            "What is our final recommendation?"
          ],
          () => {
            const instText = document.getElementById("panchayat-instruction-text");
            if (instText) {
              instText.textContent = "Pin your final recommendation to the assembly table:";
            }
            const decisionOptions = document.getElementById("decision-options");
            if (decisionOptions) {
              decisionOptions.style.display = "flex";
              if (window.SAMAY_SOUND) {
                window.SAMAY_SOUND.play("paper");
              }
            }
          }
        );
      } else {
        dock.classList.remove("is-active");
        submitBtn.removeEventListener("click", submitAction);
        if (window.SAMAY_SOUND) {
          window.SAMAY_SOUND.play("stamp");
        }
        this.dialogue.say(
          GAME_DATA.locations.hall.speaker,
          "elder",
          [
            "These documents do not form a complete proof of the economic forces.",
            "We need to show the price margin ledger, the arbitrary rejection log, and the union petition."
          ],
          () => this._showEvidenceDock()
        );
      }
    };

    submitBtn.addEventListener("click", submitAction);
  }

  /* -------------------------------------------------------
     DEV-ONLY DEBUG MENU (SCENE JUMPER)
  ------------------------------------------------------- */
  _setupDevDebugMenu() {
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