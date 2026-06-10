/* ============================================================
   AC-27 — split-flap title board + tab routing
   Vanilla JS. The board is the persistent page title: switching
   tabs cycles each cell mechanically toward the new title.
   ============================================================ */

(() => {
  "use strict";

  const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/";
  const BOARD_SIZE = 10;               // fits "EXPERIENCE"
  const FLIP_MS = 90;                  // must match --flip-ms
  const FLIP_GAP = 18;                 // pause between flips
  const STAGGER = 55;                  // per-column start offset
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- split-flap board ---------- */

  class FlapBoard {
    constructor(root, size) {
      this.root = root;
      this.generation = 0;
      this.cells = Array.from({ length: size }, () => this.buildCell());
    }

    buildCell() {
      const el = document.createElement("div");
      el.className = "cell";
      el.innerHTML =
        '<div class="half top"><span> </span></div>' +
        '<div class="half bottom"><span> </span></div>' +
        '<div class="flap up"><span> </span></div>' +
        '<div class="flap down"><span> </span></div>';
      this.root.appendChild(el);
      return {
        el,
        char: " ",
        top: el.querySelector(".half.top span"),
        bottom: el.querySelector(".half.bottom span"),
        flapUp: el.querySelector(".flap.up span"),
        flapDown: el.querySelector(".flap.down span"),
      };
    }

    setText(text) {
      const target = text.toUpperCase().padEnd(this.cells.length).slice(0, this.cells.length);
      const gen = ++this.generation;

      this.cells.forEach((cell, i) => {
        const goal = CHARSET.includes(target[i]) ? target[i] : " ";
        if (REDUCED) {
          this.snap(cell, goal);
          return;
        }
        setTimeout(() => this.runCell(cell, goal, gen), i * STAGGER);
      });
    }

    snap(cell, char) {
      cell.char = char;
      cell.top.textContent = char;
      cell.bottom.textContent = char;
      cell.el.classList.remove("flipping");
    }

    /* step through a bounded sequence of charset positions toward the goal */
    runCell(cell, goal, gen) {
      const seq = this.buildSequence(cell.char, goal);
      const tick = () => {
        if (gen !== this.generation) return;       // superseded by a newer setText
        if (seq.length === 0) return;
        this.flipOnce(cell, seq.shift());
        setTimeout(tick, FLIP_MS + FLIP_GAP);
      };
      tick();
    }

    buildSequence(from, to) {
      if (from === to) return [];
      const a = CHARSET.indexOf(from);
      const b = CHARSET.indexOf(to);
      const dist = (b - a + CHARSET.length) % CHARSET.length;
      const steps = Math.min(dist, 5 + Math.floor(Math.random() * 4));
      const seq = [];
      for (let s = 1; s <= steps; s++) {
        const idx = (a + Math.round((dist * s) / steps)) % CHARSET.length;
        seq.push(CHARSET[idx]);
      }
      seq[seq.length - 1] = to;
      return seq;
    }

    flipOnce(cell, next) {
      const cur = cell.char;
      cell.top.textContent = next;       // revealed as the upper flap falls
      cell.bottom.textContent = cur;     // covered when the lower flap lands
      cell.flapUp.textContent = cur;
      cell.flapDown.textContent = next;

      cell.el.classList.remove("flipping");
      void cell.el.offsetWidth;          // restart the CSS animation
      cell.el.classList.add("flipping");

      cell.char = next;
      setTimeout(() => {
        cell.bottom.textContent = cell.char;
      }, FLIP_MS);
    }
  }

  /* ---------- tabs ---------- */

  const board = new FlapBoard(document.getElementById("flapboard"), BOARD_SIZE);
  const announce = document.getElementById("board-announce");
  const pageIndex = document.getElementById("board-index");
  const tabs = Array.from(document.querySelectorAll(".nav-link"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  function activate(name, { focusPanel = false, updateHash = true } = {}) {
    const tab = tabs.find((t) => t.dataset.tab === name) || tabs[0];
    const title = tab.dataset.title;

    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    panels.forEach((p) => { p.hidden = p.id !== "panel-" + tab.dataset.tab; });

    board.setText(title);
    announce.textContent = title;
    document.title = title + " — ADITYA CHANDRAN";
    pageIndex.textContent =
      "PAGE 0" + (tabs.indexOf(tab) + 1) + " / 0" + tabs.length;

    if (updateHash) history.replaceState(null, "", "#" + tab.dataset.tab);
    if (focusPanel) document.getElementById("panel-" + tab.dataset.tab).focus();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
  });

  /* arrow-key navigation across the tablist */
  document.querySelector(".nav").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const current = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(current + dir + tabs.length) % tabs.length];
    next.focus();
    activate(next.dataset.tab);
    e.preventDefault();
  });

  window.addEventListener("hashchange", () => {
    activate(location.hash.slice(1), { updateHash: false });
  });

  /* boot: honor a deep link, then flip the board in from blank */
  const initial = location.hash.slice(1) || "about";
  activate(initial, { updateHash: false });
})();
