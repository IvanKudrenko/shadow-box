(() => {
  "use strict";

  const WIDTH = 420;
  const HEIGHT = 700;
  const SAVE_KEY = "shadowBoxSaveData";
  const DEBUG_SHADOW_HITBOX = false;

  const LIGHT_CORE_RADIUS = 70;
  const LIGHT_GLOW_RADIUS = 310;
  const LIGHT_OUTER_RADIUS = 430;
  const LIGHT_INTENSITY = 1.05;
  const SHADOW_OPACITY = 0.78;
  const SHADOW_BLUR = 11;
  const SHADOW_LENGTH_MULTIPLIER = 1.12;
  const PLATFORM_RADIUS = 6;
  const PLATFORM_GLOW_BLUR = 11;
  const PLATFORM_COLOR = "#28aaff";
  const PLATFORM_HIGHLIGHT = "rgba(255, 255, 255, 0.42)";
  const LEVEL_COMPLETE_DELAY = 0;
  const PLAYER_FLIP_SPEED = 0.095;
  const PLAYER_ROTATION_EASE = 0.18;
  const PLAYER_LANDING_SQUASH = 0.11;
  const PLAYER_LANDING_DECAY = 0.82;
  const STAR_ROTATION_SPEED = 0.018;
  const STAR_PULSE_SPEED = 0.045;
  const STAR_COLLECT_SPEED = 0.09;
  const STAR_GLOW_BASE = 15;
  const STAR_GLOW_PULSE = 9;
  const LIGHT_BREATHE_SPEED = 0.035;
  const LIGHT_BREATHE_AMOUNT = 0.035;
  const SHADOW_SMOOTHING = 0.24;

  const TUNING = {
    gravity: 0.55,
    moveSpeed: 3.25,
    jumpStrength: 12.8,
    playerRadius: 13,
    playerSpriteSize: 28,
    starSpriteSize: 36,
    lightSpriteSize: 36,
    shadowLengthBase: 260,
    shadowDistanceScale: 0.7,
    shadowMinLength: 70,
    shadowMaxLength: 220,
    shadowWidthBase: 55,
    shadowWidthDistanceScale: 0.1,
    shadowMinWidth: 22,
    shadowMaxWidth: 55,
    shadowCollectionRadius: 20,
    shadowCollectionStart: 0.35
  };

  const ASSET_SOURCES = {
    player: "main sprite.svg",
    light: "light source.svg",
    star: "star.svg",
    hazard: "hazard sprite.png",
    doorClosed: "door.svg",
    doorOpen: "open door.svg"
  };

  const SCREENS = {
    MAIN_MENU: "mainMenu",
    LEVEL_SELECT: "levelSelect",
    PLAYING: "playing",
    LEVEL_BUILDER: "levelBuilder",
    CUSTOM_LEVELS: "customLevels"
  };

  const PLAY_STATES = {
    PLAYING: "playing",
    GAME_OVER: "gameOver",
    LEVEL_COMPLETE: "levelComplete",
    FINAL_WIN: "finalWin"
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const builderCanvas = document.getElementById("builderCanvas");
  const builderCtx = builderCanvas.getContext("2d");

  const hud = document.getElementById("hud");
  const message = document.getElementById("message");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlayKicker");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayReason = document.getElementById("overlayReason");
  const overlayActions = document.getElementById("overlayActions");
  const overlayPrompt = document.getElementById("overlayPrompt");
  const overlayBadge = document.getElementById("overlayBadge");

  const screens = {
    mainMenu: document.getElementById("mainMenu"),
    levelSelect: document.getElementById("levelSelect"),
    playing: document.getElementById("gameScreen"),
    levelBuilder: document.getElementById("levelBuilder"),
    customLevels: document.getElementById("customLevels")
  };

  const ui = {
    playButton: document.getElementById("playButton"),
    levelSelectButton: document.getElementById("levelSelectButton"),
    builderButton: document.getElementById("builderButton"),
    customLevelsButton: document.getElementById("customLevelsButton"),
    resetProgressButton: document.getElementById("resetProgressButton"),
    gameBackButton: document.getElementById("gameBackButton"),
    restartButton: document.getElementById("restartButton"),
    levelGrid: document.getElementById("levelGrid"),
    customLevelList: document.getElementById("customLevelList"),
    customLevelName: document.getElementById("customLevelName"),
    builderMessage: document.getElementById("builderMessage"),
    customMessage: document.getElementById("customMessage"),
    platformSize: document.getElementById("platformSize"),
    testLevelButton: document.getElementById("testLevelButton"),
    saveLevelButton: document.getElementById("saveLevelButton"),
    clearBuilderButton: document.getElementById("clearBuilderButton"),
    importExportText: document.getElementById("importExportText"),
    importJsonButton: document.getElementById("importJsonButton"),
    importFileInput: document.getElementById("importFileInput")
  };

  const sprites = loadSprites(ASSET_SOURCES);
  const BUILT_IN_LEVELS = createBuiltInLevels();
  const storage = createStorage();

  let saveData = loadSaveData();
  let activeScreen = SCREENS.MAIN_MENU;
  let playState = PLAY_STATES.PLAYING;
  let playSource = "builtIn";
  let returnScreen = SCREENS.LEVEL_SELECT;
  let currentLevelIndex = 0;
  let currentLevel = null;
  let player = null;
  let stars = [];
  let movingPlatforms = [];
  let keys = new Set();
  let jumpQueued = false;
  let lastTime = 0;
  let animationTime = 0;
  let renderShadow = null;
  let messageTimer = 0;
  let transitionTimer = 0;

  let builderLevel = createEmptyBuilderLevel();
  let builderTool = "select";
  let builderSelected = null;
  let builderDragging = false;
  let builderEditingId = null;

  bindUi();
  resizeCanvases();
  showScreen(SCREENS.MAIN_MENU);
  requestAnimationFrame(gameLoop);

  function bindUi() {
    ui.playButton.addEventListener("click", () => {
      const levelIndex = clamp(saveData.unlockedLevels - 1, 0, BUILT_IN_LEVELS.length - 1);
      startBuiltInLevel(levelIndex);
    });
    ui.levelSelectButton.addEventListener("click", () => showScreen(SCREENS.LEVEL_SELECT));
    ui.builderButton.addEventListener("click", () => openBuilder());
    ui.customLevelsButton.addEventListener("click", () => showScreen(SCREENS.CUSTOM_LEVELS));
    ui.resetProgressButton.addEventListener("click", resetProgress);
    ui.restartButton.addEventListener("click", restartCurrentLevel);
    ui.gameBackButton.addEventListener("click", leaveGameplay);
    ui.testLevelButton.addEventListener("click", testBuilderLevel);
    ui.saveLevelButton.addEventListener("click", saveBuilderLevel);
    ui.clearBuilderButton.addEventListener("click", () => {
      if (window.confirm("Clear the current builder level?")) {
        builderLevel = createEmptyBuilderLevel();
        builderEditingId = null;
        builderSelected = null;
        ui.customLevelName.value = builderLevel.name;
        setBuilderMessage("Builder cleared.");
        drawBuilder();
      }
    });
    ui.importJsonButton.addEventListener("click", importCustomLevelFromText);
    ui.importFileInput.addEventListener("change", importCustomLevelFromFile);

    document.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => showScreen(button.dataset.screen));
    });

    document.querySelectorAll(".tool-button").forEach((button) => {
      button.addEventListener("click", () => setBuilderTool(button.dataset.tool));
    });

    builderCanvas.addEventListener("mousedown", onBuilderMouseDown);
    builderCanvas.addEventListener("mousemove", onBuilderMouseMove);
    window.addEventListener("mouseup", () => {
      builderDragging = false;
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", (event) => {
      keys.delete(event.code);
      keys.delete(event.key);
    });
    window.addEventListener("blur", () => {
      keys.clear();
      jumpQueued = false;
      builderDragging = false;
    });
  }

  function createStorage() {
    try {
      const local = window.localStorage;
      const testKey = `${SAVE_KEY}:test`;
      local.setItem(testKey, "1");
      local.removeItem(testKey);
      return local;
    } catch (error) {
      const memory = new Map();
      return {
        getItem: (key) => memory.get(key) || null,
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.delete(key)
      };
    }
  }

  function defaultSaveData() {
    return {
      unlockedLevels: 1,
      bestStarsByLevel: {},
      completedLevels: {},
      customLevels: []
    };
  }

  function loadSaveData() {
    try {
      const parsed = JSON.parse(storage.getItem(SAVE_KEY));
      return normalizeSaveData(parsed);
    } catch (error) {
      return defaultSaveData();
    }
  }

  function normalizeSaveData(data) {
    const safe = data && typeof data === "object" ? data : {};
    return {
      unlockedLevels: clamp(Number(safe.unlockedLevels) || 1, 1, BUILT_IN_LEVELS.length),
      bestStarsByLevel: safe.bestStarsByLevel && typeof safe.bestStarsByLevel === "object" ? safe.bestStarsByLevel : {},
      completedLevels: safe.completedLevels && typeof safe.completedLevels === "object" ? safe.completedLevels : {},
      customLevels: Array.isArray(safe.customLevels) ? safe.customLevels.map(normalizeCustomLevel).filter(Boolean) : []
    };
  }

  function saveProgress() {
    storage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  function resetProgress() {
    if (!window.confirm("Clear built-in level progress? Custom levels will stay saved.")) {
      return;
    }

    saveData = {
      ...defaultSaveData(),
      customLevels: saveData.customLevels
    };
    saveProgress();
    renderLevelSelect();
    renderCustomLevels();
    showScreen(SCREENS.MAIN_MENU);
  }

  function createBuiltInLevels() {
    const levels = [
      makeBuiltInLevel({
        id: 1,
        name: "First Shadow",
        hint: "Collect stars with your shadow.",
        playerStart: { x: 94, y: 462 },
        light: { x: 105, y: 340, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(48, 240, 160),
          platform(202, 360, 176),
          platform(34, 475, 166),
          platform(224, 620, 160)
        ],
        starStands: [
          stand(145, 240),
          stand(230, 360),
          stand(70, 475)
        ],
        door: { x: 330, y: 563 },
        hazards: [],
        shadowDangerZones: [],
        movingPlatforms: []
      }),
      makeBuiltInLevel({
        id: 2,
        name: "Angle Change",
        hint: "Use platform height to aim the shadow.",
        playerStart: { x: 70, y: 607 },
        light: { x: 300, y: 260, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(48, 480, 112),
          platform(190, 400, 150),
          platform(252, 270, 112),
          platform(224, 620, 160)
        ],
        starStands: [
          stand(265, 270),
          stand(230, 400),
          stand(95, 480)
        ],
        door: { x: 330, y: 563 }
      }),
      makeBuiltInLevel({
        id: 3,
        name: "Overlight",
        hint: "Keep your shadow out of the bright overlight.",
        playerStart: { x: 72, y: 607 },
        light: { x: 315, y: 250, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 138),
          platform(44, 490, 112),
          platform(190, 410, 150),
          platform(248, 300, 112),
          platform(224, 620, 160)
        ],
        starStands: [
          stand(280, 300),
          stand(235, 410),
          stand(90, 490)
        ],
        door: { x: 330, y: 563 },
        shadowDangerZones: [{ x: 104, y: 575, r: 20 }]
      }),
      makeBuiltInLevel({
        id: 4,
        name: "Vertical Split",
        hint: "Climb to bend the shadow through new angles.",
        playerStart: { x: 75, y: 607 },
        light: { x: 70, y: 240, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(230, 620, 154),
          platform(48, 500, 120),
          platform(215, 410, 140),
          platform(54, 300, 118)
        ],
        starStands: [
          stand(100, 500),
          stand(270, 410),
          stand(110, 300)
        ],
        door: { x: 330, y: 563 }
      }),
      makeBuiltInLevel({
        id: 5,
        name: "Drift",
        hint: "Ride the moving platform, then cast from it.",
        playerStart: { x: 76, y: 607 },
        light: { x: 325, y: 350, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(224, 620, 160),
          platform(52, 460, 110),
          platform(250, 330, 120)
        ],
        movingPlatforms: [
          movingPlatform(150, 535, 120, 12, 95, 0.72)
        ],
        starStands: [
          stand(115, 460),
          stand(205, 535),
          stand(286, 330)
        ],
        door: { x: 330, y: 563 }
      }),
      makeBuiltInLevel({
        id: 6,
        name: "Bright Cut",
        hint: "Moving ground is safe. Overlight is not.",
        playerStart: { x: 76, y: 607 },
        light: { x: 88, y: 245, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(224, 620, 160),
          platform(55, 505, 115),
          platform(230, 410, 130),
          platform(72, 300, 110)
        ],
        movingPlatforms: [
          movingPlatform(145, 560, 110, 12, 85, 0.68)
        ],
        starStands: [
          stand(95, 505),
          stand(270, 410),
          stand(110, 300)
        ],
        door: { x: 330, y: 563 },
        shadowDangerZones: [
          { x: 300, y: 560, r: 20 }
        ]
      }),
      makeBuiltInLevel({
        id: 7,
        name: "Light Below",
        hint: "The light can reverse your instincts.",
        playerStart: { x: 74, y: 607 },
        light: { x: 320, y: 580, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(224, 620, 160),
          platform(46, 480, 130),
          platform(190, 360, 140),
          platform(60, 250, 115)
        ],
        starStands: [
          stand(90, 480),
          stand(240, 360),
          stand(105, 250)
        ],
        door: { x: 330, y: 563 }
      }),
      makeBuiltInLevel({
        id: 8,
        name: "Thin Ledges",
        hint: "Short platforms, clean jumps, precise shadows.",
        playerStart: { x: 78, y: 607 },
        light: { x: 210, y: 310, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(40, 620, 100),
          platform(250, 620, 130),
          platform(55, 500, 82),
          platform(190, 405, 95),
          platform(300, 300, 82)
        ],
        starStands: [
          stand(95, 500),
          stand(225, 405),
          stand(325, 300)
        ],
        door: { x: 330, y: 563 }
      }),
      makeBuiltInLevel({
        id: 9,
        name: "Plan The Cast",
        hint: "Two overlights leave a narrow shadow route.",
        playerStart: { x: 72, y: 607 },
        light: { x: 90, y: 300, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 145),
          platform(224, 620, 160),
          platform(60, 500, 110),
          platform(210, 420, 120),
          platform(90, 310, 100)
        ],
        starStands: [
          stand(105, 500),
          stand(250, 420),
          stand(125, 310)
        ],
        door: { x: 330, y: 563 },
        hazards: [
          { x: 365, y: 380, r: 12 }
        ],
        shadowDangerZones: [
          { x: 20, y: 600, r: 10 }
        ]
      }),
      makeBuiltInLevel({
        id: 10,
        name: "Full Box",
        hint: "Final test: moving ground, overlight, and three casts.",
        playerStart: { x: 72, y: 607 },
        light: { x: 315, y: 255, radius: LIGHT_OUTER_RADIUS },
        platforms: [
          platform(36, 620, 138),
          platform(224, 620, 160),
          platform(44, 490, 112),
          platform(190, 410, 150),
          platform(248, 300, 112)
        ],
        movingPlatforms: [
          movingPlatform(145, 540, 110, 12, 92, 0.7)
        ],
        starStands: [
          stand(280, 300),
          stand(230, 410),
          stand(90, 490)
        ],
        door: { x: 330, y: 563 },
        shadowDangerZones: [
          { x: 106, y: 575, r: 20 },
          { x: 345, y: 455, r: 18 }
        ]
      })
    ];

    return levels.map((level) => normalizeLevel(level));
  }

  function makeBuiltInLevel(config) {
    return normalizeLevel({
      id: config.id,
      name: config.name,
      hint: config.hint,
      playerStart: config.playerStart,
      light: config.light,
      platforms: config.platforms,
      stars: config.starStands.map((point) => starFromStand(config.light, point)),
      door: config.door,
      hazards: config.hazards || [],
      shadowDangerZones: config.shadowDangerZones || [],
      movingPlatforms: config.movingPlatforms || []
    });
  }

  function platform(x, y, width, height = 12) {
    return { x, y, width, height };
  }

  function movingPlatform(x, y, width, height, range, speed) {
    return { x, y, width, height, range, speed, axis: "x" };
  }

  function stand(x, platformY) {
    return { x, y: platformY - TUNING.playerRadius };
  }

  function starFromStand(light, point) {
    const shadow = shadowForPoint(point, light);
    return {
      x: Math.round(clamp(shadow.collectionX, 26, WIDTH - 26)),
      y: Math.round(clamp(shadow.collectionY, 74, HEIGHT - 36)),
      r: 13
    };
  }

  function shadowForPoint(point, light) {
    const dx = point.x - light.x;
    const dy = point.y - light.y;
    const distance = Math.max(Math.hypot(dx, dy), 0.001);
    const dirX = dx / distance;
    const dirY = dy / distance;
    const baseLength = clamp(
      TUNING.shadowLengthBase - distance * TUNING.shadowDistanceScale,
      TUNING.shadowMinLength,
      TUNING.shadowMaxLength
    );
    const length = clamp(
      baseLength * SHADOW_LENGTH_MULTIPLIER,
      TUNING.shadowMinLength,
      TUNING.shadowMaxLength * SHADOW_LENGTH_MULTIPLIER
    );
    const width = clamp(
      TUNING.shadowWidthBase - distance * TUNING.shadowWidthDistanceScale,
      TUNING.shadowMinWidth,
      TUNING.shadowMaxWidth
    );
    const startX = point.x + dirX * TUNING.playerRadius * 0.25;
    const startY = point.y + dirY * TUNING.playerRadius * 0.25;

    return {
      startX,
      startY,
      collectionX: startX + dirX * length * 0.9,
      collectionY: startY + dirY * length * 0.9,
      length,
      width,
      dirX,
      dirY,
      normalX: -dirY,
      normalY: dirX
    };
  }

  function normalizeLevel(level) {
    if (!level || typeof level !== "object") {
      return null;
    }

    return {
      id: level.id || `custom-${Date.now()}`,
      name: String(level.name || "Untitled Level").slice(0, 40),
      hint: String(level.hint || level.message || "Collect stars with your shadow.").slice(0, 120),
      playerStart: point(level.playerStart || { x: 76, y: 607 }),
      light: { ...point(level.light || { x: 105, y: 340 }), radius: Number(level.light?.radius) || LIGHT_OUTER_RADIUS },
      platforms: (level.platforms || []).map(normalizePlatform).filter(Boolean),
      stars: (level.stars || []).slice(0, 3).map((star) => ({ ...point(star), r: Number(star.r) || 13 })).filter(Boolean),
      door: point(level.door || { x: 330, y: 563 }),
      hazards: (level.hazards || []).map(normalizeCircle).filter(Boolean),
      shadowDangerZones: (level.shadowDangerZones || []).map(normalizeCircle).filter(Boolean),
      movingPlatforms: (level.movingPlatforms || []).map(normalizeMovingPlatform).filter(Boolean)
    };
  }

  function normalizeCustomLevel(level) {
    const normalized = normalizeLevel(level);
    if (!normalized || !isLevelStructurallyValid(normalized)) {
      return null;
    }

    normalized.id = String(level.id || `custom-${Date.now()}`);
    return normalized;
  }

  function normalizePlatform(platformData) {
    if (!platformData) {
      return null;
    }

    return {
      x: Number(platformData.x) || 0,
      y: Number(platformData.y) || 0,
      width: Number(platformData.width ?? platformData.w) || 120,
      height: Number(platformData.height ?? platformData.h) || 12
    };
  }

  function normalizeMovingPlatform(platformData) {
    const base = normalizePlatform(platformData);
    if (!base) {
      return null;
    }

    return {
      ...base,
      axis: platformData.axis === "y" ? "y" : "x",
      range: Number(platformData.range) || 80,
      speed: Number(platformData.speed) || 0.7
    };
  }

  function normalizeCircle(circle) {
    if (!circle) {
      return null;
    }

    return {
      ...point(circle),
      r: Number(circle.r) || 18
    };
  }

  function point(value) {
    return {
      x: Number(value?.x) || 0,
      y: Number(value?.y) || 0
    };
  }

  function isLevelStructurallyValid(level) {
    return Boolean(
      level.playerStart &&
      level.light &&
      level.door &&
      level.platforms.length >= 1 &&
      level.stars.length >= 1 &&
      level.stars.length <= 3
    );
  }

  function loadSprites(sources) {
    return Object.fromEntries(
      Object.entries(sources).map(([name, source]) => {
        const image = new Image();
        image.decoding = "async";
        image.src = new URL(source, window.location.href).href;
        image.addEventListener("error", () => {
          console.error(`Could not load sprite: ${source}`);
        });
        return [name, image];
      })
    );
  }

  function drawSprite(context, sprite, x, y, width, height) {
    if (!sprite.complete || sprite.naturalWidth === 0) {
      return;
    }

    context.drawImage(sprite, x, y, width, height);
  }

  function drawCenteredSprite(context, sprite, x, y, width, height) {
    drawSprite(context, sprite, x - width / 2, y - height / 2, width, height);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function showScreen(screenName) {
    activeScreen = screenName;
    Object.entries(screens).forEach(([name, element]) => {
      element.hidden = name !== screenName;
    });

    hideOverlay();

    if (screenName === SCREENS.LEVEL_SELECT) {
      renderLevelSelect();
    }
    if (screenName === SCREENS.CUSTOM_LEVELS) {
      renderCustomLevels();
    }
    if (screenName === SCREENS.LEVEL_BUILDER) {
      drawBuilder();
    }
  }

  function renderLevelSelect() {
    ui.levelGrid.innerHTML = "";

    BUILT_IN_LEVELS.forEach((level, index) => {
      const unlocked = index < saveData.unlockedLevels;
      const completed = Boolean(saveData.completedLevels[level.id]);
      const bestStars = Number(saveData.bestStarsByLevel[level.id]) || 0;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      card.disabled = !unlocked;
      card.classList.toggle("is-locked", !unlocked);
      card.classList.toggle("is-current", unlocked && index === saveData.unlockedLevels - 1 && !completed);
      card.classList.toggle("is-complete", completed);
      card.innerHTML = `
        <div>
          <div class="level-number">${level.id}</div>
          <div class="level-name">${level.name}</div>
        </div>
        <div>
          <div class="star-row">${starDisplay(bestStars)}</div>
          <div class="lock-text">${unlocked ? `${bestStars}/3 stars` : '<span class="lock-icon" aria-hidden="true"></span>Locked'}</div>
        </div>
      `;
      card.addEventListener("click", () => startBuiltInLevel(index));
      ui.levelGrid.appendChild(card);
    });
  }

  function starDisplay(count) {
    return Array.from({ length: 3 }, (_, index) => index < count ? "★" : "☆").join("");
  }

  function startBuiltInLevel(index) {
    if (index >= saveData.unlockedLevels) {
      return;
    }

    playSource = "builtIn";
    returnScreen = SCREENS.LEVEL_SELECT;
    currentLevelIndex = index;
    startLevel(BUILT_IN_LEVELS[index]);
  }

  function startCustomLevel(level, sourceScreen = SCREENS.CUSTOM_LEVELS) {
    playSource = sourceScreen === SCREENS.LEVEL_BUILDER ? "customTest" : "custom";
    returnScreen = sourceScreen;
    currentLevelIndex = -1;
    startLevel(normalizeLevel(level));
  }

  function startLevel(levelData) {
    currentLevel = cloneLevel(levelData);
    resetLevelState();
    showScreen(SCREENS.PLAYING);
  }

  function cloneLevel(levelData) {
    return normalizeLevel(JSON.parse(JSON.stringify(levelData)));
  }

  function resetLevelState() {
    player = {
      x: currentLevel.playerStart.x,
      y: currentLevel.playerStart.y,
      vx: 0,
      vy: 0,
      r: TUNING.playerRadius,
      onGround: false,
      rotation: 0,
      landingPulse: 0,
      facing: 1
    };
    stars = currentLevel.stars.map((star) => ({ ...star, collected: false, collectAnim: 0 }));
    movingPlatforms = currentLevel.movingPlatforms.map((platformData) => ({
      ...platformData,
      baseX: platformData.x,
      baseY: platformData.y,
      prevX: platformData.x,
      prevY: platformData.y,
      dx: 0,
      dy: 0,
      direction: 1
    }));
    playState = PLAY_STATES.PLAYING;
    messageTimer = 0;
    transitionTimer = 0;
    renderShadow = null;
    jumpQueued = false;
    keys.clear();
    hideOverlay();
    setMessage(currentLevel.hint, 150);
    updateHud();
  }

  function restartCurrentLevel() {
    resetLevelState();
  }

  function leaveGameplay() {
    showScreen(returnScreen);
  }

  function updateHud() {
    const levelLabel = playSource === "builtIn" ? `Level: ${currentLevel.id}/10` : "Custom Level";
    hud.textContent = `${levelLabel}  Stars: ${countCollectedStars()}/${stars.length}`;
  }

  function setMessage(text, duration = 0) {
    message.textContent = text;
    message.classList.toggle("is-visible", Boolean(text));
    messageTimer = duration;
  }

  function countCollectedStars() {
    return stars.filter((star) => star.collected).length;
  }

  function hasDoorStars() {
    return countCollectedStars() >= 1;
  }

  function onKeyDown(event) {
    if (keyMatches(event, ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "a", "d", "w"])) {
      event.preventDefault();
    }

    if (activeScreen === SCREENS.PLAYING && keyMatches(event, ["KeyR", "r", "R"])) {
      restartCurrentLevel();
      return;
    }

    if (activeScreen === SCREENS.PLAYING && keyMatches(event, ["Escape"])) {
      leaveGameplay();
      return;
    }

    if (activeScreen === SCREENS.PLAYING && playState === PLAY_STATES.PLAYING && keyMatches(event, ["ArrowUp", "Space", "KeyW", "w"])) {
      jumpQueued = true;
    }

    if (activeScreen === SCREENS.LEVEL_BUILDER && keyMatches(event, ["Backspace", "Delete"])) {
      deleteSelectedBuilderObject();
      return;
    }

    keys.add(event.code);
    keys.add(event.key);
  }

  function keyMatches(event, names) {
    return names.includes(event.code) || names.includes(event.key);
  }

  function isPressed(...names) {
    return names.some((name) => keys.has(name));
  }

  function update(delta) {
    animationTime += delta;
    updateMessageTimer(delta);
    updateStarAnimations(delta);
    updatePlayerAnimation(delta);

    if (activeScreen !== SCREENS.PLAYING) {
      return;
    }

    if (playState === PLAY_STATES.LEVEL_COMPLETE && LEVEL_COMPLETE_DELAY > 0) {
      transitionTimer -= delta;
      if (transitionTimer <= 0) {
        goToNextLevel();
      }
      return;
    }

    if (playState !== PLAY_STATES.PLAYING) {
      return;
    }

    updateMovingPlatforms(delta);
    updatePlayer(delta);

    if (player.y - player.r > HEIGHT + 80) {
      triggerGameOver("You fell.");
      return;
    }

    if (playerTouchesHazard()) {
      triggerGameOver("You touched danger.");
      return;
    }

    const shadow = getShadow();
    if (shadowTouchesDanger(shadow)) {
      triggerGameOver("Your shadow disappeared.");
      return;
    }

    collectStarsWithShadow(shadow);
    checkDoor();
    updateHud();
  }

  function updateMessageTimer(delta) {
    if (messageTimer > 0) {
      messageTimer -= delta;
      if (messageTimer <= 0 && playState === PLAY_STATES.PLAYING) {
        setMessage("");
      }
    }
  }

  function updateStarAnimations(delta) {
    for (const star of stars) {
      if (star.collected && star.collectAnim < 1) {
        star.collectAnim = Math.min(1, star.collectAnim + STAR_COLLECT_SPEED * delta);
      }
    }
  }

  function updatePlayerAnimation(delta) {
    if (!player) {
      return;
    }

    if (player.onGround) {
      const correction = normalizeAngle(-player.rotation);
      player.rotation += correction * Math.min(1, PLAYER_ROTATION_EASE * delta);
      if (Math.abs(correction) < 0.01) {
        player.rotation = 0;
      }
    } else {
      const flipDirection = player.facing || 1;
      player.rotation = normalizeAngle(player.rotation + flipDirection * PLAYER_FLIP_SPEED * delta);
    }

    if (player.landingPulse > 0.001) {
      player.landingPulse *= Math.pow(PLAYER_LANDING_DECAY, delta);
    } else {
      player.landingPulse = 0;
    }
  }

  function updateMovingPlatforms(delta) {
    for (const platformData of movingPlatforms) {
      platformData.prevX = platformData.x;
      platformData.prevY = platformData.y;

      if (platformData.axis === "y") {
        platformData.y += platformData.speed * platformData.direction * delta;
        const offset = platformData.y - platformData.baseY;
        if (Math.abs(offset) > platformData.range) {
          platformData.y = platformData.baseY + Math.sign(offset) * platformData.range;
          platformData.direction *= -1;
        }
      } else {
        platformData.x += platformData.speed * platformData.direction * delta;
        const offset = platformData.x - platformData.baseX;
        if (Math.abs(offset) > platformData.range) {
          platformData.x = platformData.baseX + Math.sign(offset) * platformData.range;
          platformData.direction *= -1;
        }
      }

      platformData.dx = platformData.x - platformData.prevX;
      platformData.dy = platformData.y - platformData.prevY;
    }
  }

  function updatePlayer(delta) {
    const moveDirection =
      (isPressed("ArrowRight", "KeyD", "d") ? 1 : 0) -
      (isPressed("ArrowLeft", "KeyA", "a") ? 1 : 0);
    const previousY = player.y;
    const wasOnGround = player.onGround;

    player.vx = moveDirection * TUNING.moveSpeed;
    if (moveDirection !== 0) {
      player.facing = moveDirection;
    }

    if (jumpQueued && player.onGround) {
      player.vy = -TUNING.jumpStrength;
      player.onGround = false;
    }
    jumpQueued = false;

    player.vy += TUNING.gravity * delta;
    player.x += player.vx * delta;
    player.y += player.vy * delta;
    player.x = clamp(player.x, player.r, WIDTH - player.r);
    player.onGround = false;

    for (const platformData of getAllPlatforms()) {
      const wasAbove = previousY + player.r <= platformData.y;
      const isFallingOntoTop = player.vy >= 0 && player.y + player.r >= platformData.y;
      const overlapsHorizontally =
        player.x + player.r > platformData.x &&
        player.x - player.r < platformData.x + platformData.width;

      if (wasAbove && isFallingOntoTop && overlapsHorizontally) {
        player.y = platformData.y - player.r;
        player.vy = 0;
        player.onGround = true;
        if (platformData.dx) {
          player.x = clamp(player.x + platformData.dx, player.r, WIDTH - player.r);
        }
      }
    }

    if (!wasOnGround && player.onGround) {
      player.landingPulse = 1;
    }
  }

  function getAllPlatforms() {
    return [...currentLevel.platforms, ...movingPlatforms];
  }

  function getShadow() {
    const shadow = shadowForPoint(player, currentLevel.light);
    return {
      ...shadow,
      tipX: shadow.startX + shadow.dirX * shadow.length,
      tipY: shadow.startY + shadow.dirY * shadow.length
    };
  }

  function getSmoothedRenderShadow(shadow) {
    if (!renderShadow) {
      renderShadow = { ...shadow };
      return renderShadow;
    }

    renderShadow.startX = lerp(renderShadow.startX, shadow.startX, SHADOW_SMOOTHING);
    renderShadow.startY = lerp(renderShadow.startY, shadow.startY, SHADOW_SMOOTHING);
    renderShadow.tipX = lerp(renderShadow.tipX, shadow.tipX, SHADOW_SMOOTHING);
    renderShadow.tipY = lerp(renderShadow.tipY, shadow.tipY, SHADOW_SMOOTHING);
    renderShadow.collectionX = lerp(renderShadow.collectionX, shadow.collectionX, SHADOW_SMOOTHING);
    renderShadow.collectionY = lerp(renderShadow.collectionY, shadow.collectionY, SHADOW_SMOOTHING);
    renderShadow.width = lerp(renderShadow.width, shadow.width, SHADOW_SMOOTHING);

    const dx = renderShadow.tipX - renderShadow.startX;
    const dy = renderShadow.tipY - renderShadow.startY;
    renderShadow.length = Math.max(Math.hypot(dx, dy), 0.001);
    renderShadow.dirX = dx / renderShadow.length;
    renderShadow.dirY = dy / renderShadow.length;
    renderShadow.normalX = -renderShadow.dirY;
    renderShadow.normalY = renderShadow.dirX;
    return renderShadow;
  }

  function playerTouchesHazard() {
    return currentLevel.hazards.some((hazard) => {
      return Math.hypot(player.x - hazard.x, player.y - hazard.y) <= player.r + hazard.r;
    });
  }

  function shadowTouchesDanger(shadow) {
    return currentLevel.shadowDangerZones.some((zone) => {
      return circleTouchesShadow(zone, shadow, 0.04, false);
    });
  }

  function collectStarsWithShadow(shadow) {
    for (const star of stars) {
      if (star.collected) {
        continue;
      }

      if (circleTouchesShadow(star, shadow, TUNING.shadowCollectionStart, true)) {
        star.collected = true;
        star.collectAnim = 0;
        setMessage(hasDoorStars() ? "The door is open." : "Shadow star collected.", 72);
      }
    }
  }

  function circleTouchesShadow(circle, shadow, minProjected, includeTipCollector) {
    const toCircleX = circle.x - shadow.startX;
    const toCircleY = circle.y - shadow.startY;
    const projected = (toCircleX * shadow.dirX + toCircleY * shadow.dirY) / shadow.length;

    if (projected < minProjected || projected > 1.08) {
      return false;
    }

    const t = clamp(projected, 0, 1);
    const closestX = shadow.startX + shadow.dirX * shadow.length * t;
    const closestY = shadow.startY + shadow.dirY * shadow.length * t;
    const distanceToShape = Math.hypot(circle.x - closestX, circle.y - closestY);
    const localHalfWidth = Math.max(7, shadow.width * 0.5 * (1 - t * 0.68));
    const shapeHit = distanceToShape <= localHalfWidth + circle.r;

    if (!includeTipCollector) {
      return shapeHit;
    }

    const distanceToTipCollector = Math.hypot(circle.x - shadow.collectionX, circle.y - shadow.collectionY);
    return shapeHit || distanceToTipCollector <= TUNING.shadowCollectionRadius + circle.r;
  }

  function checkDoor() {
    if (!circleRectCollision(player, getDoorRect())) {
      return;
    }

    if (hasDoorStars()) {
      completeLevel();
    } else if (messageTimer <= 0) {
      setMessage("Collect at least 1 star with your shadow.", 110);
    }
  }

  function getDoorRect() {
    const closed = { x: currentLevel.door.x, y: currentLevel.door.y, width: 38, height: 57 };
    const open = { x: currentLevel.door.x - 12, y: currentLevel.door.y - 7, width: 62, height: 64 };
    return hasDoorStars() ? open : closed;
  }

  function circleRectCollision(circle, rect) {
    const nearestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const nearestY = clamp(circle.y, rect.y, rect.y + rect.height);
    return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= circle.r;
  }

  function completeLevel() {
    const earnedStars = countCollectedStars();
    playState = currentLevelIndex === BUILT_IN_LEVELS.length - 1 && playSource === "builtIn"
      ? PLAY_STATES.FINAL_WIN
      : PLAY_STATES.LEVEL_COMPLETE;
    player.vx = 0;
    player.vy = 0;
    keys.clear();

    if (playSource === "builtIn") {
      const levelId = currentLevel.id;
      saveData.completedLevels[levelId] = true;
      saveData.bestStarsByLevel[levelId] = Math.max(Number(saveData.bestStarsByLevel[levelId]) || 0, earnedStars);
      saveData.unlockedLevels = clamp(Math.max(saveData.unlockedLevels, currentLevelIndex + 2), 1, BUILT_IN_LEVELS.length);
      saveProgress();
    }

    if (playState === PLAY_STATES.FINAL_WIN) {
      showGameplayOverlay({
        kicker: "Complete",
        title: "You completed Shadow Box!",
        reason: `${earnedStars}/${stars.length} stars collected.`,
        prompt: "Press R to replay Level 10",
        actions: [
          { label: "Replay", onClick: restartCurrentLevel },
          { label: "Level Select", onClick: () => showScreen(SCREENS.LEVEL_SELECT) },
          { label: "Main Menu", onClick: () => showScreen(SCREENS.MAIN_MENU) }
        ]
      });
      return;
    }

    showGameplayOverlay({
      kicker: currentLevel.name,
      title: "Level Complete",
      reason: `${earnedStars}/${stars.length} stars collected.`,
      prompt: "Choose your next step",
      actions: [
        { label: playSource === "builtIn" ? "Next Level" : "Play Again", onClick: playSource === "builtIn" ? goToNextLevel : restartCurrentLevel },
        { label: "Retry", onClick: restartCurrentLevel },
        { label: playSource === "builtIn" ? "Level Select" : "Custom Levels", onClick: () => showScreen(returnScreen) }
      ]
    });
  }

  function goToNextLevel() {
    if (playSource === "builtIn" && currentLevelIndex < BUILT_IN_LEVELS.length - 1) {
      startBuiltInLevel(currentLevelIndex + 1);
    }
  }

  function triggerGameOver(reason) {
    playState = PLAY_STATES.GAME_OVER;
    player.vx = 0;
    player.vy = 0;
    jumpQueued = false;
    keys.clear();
    setMessage(reason);
    showGameplayOverlay({
      kicker: currentLevel.name,
      title: "Game Over",
      reason,
      prompt: "Press R to try again",
      actions: [
        { label: "Try Again", onClick: restartCurrentLevel },
        { label: playSource === "builtIn" ? "Level Select" : "Custom Levels", onClick: () => showScreen(returnScreen) }
      ]
    });
  }

  function showGameplayOverlay({ kicker, title, reason, prompt, actions }) {
    overlay.classList.toggle("is-success", title !== "Game Over");
    overlay.classList.toggle("is-failure", title === "Game Over");
    overlayBadge.textContent = title === "Game Over" ? "!" : "★";
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayReason.textContent = reason;
    overlayPrompt.textContent = prompt;
    overlayActions.innerHTML = "";
    actions.forEach((action, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      decorateUiButton(button, action.label);
      if (index === 0) {
        button.classList.add("primary-button");
      }
      button.addEventListener("click", action.onClick);
      overlayActions.appendChild(button);
    });
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
    overlayActions.innerHTML = "";
  }

  function gameLoop(time) {
    const delta = Math.min((time - lastTime) / 16.67 || 1, 2);
    lastTime = time;

    update(delta);
    drawGame();
    if (activeScreen === SCREENS.LEVEL_BUILDER) {
      drawBuilder();
    }
    requestAnimationFrame(gameLoop);
  }

  function drawGame() {
    if (!currentLevel) {
      return;
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawLevelBackground(ctx, currentLevel);
    const shadow = getShadow();
    const visibleShadow = getSmoothedRenderShadow(shadow);
    drawProjectedShadow(ctx, visibleShadow);
    drawPlatforms(ctx, getAllPlatforms());
    drawHazards(ctx, currentLevel.hazards, "hazard");
    drawHazards(ctx, currentLevel.shadowDangerZones, "shadow");
    drawStars(ctx, stars);
    drawDoor(ctx);
    if (DEBUG_SHADOW_HITBOX) {
      drawShadowDebug(ctx, shadow);
    }
    drawPlayer(ctx);
  }

  function drawLevelBackground(context, level) {
    context.fillStyle = "#000";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.fillStyle = "rgba(255, 255, 255, 0.014)";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    const light = level.light;
    const lightPulse = 1 + Math.sin(animationTime * LIGHT_BREATHE_SPEED) * LIGHT_BREATHE_AMOUNT;
    const lightIntensity = LIGHT_INTENSITY * lightPulse;
    const outerGlow = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, LIGHT_OUTER_RADIUS);
    outerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.18 * lightIntensity})`);
    outerGlow.addColorStop(0.42, `rgba(255, 255, 255, ${0.1 * lightIntensity})`);
    outerGlow.addColorStop(0.74, `rgba(245, 250, 255, ${0.04 * lightIntensity})`);
    outerGlow.addColorStop(0.94, `rgba(245, 250, 255, ${0.018 * lightIntensity})`);
    outerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = outerGlow;
    context.beginPath();
    context.arc(light.x, light.y, LIGHT_OUTER_RADIUS, 0, Math.PI * 2);
    context.fill();

    const glow = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, LIGHT_GLOW_RADIUS);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.48 * lightIntensity})`);
    glow.addColorStop(0.2, `rgba(255, 255, 255, ${0.28 * lightIntensity})`);
    glow.addColorStop(0.55, `rgba(250, 252, 255, ${0.12 * lightIntensity})`);
    glow.addColorStop(0.84, `rgba(245, 250, 255, ${0.035 * lightIntensity})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(light.x, light.y, LIGHT_GLOW_RADIUS, 0, Math.PI * 2);
    context.fill();

    const core = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, LIGHT_CORE_RADIUS);
    core.addColorStop(0, `rgba(255, 255, 255, ${0.72 * lightIntensity})`);
    core.addColorStop(0.45, `rgba(255, 255, 255, ${0.34 * lightIntensity})`);
    core.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(light.x, light.y, LIGHT_CORE_RADIUS, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.shadowColor = "rgba(255, 255, 255, 0.95)";
    context.shadowBlur = 24 + lightPulse * 4;
    drawCenteredSprite(context, sprites.light, light.x, light.y, TUNING.lightSpriteSize, TUNING.lightSpriteSize);
    context.restore();
  }

  function drawPlatforms(context, platforms) {
    for (const platformData of platforms) {
      context.save();
      context.shadowColor = "rgba(55, 175, 255, 0.64)";
      context.shadowBlur = PLATFORM_GLOW_BLUR;
      context.fillStyle = PLATFORM_COLOR;
      roundedRectPath(context, platformData.x, platformData.y, platformData.width, platformData.height, PLATFORM_RADIUS);
      context.fill();

      context.shadowBlur = 0;
      context.fillStyle = PLATFORM_HIGHLIGHT;
      roundedRectPath(context, platformData.x + 2, platformData.y + 2, platformData.width - 4, 2, 1);
      context.fill();
      context.restore();
    }
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawProjectedShadow(context, shadow) {
    context.save();
    context.filter = `blur(${SHADOW_BLUR}px)`;
    context.fillStyle = `rgba(0, 0, 0, ${SHADOW_OPACITY * 0.36})`;
    fillShadowPath(context, shadow, 1.34);
    context.restore();

    context.save();
    context.filter = `blur(${Math.max(2, SHADOW_BLUR * 0.3)}px)`;
    context.fillStyle = `rgba(0, 0, 0, ${SHADOW_OPACITY})`;
    fillShadowPath(context, shadow, 1);
    context.restore();
  }

  function fillShadowPath(context, shadow, scale) {
    const startHalf = shadow.width * 0.42 * scale;
    const midHalf = shadow.width * 0.58 * scale;
    const tipHalf = Math.max(7, shadow.width * 0.16 * scale);
    const tipRound = Math.max(10, shadow.width * 0.22 * scale);
    const leftStartX = shadow.startX - shadow.normalX * startHalf;
    const leftStartY = shadow.startY - shadow.normalY * startHalf;
    const rightStartX = shadow.startX + shadow.normalX * startHalf;
    const rightStartY = shadow.startY + shadow.normalY * startHalf;
    const leftTipX = shadow.startX + shadow.dirX * shadow.length - shadow.normalX * tipHalf;
    const leftTipY = shadow.startY + shadow.dirY * shadow.length - shadow.normalY * tipHalf;
    const rightTipX = shadow.startX + shadow.dirX * shadow.length + shadow.normalX * tipHalf;
    const rightTipY = shadow.startY + shadow.dirY * shadow.length + shadow.normalY * tipHalf;
    const controlNearX = shadow.startX + shadow.dirX * shadow.length * 0.34;
    const controlNearY = shadow.startY + shadow.dirY * shadow.length * 0.34;
    const controlFarX = shadow.startX + shadow.dirX * shadow.length * 0.78;
    const controlFarY = shadow.startY + shadow.dirY * shadow.length * 0.78;
    const tipX = shadow.startX + shadow.dirX * shadow.length;
    const tipY = shadow.startY + shadow.dirY * shadow.length;

    context.beginPath();
    context.moveTo(leftStartX, leftStartY);
    context.bezierCurveTo(
      controlNearX - shadow.normalX * midHalf,
      controlNearY - shadow.normalY * midHalf,
      controlFarX - shadow.normalX * tipHalf,
      controlFarY - shadow.normalY * tipHalf,
      leftTipX,
      leftTipY
    );
    context.quadraticCurveTo(
      tipX + shadow.dirX * tipRound,
      tipY + shadow.dirY * tipRound,
      rightTipX,
      rightTipY
    );
    context.bezierCurveTo(
      controlFarX + shadow.normalX * tipHalf,
      controlFarY + shadow.normalY * tipHalf,
      controlNearX + shadow.normalX * midHalf,
      controlNearY + shadow.normalY * midHalf,
      rightStartX,
      rightStartY
    );
    context.quadraticCurveTo(
      shadow.startX - shadow.dirX * 3,
      shadow.startY - shadow.dirY * 3,
      leftStartX,
      leftStartY
    );
    context.closePath();
    context.fill();
  }

  function drawHazards(context, zones, type) {
    for (const zone of zones) {
      const isShadowDanger = type === "shadow";
      const radius = zone.r * (isShadowDanger ? 2.8 : 2.05);
      const glow = context.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
      glow.addColorStop(0, isShadowDanger ? "rgba(255, 255, 255, 0.32)" : "rgba(255, 65, 100, 0.42)");
      glow.addColorStop(0.52, isShadowDanger ? "rgba(125, 216, 255, 0.12)" : "rgba(150, 10, 32, 0.18)");
      glow.addColorStop(1, isShadowDanger ? "rgba(255, 255, 255, 0)" : "rgba(150, 10, 32, 0)");

      context.save();
      context.fillStyle = glow;
      context.beginPath();
      context.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
      context.fill();

      if (isShadowDanger) {
        drawShadowDanger(context, zone);
      } else {
        const size = zone.r * 1.75;
        const rotation = animationTime * STAR_ROTATION_SPEED + zone.x * 0.008;
        context.globalAlpha = 1;
        context.shadowColor = "rgba(255, 85, 0, 0.42)";
        context.shadowBlur = 14;
        context.translate(zone.x, zone.y);
        context.rotate(rotation);
        drawSprite(context, sprites.hazard, -size / 2, -size / 2, size, size);
      }
      context.restore();
    }
  }

  function drawShadowDanger(context, zone) {
    const rotation = -animationTime * STAR_ROTATION_SPEED * 0.85 + zone.y * 0.01;
    const size = zone.r * 1.45;

    context.save();
    context.translate(zone.x, zone.y);
    context.rotate(rotation);
    context.shadowColor = "rgba(255, 255, 255, 0.5)";
    context.shadowBlur = 10;
    context.strokeStyle = "rgba(255, 255, 255, 0.86)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, size * 0.58, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = "rgba(125, 216, 255, 0.58)";
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(-size * 0.42, -size * 0.42);
    context.lineTo(size * 0.42, size * 0.42);
    context.moveTo(size * 0.42, -size * 0.42);
    context.lineTo(-size * 0.42, size * 0.42);
    context.stroke();
    context.restore();
  }

  function drawStars(context, starList) {
    for (const star of starList) {
      const collectAnim = star.collectAnim || 0;
      if (star.collected && collectAnim >= 1) {
        continue;
      }

      const pulse = (Math.sin(animationTime * STAR_PULSE_SPEED + star.x * 0.03) + 1) / 2;
      const collecting = star.collected ? collectAnim : 0;
      const size = TUNING.starSpriteSize * (1 + pulse * 0.045 + collecting * 0.45);
      const alpha = star.collected ? 1 - collecting : 1;
      const rotation = animationTime * STAR_ROTATION_SPEED + star.x * 0.004 + collecting * 1.2;

      context.save();
      context.globalAlpha = alpha;
      context.translate(star.x, star.y);
      context.rotate(rotation);
      context.shadowColor = `rgba(255, 230, 86, ${0.64 + pulse * 0.24})`;
      context.shadowBlur = STAR_GLOW_BASE + pulse * STAR_GLOW_PULSE + collecting * 8;
      drawSprite(context, sprites.star, -size / 2, -size / 2, size, size);
      context.restore();
    }
  }

  function drawPlayer(context) {
    const pulse = player.landingPulse || 0;
    const scaleX = 1 + pulse * PLAYER_LANDING_SQUASH;
    const scaleY = 1 - pulse * PLAYER_LANDING_SQUASH;
    const size = TUNING.playerSpriteSize;

    context.save();
    context.translate(player.x, player.y);
    context.rotate(player.rotation || 0);
    context.scale(scaleX, scaleY);
    context.shadowColor = "rgba(255, 255, 255, 0.34)";
    context.shadowBlur = 7;
    drawSprite(context, sprites.player, -size / 2, -size / 2, size, size);
    context.restore();
  }

  function drawDoor(context) {
    const open = hasDoorStars();
    const door = getDoorRect();
    const sprite = open ? sprites.doorOpen : sprites.doorClosed;
    context.save();
    context.shadowColor = open ? "rgba(195, 90, 255, 0.95)" : "rgba(116, 60, 210, 0.4)";
    context.shadowBlur = open ? 24 : 10;
    drawSprite(context, sprite, door.x, door.y, door.width, door.height);
    context.restore();
  }

  function drawShadowDebug(context, shadow) {
    context.save();
    context.strokeStyle = "rgba(255, 180, 60, 0.8)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(shadow.collectionX, shadow.collectionY, TUNING.shadowCollectionRadius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function resizeCanvases() {
    setupCanvas(canvas, ctx);
    setupCanvas(builderCanvas, builderCtx);
  }

  function setupCanvas(targetCanvas, context) {
    const dpr = window.devicePixelRatio || 1;
    targetCanvas.width = WIDTH * dpr;
    targetCanvas.height = HEIGHT * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function openBuilder(levelToEdit = null) {
    if (levelToEdit) {
      builderLevel = cloneLevel(levelToEdit);
      builderEditingId = levelToEdit.id;
    } else if (!builderEditingId) {
      builderLevel = createEmptyBuilderLevel();
    }

    ui.customLevelName.value = builderLevel.name;
    builderSelected = null;
    setBuilderTool("select");
    setBuilderMessage("Select a tool, then click the canvas.");
    showScreen(SCREENS.LEVEL_BUILDER);
  }

  function createEmptyBuilderLevel() {
    return {
      id: `custom-${Date.now()}`,
      name: "My Level",
      hint: "Custom level.",
      playerStart: null,
      light: null,
      platforms: [],
      stars: [],
      door: null,
      hazards: [],
      shadowDangerZones: [],
      movingPlatforms: []
    };
  }

  function setBuilderTool(tool) {
    builderTool = tool;
    document.querySelectorAll(".tool-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tool === tool);
    });
  }

  function getCanvasPoint(event, targetCanvas) {
    const rect = targetCanvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * (WIDTH / rect.width), 0, WIDTH),
      y: clamp((event.clientY - rect.top) * (HEIGHT / rect.height), 0, HEIGHT)
    };
  }

  function onBuilderMouseDown(event) {
    const pointData = getCanvasPoint(event, builderCanvas);

    if (builderTool === "select") {
      builderSelected = findBuilderObject(pointData);
      builderDragging = Boolean(builderSelected);
      drawBuilder();
      return;
    }

    if (builderTool === "delete") {
      builderSelected = findBuilderObject(pointData);
      deleteSelectedBuilderObject();
      return;
    }

    placeBuilderObject(pointData);
    builderDragging = true;
    drawBuilder();
  }

  function onBuilderMouseMove(event) {
    if (!builderDragging || !builderSelected) {
      return;
    }

    const pointData = getCanvasPoint(event, builderCanvas);
    moveBuilderObject(builderSelected, pointData);
    drawBuilder();
  }

  function placeBuilderObject(pointData) {
    if (builderTool === "playerStart") {
      builderLevel.playerStart = pointData;
      builderSelected = { type: "playerStart" };
    } else if (builderTool === "light") {
      builderLevel.light = { ...pointData, radius: LIGHT_OUTER_RADIUS };
      builderSelected = { type: "light" };
    } else if (builderTool === "door") {
      builderLevel.door = { x: pointData.x - 19, y: pointData.y - 57 };
      builderSelected = { type: "door" };
    } else if (builderTool === "star") {
      if (builderLevel.stars.length >= 3) {
        setBuilderMessage("Custom levels can have at most 3 stars.");
        return;
      }
      builderLevel.stars.push({ ...pointData, r: 13 });
      builderSelected = { type: "stars", index: builderLevel.stars.length - 1 };
    } else if (builderTool === "platform") {
      const size = platformPreset(ui.platformSize.value);
      builderLevel.platforms.push({ x: pointData.x - size.width / 2, y: pointData.y, ...size });
      builderSelected = { type: "platforms", index: builderLevel.platforms.length - 1 };
    } else if (builderTool === "movingPlatform") {
      builderLevel.movingPlatforms.push({ x: pointData.x - 55, y: pointData.y, width: 110, height: 12, range: 80, speed: 0.7, axis: "x" });
      builderSelected = { type: "movingPlatforms", index: builderLevel.movingPlatforms.length - 1 };
    } else if (builderTool === "hazard") {
      builderLevel.hazards.push({ ...pointData, r: 18 });
      builderSelected = { type: "hazards", index: builderLevel.hazards.length - 1 };
    } else if (builderTool === "shadowDanger") {
      builderLevel.shadowDangerZones.push({ ...pointData, r: 20 });
      builderSelected = { type: "shadowDangerZones", index: builderLevel.shadowDangerZones.length - 1 };
    }
  }

  function platformPreset(size) {
    if (size === "small") {
      return { width: 88, height: 12 };
    }
    if (size === "large") {
      return { width: 180, height: 12 };
    }
    return { width: 130, height: 12 };
  }

  function findBuilderObject(pointData) {
    const collections = ["stars", "hazards", "shadowDangerZones"];
    for (const type of collections) {
      for (let index = builderLevel[type].length - 1; index >= 0; index -= 1) {
        const item = builderLevel[type][index];
        if (Math.hypot(pointData.x - item.x, pointData.y - item.y) <= item.r + 10) {
          return { type, index };
        }
      }
    }

    for (const type of ["movingPlatforms", "platforms"]) {
      for (let index = builderLevel[type].length - 1; index >= 0; index -= 1) {
        const item = builderLevel[type][index];
        if (pointData.x >= item.x && pointData.x <= item.x + item.width && pointData.y >= item.y - 8 && pointData.y <= item.y + item.height + 8) {
          return { type, index };
        }
      }
    }

    if (builderLevel.door && pointData.x >= builderLevel.door.x && pointData.x <= builderLevel.door.x + 38 && pointData.y >= builderLevel.door.y && pointData.y <= builderLevel.door.y + 57) {
      return { type: "door" };
    }
    if (builderLevel.playerStart && Math.hypot(pointData.x - builderLevel.playerStart.x, pointData.y - builderLevel.playerStart.y) <= 18) {
      return { type: "playerStart" };
    }
    if (builderLevel.light && Math.hypot(pointData.x - builderLevel.light.x, pointData.y - builderLevel.light.y) <= 22) {
      return { type: "light" };
    }

    return null;
  }

  function moveBuilderObject(selection, pointData) {
    if (selection.type === "playerStart") {
      builderLevel.playerStart = pointData;
    } else if (selection.type === "light") {
      builderLevel.light = { ...pointData, radius: LIGHT_OUTER_RADIUS };
    } else if (selection.type === "door") {
      builderLevel.door = { x: pointData.x - 19, y: pointData.y - 57 };
    } else {
      const item = builderLevel[selection.type][selection.index];
      if (!item) {
        return;
      }
      if (selection.type === "platforms" || selection.type === "movingPlatforms") {
        item.x = pointData.x - item.width / 2;
        item.y = pointData.y;
      } else {
        item.x = pointData.x;
        item.y = pointData.y;
      }
    }
  }

  function deleteSelectedBuilderObject() {
    if (!builderSelected) {
      return;
    }

    if (builderSelected.type === "playerStart" || builderSelected.type === "light" || builderSelected.type === "door") {
      builderLevel[builderSelected.type] = null;
    } else {
      builderLevel[builderSelected.type].splice(builderSelected.index, 1);
    }

    builderSelected = null;
    setBuilderMessage("Deleted.");
    drawBuilder();
  }

  function validateBuilderLevel(level) {
    if (!level.playerStart) return "Place a player start.";
    if (!level.light) return "Place a light source.";
    if (!level.door) return "Place a door.";
    if (level.platforms.length + level.movingPlatforms.length < 1) return "Add at least one platform.";
    if (level.stars.length < 1 || level.stars.length > 3) return "Add 1 to 3 stars.";
    return "";
  }

  function buildLevelFromBuilder() {
    return normalizeLevel({
      ...builderLevel,
      id: builderEditingId || builderLevel.id || `custom-${Date.now()}`,
      name: ui.customLevelName.value.trim() || "My Level",
      hint: "Custom level."
    });
  }

  function testBuilderLevel() {
    const level = buildLevelFromBuilder();
    const error = validateBuilderLevel(level);
    if (error) {
      setBuilderMessage(error);
      return;
    }

    startCustomLevel(level, SCREENS.LEVEL_BUILDER);
  }

  function saveBuilderLevel() {
    const level = buildLevelFromBuilder();
    const error = validateBuilderLevel(level);
    if (error) {
      setBuilderMessage(error);
      return;
    }

    const existingIndex = saveData.customLevels.findIndex((custom) => custom.id === level.id);
    if (existingIndex >= 0) {
      saveData.customLevels[existingIndex] = level;
    } else {
      level.id = `custom-${Date.now()}`;
      saveData.customLevels.push(level);
      builderEditingId = level.id;
      builderLevel.id = level.id;
    }

    saveProgress();
    setBuilderMessage("Level saved.");
  }

  function setBuilderMessage(text) {
    ui.builderMessage.textContent = text;
  }

  function drawBuilder() {
    builderCtx.clearRect(0, 0, WIDTH, HEIGHT);
    const previewLevel = normalizeLevel({
      ...builderLevel,
      light: builderLevel.light || { x: 105, y: 340, radius: LIGHT_OUTER_RADIUS },
      playerStart: builderLevel.playerStart || { x: 75, y: 607 },
      door: builderLevel.door || { x: 330, y: 563 },
      stars: builderLevel.stars,
      platforms: builderLevel.platforms
    });
    drawLevelBackground(builderCtx, previewLevel);
    drawBuilderGrid();
    drawPlatforms(builderCtx, [...builderLevel.platforms, ...builderLevel.movingPlatforms]);
    drawHazards(builderCtx, builderLevel.hazards, "hazard");
    drawHazards(builderCtx, builderLevel.shadowDangerZones, "shadow");
    drawStars(builderCtx, builderLevel.stars);
    if (builderLevel.door) {
      drawSprite(builderCtx, sprites.doorClosed, builderLevel.door.x, builderLevel.door.y, 38, 57);
    }
    if (builderLevel.playerStart) {
      drawCenteredSprite(builderCtx, sprites.player, builderLevel.playerStart.x, builderLevel.playerStart.y, TUNING.playerSpriteSize, TUNING.playerSpriteSize);
    }
    drawBuilderSelection();
  }

  function drawBuilderGrid() {
    builderCtx.save();
    builderCtx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    builderCtx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 35) {
      builderCtx.beginPath();
      builderCtx.moveTo(x, 0);
      builderCtx.lineTo(x, HEIGHT);
      builderCtx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += 35) {
      builderCtx.beginPath();
      builderCtx.moveTo(0, y);
      builderCtx.lineTo(WIDTH, y);
      builderCtx.stroke();
    }
    builderCtx.restore();
  }

  function drawBuilderSelection() {
    if (!builderSelected) {
      return;
    }

    const box = selectionBounds(builderSelected);
    if (!box) {
      return;
    }

    builderCtx.save();
    builderCtx.setLineDash([5, 5]);
    builderCtx.strokeStyle = "rgba(120, 215, 255, 0.95)";
    builderCtx.lineWidth = 1;
    builderCtx.strokeRect(box.x, box.y, box.width, box.height);
    builderCtx.restore();
  }

  function selectionBounds(selection) {
    if (selection.type === "playerStart" && builderLevel.playerStart) {
      return { x: builderLevel.playerStart.x - 16, y: builderLevel.playerStart.y - 16, width: 32, height: 32 };
    }
    if (selection.type === "light" && builderLevel.light) {
      return { x: builderLevel.light.x - 18, y: builderLevel.light.y - 18, width: 36, height: 36 };
    }
    if (selection.type === "door" && builderLevel.door) {
      return { x: builderLevel.door.x, y: builderLevel.door.y, width: 38, height: 57 };
    }

    const item = builderLevel[selection.type]?.[selection.index];
    if (!item) {
      return null;
    }
    if (selection.type === "platforms" || selection.type === "movingPlatforms") {
      return { x: item.x, y: item.y, width: item.width, height: item.height };
    }
    return { x: item.x - item.r, y: item.y - item.r, width: item.r * 2, height: item.r * 2 };
  }

  function renderCustomLevels() {
    ui.customLevelList.innerHTML = "";

    if (saveData.customLevels.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No custom levels yet. Create one in Level Builder.";
      ui.customLevelList.appendChild(empty);
      return;
    }

    saveData.customLevels.forEach((level) => {
      const card = document.createElement("article");
      card.className = "custom-card";
      card.innerHTML = `
        <h3>${escapeHtml(level.name)}</h3>
        <p>${level.stars.length} star${level.stars.length === 1 ? "" : "s"} · ${level.platforms.length + level.movingPlatforms.length} platform${level.platforms.length + level.movingPlatforms.length === 1 ? "" : "s"}</p>
        <div class="card-actions"></div>
      `;
      const actions = card.querySelector(".card-actions");
      addCardButton(actions, "Play", () => startCustomLevel(level, SCREENS.CUSTOM_LEVELS));
      addCardButton(actions, "Edit", () => openBuilder(level));
      addCardButton(actions, "Delete", () => deleteCustomLevel(level.id));
      addCardButton(actions, "Export", () => exportCustomLevel(level));
      ui.customLevelList.appendChild(card);
    });
  }

  function addCardButton(parent, label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    decorateUiButton(button, label);
    button.addEventListener("click", onClick);
    parent.appendChild(button);
  }

  function decorateUiButton(button, label) {
    const normalized = label.toLowerCase();
    if (normalized.includes("play")) {
      button.classList.add("icon-play");
    }
    if (normalized.includes("again") || normalized.includes("restart") || normalized.includes("reset") || normalized.includes("try")) {
      button.classList.add("icon-again");
    }
    if (normalized.includes("builder") || normalized.includes("edit")) {
      button.classList.add("icon-gear");
    }
    if (normalized.includes("delete")) {
      button.classList.add("danger-text-button");
    }
  }

  function deleteCustomLevel(id) {
    if (!window.confirm("Delete this custom level?")) {
      return;
    }

    saveData.customLevels = saveData.customLevels.filter((level) => level.id !== id);
    saveProgress();
    renderCustomLevels();
    setCustomMessage("Custom level deleted.");
  }

  async function exportCustomLevel(level) {
    const json = JSON.stringify(level, null, 2);
    ui.importExportText.value = json;
    try {
      await navigator.clipboard.writeText(json);
      setCustomMessage("Export copied to clipboard.");
    } catch (error) {
      setCustomMessage("Export JSON is ready to copy.");
    }
  }

  function importCustomLevelFromText() {
    try {
      const parsed = JSON.parse(ui.importExportText.value);
      addImportedCustomLevel(parsed);
    } catch (error) {
      setCustomMessage("Invalid JSON.");
    }
  }

  function importCustomLevelFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        addImportedCustomLevel(JSON.parse(String(reader.result)));
      } catch (error) {
        setCustomMessage("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function addImportedCustomLevel(parsed) {
    const level = normalizeCustomLevel(parsed);
    if (!level) {
      setCustomMessage("JSON is not a valid Shadow Box level.");
      return;
    }

    level.id = `custom-${Date.now()}`;
    saveData.customLevels.push(level);
    saveProgress();
    renderCustomLevels();
    setCustomMessage("Custom level imported.");
  }

  function setCustomMessage(text) {
    ui.customMessage.textContent = text;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
