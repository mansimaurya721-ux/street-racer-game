import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

/* =========================================================
   ASSETS
========================================================= */

const ENEMY_IMAGES = [
  "/images/enemycar1.png",
  "/images/enemycar2.png",
  "/images/enemycar3.png",
  "/images/enemycar4.png",
];

const PLAYER_IMAGE = "/images/mycar.png";

const MUSIC_SRC = "/alex-morgan-gaming-rock-545508.mp3";
const CRASH_SOUND_SRC = "/fahhhhh.mp3";

/* =========================================================
   CONSTANTS
========================================================= */

const BASE_SPEED = 190;
const MAX_SPEED = 520;

const BOOST_MULTIPLIER = 1.7;
const BRAKE_MULTIPLIER = 0.5;

const BEST_KEY = "streetRacerBest";
const MUTED_KEY = "streetRacerMuted";

const FUEL_MAX = 100;
const FUEL_DRAIN = 42;
const FUEL_REGEN = 16;
const MIN_BOOST_FUEL = 6;

const COMBO_WINDOW_MS = 1100;
const COMBO_MAX = 12;

/* =========================================================
   HELPERS
========================================================= */

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const random = (min, max) =>
  Math.random() * (max - min) + min;

const distance = (a, b) =>
  Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );

/* =========================================================
   COMPONENT
========================================================= */

export default function App() {
  const gameRef = useRef(null);
  const playerRef = useRef(null);

  const musicRef = useRef(null);
  const crashAudioRef = useRef(null);

  const animationRef = useRef(null);
  const lastFrameRef = useRef(0);
  const hudTimerRef = useRef(0);

  /*
    DOM refs keyed by object id.
    These let the game loop write transform/style
    directly to the DOM every single frame.
  */
  const enemyRefs = useRef(new Map());
  const coinRefs = useRef(new Map());
  const letterRefs = useRef(new Map());

  const game = useRef({
    running: false,
    paused: false,
    crashed: false,

    score: 0,
    distance: 0,
    speed: BASE_SPEED,

    playerX: 50,
    targetX: 50,

    enemies: [],
    coins: [],
    letters: [],

    enemyId: 0,
    coinId: 0,
    letterId: 0,

    enemyTimer: 0,
    coinTimer: 0,
    letterTimer: 0,

    roadWidth: 0,
    gameWidth: 0,
    gameHeight: 0,

    fuel: FUEL_MAX,
    boosting: false,
    braking: false,

    combo: 0,
    lastCollectTime: 0,

    level: 1,

    word: "RACE",
    collectedLetters: [],

    lastHudUpdate: 0,
  });

  /* =====================================================
     STATE
  ===================================================== */

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [crashed, setCrashed] = useState(false);

  const [score, setScore] = useState(0);

  const [best, setBest] = useState(() => {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  });

  const [speed, setSpeed] = useState(BASE_SPEED);
  const [fuel, setFuel] = useState(FUEL_MAX);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);

  const [enemies, setEnemies] = useState([]);
  const [coins, setCoins] = useState([]);
  const [letters, setLetters] = useState([]);

  const [collectedLetters, setCollectedLetters] =
    useState([]);

  const [newBest, setNewBest] = useState(false);

  const [muted, setMuted] = useState(() => {
    return localStorage.getItem(MUTED_KEY) === "true";
  });

  const [fullscreen, setFullscreen] = useState(false);
  const [touchVisible, setTouchVisible] = useState(false);

  /* =====================================================
     ROAD BOUNDS
  ===================================================== */

  const getRoadBounds = useCallback(() => {
    const width =
      gameRef.current?.clientWidth ||
      window.innerWidth;

    if (width <= 480) {
      return {
        left: 9,
        right: 91,
      };
    }

    if (width <= 700) {
      return {
        left: 10,
        right: 90,
      };
    }

    return {
      left: 12,
      right: 88,
    };
  }, []);

  /* =====================================================
     UPDATE GAME SIZE
  ===================================================== */

  const updateGameSize = useCallback(() => {
    if (!gameRef.current) return;

    const rect =
      gameRef.current.getBoundingClientRect();

    game.current.gameWidth = rect.width;
    game.current.gameHeight = rect.height;
  }, []);

  /* =====================================================
     SPAWN ENEMY
  ===================================================== */

  const spawnEnemy = useCallback(() => {
    const g = game.current;

    const bounds = getRoadBounds();

    const x = random(
      bounds.left + 4,
      bounds.right - 4
    );

    const enemy = {
      id: ++g.enemyId,
      x,
      y: -150,
      width: 62,
      height: 108,
      speedMultiplier: random(0.8, 1.15),
      image:
        ENEMY_IMAGES[
        Math.floor(
          Math.random() *
          ENEMY_IMAGES.length
        )
        ],
    };

    g.enemies.push(enemy);
  }, [getRoadBounds]);

  /* =====================================================
     SPAWN COIN
  ===================================================== */

  const spawnCoin = useCallback(() => {
    const g = game.current;

    const bounds = getRoadBounds();

    g.coins.push({
      id: ++g.coinId,
      x: random(
        bounds.left + 5,
        bounds.right - 5
      ),
      y: -60,
      size: 34,
      rotation: random(0, 360),
    });
  }, [getRoadBounds]);

  /* =====================================================
     SPAWN LETTER
  ===================================================== */

  const spawnLetter = useCallback(() => {
    const g = game.current;

    const bounds = getRoadBounds();

    /*
     * IMPORTANT:
     * Once the complete word has been collected,
     * collectedLetters is reset to [].
     *
     * Therefore the same word automatically starts
     * again without changing anything else.
     */

    const available =
      g.word
        .split("")
        .filter(
          (letter) =>
            !g.collectedLetters.includes(
              letter
            )
        );

    if (!available.length) return;

    const letter =
      available[
      Math.floor(
        Math.random() *
        available.length
      )
      ];

    g.letters.push({
      id: ++g.letterId,
      letter,
      x: random(
        bounds.left + 6,
        bounds.right - 6
      ),
      y: -70,
      size: 46,
    });
  }, [getRoadBounds]);

  /* =====================================================
     RESET GAME
  ===================================================== */

  const resetGame = useCallback(() => {
    const g = game.current;

    g.running = true;
    g.paused = false;
    g.crashed = false;

    g.score = 0;
    g.distance = 0;
    g.speed = BASE_SPEED;

    g.playerX = 50;
    g.targetX = 50;

    g.enemies = [];
    g.coins = [];
    g.letters = [];

    g.enemyId = 0;
    g.coinId = 0;
    g.letterId = 0;

    g.enemyTimer = 0;
    g.coinTimer = 0;
    g.letterTimer = 0;

    g.fuel = FUEL_MAX;
    g.boosting = false;
    g.braking = false;

    g.combo = 0;
    g.lastCollectTime = 0;

    g.level = 1;

    // Start the word hunt from the beginning.
    g.collectedLetters = [];

    enemyRefs.current.clear();
    coinRefs.current.clear();
    letterRefs.current.clear();

    setStarted(true);
    setPaused(false);
    setCrashed(false);

    setScore(0);
    setSpeed(BASE_SPEED);
    setFuel(FUEL_MAX);
    setCombo(0);
    setLevel(1);
    setCollectedLetters([]);
    setNewBest(false);

    setEnemies([]);
    setCoins([]);
    setLetters([]);

    updateGameSize();

    lastFrameRef.current = performance.now();

    if (!muted && musicRef.current) {
      musicRef.current.currentTime = 0;

      musicRef.current
        .play()
        .catch(() => { });
    }
  }, [muted, updateGameSize]);

  /* =====================================================
     CRASH
  ===================================================== */

  const crashGame = useCallback(() => {
    const g = game.current;

    if (g.crashed) return;

    g.running = false;
    g.crashed = true;

    setCrashed(true);

    if (musicRef.current) {
      musicRef.current.pause();
    }

    if (!muted && crashAudioRef.current) {
      crashAudioRef.current.currentTime = 0;

      crashAudioRef.current
        .play()
        .catch(() => { });
    }

    const finalScore = Math.floor(g.score);

    if (finalScore > best) {
      localStorage.setItem(
        BEST_KEY,
        String(finalScore)
      );

      setBest(finalScore);
      setNewBest(true);
    }
  }, [best, muted]);

  /* =====================================================
     POINTER / MOUSE STEERING
  ===================================================== */

  const handlePointerMove = useCallback(
    (event) => {
      const g = game.current;

      if (
        !g.running ||
        g.paused ||
        g.crashed ||
        !gameRef.current
      ) {
        return;
      }

      const rect =
        gameRef.current.getBoundingClientRect();

      const mouseX =
        event.clientX - rect.left;

      let percent =
        (mouseX / rect.width) * 100;

      const bounds = getRoadBounds();

      percent = clamp(
        percent,
        bounds.left,
        bounds.right
      );

      g.targetX = percent;

      g.playerX +=
        (g.targetX - g.playerX) * 0.25;
    },
    [getRoadBounds]
  );

  /* =====================================================
     TOUCH STEERING
  ===================================================== */

  const steerLeft = useCallback(() => {
    const g = game.current;

    if (
      !g.running ||
      g.paused ||
      g.crashed
    )
      return;

    const bounds = getRoadBounds();

    g.targetX = clamp(
      g.targetX - 7,
      bounds.left,
      bounds.right
    );
  }, [getRoadBounds]);

  const steerRight = useCallback(() => {
    const g = game.current;

    if (
      !g.running ||
      g.paused ||
      g.crashed
    )
      return;

    const bounds = getRoadBounds();

    g.targetX = clamp(
      g.targetX + 7,
      bounds.left,
      bounds.right
    );
  }, [getRoadBounds]);

  /* =====================================================
     TOGGLE PAUSE
  ===================================================== */

  const togglePause = useCallback(() => {
    const g = game.current;

    if (!g.running && !paused) return;

    g.paused = !g.paused;

    setPaused(g.paused);

    if (g.paused) {
      musicRef.current?.pause();
    } else if (!muted) {
      musicRef.current
        ?.play()
        .catch(() => { });

      lastFrameRef.current =
        performance.now();
    }
  }, [muted, paused]);

  /* =====================================================
     BOOST
  ===================================================== */

  const startBoost = useCallback(() => {
    const g = game.current;

    if (
      !g.running ||
      g.paused ||
      g.crashed ||
      g.fuel < MIN_BOOST_FUEL
    ) {
      return;
    }

    g.boosting = true;
  }, []);

  const stopBoost = useCallback(() => {
    game.current.boosting = false;
  }, []);

  /* =====================================================
     KEYBOARD
  ===================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key =
        event.key.toLowerCase();

      if (
        key === "arrowleft" ||
        key === "a"
      ) {
        event.preventDefault();
        steerLeft();
      }

      if (
        key === "arrowright" ||
        key === "d"
      ) {
        event.preventDefault();
        steerRight();
      }

      if (
        key === "shift" ||
        key === " "
      ) {
        event.preventDefault();
        startBoost();
      }

      if (key === "p") {
        event.preventDefault();
        togglePause();
      }

      if (
        key === "enter" &&
        game.current.crashed
      ) {
        event.preventDefault();
        resetGame();
      }

      if (
        key === "escape" &&
        fullscreen
      ) {
        document.exitFullscreen?.();
      }
    };

    const handleKeyUp = (event) => {
      const key =
        event.key.toLowerCase();

      if (
        key === "shift" ||
        key === " "
      ) {
        stopBoost();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "keyup",
      handleKeyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp
      );
    };
  }, [
    steerLeft,
    steerRight,
    startBoost,
    stopBoost,
    togglePause,
    resetGame,
    fullscreen,
  ]);

  /* =====================================================
     GAME LOOP
  ===================================================== */

  useEffect(() => {
    const loop = (time) => {
      animationRef.current =
        requestAnimationFrame(loop);

      const g = game.current;

      if (
        !g.running ||
        g.paused ||
        g.crashed
      ) {
        lastFrameRef.current = time;
        return;
      }

      let dt =
        (time -
          lastFrameRef.current) /
        1000;

      lastFrameRef.current = time;

      dt = Math.min(dt, 0.04);

      updateGameSize();

      /* ---------------------------------------------
         SPEED
      --------------------------------------------- */

      const speedIncrease =
        4.5 * dt;

      g.speed = Math.min(
        MAX_SPEED,
        g.speed + speedIncrease
      );

      let currentSpeed = g.speed;

      /* ---------------------------------------------
         BOOST
      --------------------------------------------- */

      if (
        g.boosting &&
        g.fuel > 0
      ) {
        currentSpeed *=
          BOOST_MULTIPLIER;

        g.fuel = Math.max(
          0,
          g.fuel -
          FUEL_DRAIN * dt
        );

        if (g.fuel <= 0) {
          g.boosting = false;
        }
      } else {
        g.fuel = Math.min(
          FUEL_MAX,
          g.fuel +
          FUEL_REGEN * dt
        );
      }

      /* ---------------------------------------------
         BRAKE
      --------------------------------------------- */

      if (g.braking) {
        currentSpeed *=
          BRAKE_MULTIPLIER;
      }

      /* ---------------------------------------------
         PLAYER MOVEMENT
      --------------------------------------------- */

      const steeringSmooth =
        1 -
        Math.exp(-12 * dt);

      g.playerX +=
        (g.targetX - g.playerX) *
        steeringSmooth;

      const bounds =
        getRoadBounds();

      g.playerX = clamp(
        g.playerX,
        bounds.left,
        bounds.right
      );

      if (playerRef.current) {
        playerRef.current.style.left =
          `${g.playerX}%`;
      }

      /* ---------------------------------------------
         DISTANCE / SCORE
      --------------------------------------------- */

      g.distance +=
        currentSpeed * dt;

      g.score +=
        currentSpeed *
        dt *
        0.055;

      /* ---------------------------------------------
         LEVEL
      --------------------------------------------- */

      const newLevel =
        Math.floor(
          g.score / 500
        ) + 1;

      if (newLevel !== g.level) {
        g.level = newLevel;
      }

      /* ---------------------------------------------
         SPAWN TIMERS
      --------------------------------------------- */

      g.enemyTimer += dt;
      g.coinTimer += dt;
      g.letterTimer += dt;

      const enemyInterval =
        Math.max(
          0.55,
          1.35 -
          g.score / 7000
        );

      let objectsChanged = false;

      if (
        g.enemyTimer >=
        enemyInterval
      ) {
        g.enemyTimer = 0;

        if (g.enemies.length < 8) {
          spawnEnemy();
          objectsChanged = true;
        }
      }

      if (
        g.coinTimer >= 1.15
      ) {
        g.coinTimer = 0;

        if (g.coins.length < 4) {
          spawnCoin();
          objectsChanged = true;
        }
      }

      if (
        g.letterTimer >= 4.2
      ) {
        g.letterTimer = 0;

        if (g.letters.length < 2) {
          spawnLetter();
          objectsChanged = true;
        }
      }

      /* ---------------------------------------------
         OBJECT MOVEMENT
      --------------------------------------------- */

      const movement =
        currentSpeed * dt;

      for (const enemy of g.enemies) {
        enemy.y +=
          movement *
          enemy.speedMultiplier;

        const el =
          enemyRefs.current.get(
            enemy.id
          );

        if (el) {
          el.style.transform =
            `translate3d(-50%, ${enemy.y}px, 0)`;
        }
      }

      for (const coin of g.coins) {
        coin.y += movement;

        coin.rotation +=
          180 * dt;

        const el =
          coinRefs.current.get(
            coin.id
          );

        if (el) {
          el.style.transform =
            `translate3d(-50%, ${coin.y}px, 0) rotate(${coin.rotation}deg)`;
        }
      }

      for (const letter of g.letters) {
        letter.y += movement;

        const el =
          letterRefs.current.get(
            letter.id
          );

        if (el) {
          el.style.transform =
            `translate3d(-50%, ${letter.y}px, 0)`;
        }
      }

      /* ---------------------------------------------
         REMOVE OFFSCREEN OBJECTS
      --------------------------------------------- */

      const beforeEnemyCount =
        g.enemies.length;

      const beforeCoinCount =
        g.coins.length;

      const beforeLetterCount =
        g.letters.length;

      g.enemies =
        g.enemies.filter(
          (enemy) =>
            enemy.y <
            g.gameHeight + 160
        );

      g.coins =
        g.coins.filter(
          (coin) =>
            coin.y <
            g.gameHeight + 80
        );

      g.letters =
        g.letters.filter(
          (letter) =>
            letter.y <
            g.gameHeight + 100
        );

      if (
        g.enemies.length !==
        beforeEnemyCount ||
        g.coins.length !==
        beforeCoinCount ||
        g.letters.length !==
        beforeLetterCount
      ) {
        objectsChanged = true;
      }

      /* ---------------------------------------------
         PLAYER COLLISION AREA
      --------------------------------------------- */

      const playerY =
        g.gameHeight - 145;

      const playerX =
        g.playerX;

      /* ---------------------------------------------
         ENEMY COLLISIONS
      --------------------------------------------- */

      for (const enemy of g.enemies) {
        const horizontal =
          Math.abs(
            enemy.x -
            playerX
          );

        const vertical =
          Math.abs(
            enemy.y -
            playerY
          );

        if (
          horizontal < 6.2 &&
          vertical < 70
        ) {
          crashGame();
          break;
        }
      }

      if (g.crashed) return;

      /* ---------------------------------------------
         COIN COLLISIONS
      --------------------------------------------- */

      const remainingCoins = [];

      for (const coin of g.coins) {
        const horizontal =
          Math.abs(
            coin.x -
            playerX
          );

        const vertical =
          Math.abs(
            coin.y -
            playerY
          );

        if (
          horizontal < 5 &&
          vertical < 65
        ) {
          const now =
            performance.now();

          if (
            now -
            g.lastCollectTime <=
            COMBO_WINDOW_MS
          ) {
            g.combo =
              Math.min(
                COMBO_MAX,
                g.combo + 1
              );
          } else {
            g.combo = 1;
          }

          g.lastCollectTime =
            now;

          const multiplier =
            1 +
            Math.min(
              g.combo,
              COMBO_MAX
            ) *
            0.15;

          g.score +=
            50 *
            multiplier;

          coinRefs.current.delete(
            coin.id
          );

          objectsChanged = true;
        } else {
          remainingCoins.push(
            coin
          );
        }
      }

      g.coins =
        remainingCoins;

      /* ---------------------------------------------
         LETTER COLLISIONS
      --------------------------------------------- */

      const remainingLetters = [];

      for (const item of g.letters) {
        const horizontal =
          Math.abs(
            item.x -
            playerX
          );

        const vertical =
          Math.abs(
            item.y -
            playerY
          );

        if (
          horizontal < 6 &&
          vertical < 70
        ) {
          if (
            !g.collectedLetters.includes(
              item.letter
            )
          ) {
            const newCollectedLetters =
              [
                ...g.collectedLetters,
                item.letter,
              ];

            /*
             * =================================================
             * WORD HUNT LOOP FIX
             *
             * When the last letter is collected,
             * reset collectedLetters to [].
             *
             * This makes the same word start again
             * automatically.
             * =================================================
             */

            if (
              newCollectedLetters.length ===
              g.word.length
            ) {
              g.collectedLetters =
                [];
            } else {
              g.collectedLetters =
                newCollectedLetters;
            }

            g.score += 100;
          }

          letterRefs.current.delete(
            item.id
          );

          objectsChanged = true;
        } else {
          remainingLetters.push(
            item
          );
        }
      }

      g.letters =
        remainingLetters;

      /* ---------------------------------------------
         SYNC OBJECT LISTS TO REACT
      --------------------------------------------- */

      if (objectsChanged) {
        setEnemies([
          ...g.enemies,
        ]);

        setCoins([
          ...g.coins,
        ]);

        setLetters([
          ...g.letters,
        ]);
      }

      /* ---------------------------------------------
         HUD UPDATE
      --------------------------------------------- */

      if (
        time -
        g.lastHudUpdate >
        70
      ) {
        g.lastHudUpdate = time;

        setScore(
          Math.floor(
            g.score
          )
        );

        setSpeed(
          Math.floor(
            currentSpeed
          )
        );

        setFuel(
          Math.floor(
            g.fuel
          )
        );

        setCombo(g.combo);
        setLevel(g.level);

        setCollectedLetters([
          ...g.collectedLetters,
        ]);
      }
    };

    animationRef.current =
      requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    crashGame,
    getRoadBounds,
    spawnEnemy,
    spawnCoin,
    spawnLetter,
    updateGameSize,
  ]);

  /* =====================================================
     MUSIC
  ===================================================== */

  useEffect(() => {
    localStorage.setItem(
      MUTED_KEY,
      String(muted)
    );

    if (muted) {
      musicRef.current?.pause();
    } else if (
      game.current.running &&
      !game.current.paused
    ) {
      musicRef.current
        ?.play()
        .catch(() => { });
    }
  }, [muted]);

  /* =====================================================
     RESIZE
  ===================================================== */

  useEffect(() => {
    const resize = () => {
      updateGameSize();
    };

    window.addEventListener(
      "resize",
      resize
    );

    return () => {
      window.removeEventListener(
        "resize",
        resize
      );
    };
  }, [updateGameSize]);

  /* =====================================================
     FULLSCREEN
  ===================================================== */

  const toggleFullscreen =
    async () => {
      try {
        if (
          !document.fullscreenElement
        ) {
          await document.documentElement.requestFullscreen();

          setFullscreen(true);
        } else {
          await document.exitFullscreen();

          setFullscreen(false);
        }
      } catch {
        setFullscreen(false);
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className={`appShell ${game.current.boosting
        ? "boostMode"
        : ""
        }`}
    >
      {/* AUDIO */}

      <audio
        ref={musicRef}
        src={MUSIC_SRC}
        loop
        preload="auto"
      />

      <audio
        ref={crashAudioRef}
        src={CRASH_SOUND_SRC}
        preload="auto"
      />

      {/* =================================================
                HEADER
            ================================================= */}

      <header className="topHeader">
        <div className="brand">
          <div className="brandMark">
            SR
          </div>

          <div>
            <h1>
              STREET RACER
            </h1>

            <span>
              HIGHWAY EDITION
            </span>
          </div>
        </div>

        <div className="headerRight">
          <div className="headerStatus">
            <span className="statusDot" />
            LIVE
          </div>

          <div className="headerControls">
            <button
              className="iconButton"
              onClick={() =>
                setMuted(
                  (value) =>
                    !value
                )
              }
              aria-label="Toggle sound"
            >
              {muted
                ? "🔇"
                : "🔊"}
            </button>

            <button
              className="iconButton"
              onClick={
                toggleFullscreen
              }
              aria-label="Fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
                MAIN
            ================================================= */}

      <main className="gameWrapper">
        {/* LEFT PANEL */}

        <aside className="sidePanel leftPanel">
          <div className="panelTitle">
            RACE DATA
          </div>

          <div className="statCard scoreCard">
            <span className="statLabel">
              SCORE
            </span>

            <strong>
              {score.toLocaleString()}
            </strong>
          </div>

          <div className="statCard">
            <span className="statLabel">
              BEST
            </span>

            <strong>
              {best.toLocaleString()}
            </strong>
          </div>

          <div className="statCard">
            <span className="statLabel">
              LEVEL
            </span>

            <strong>
              {level}
            </strong>
          </div>

          <div className="tipCard">
            <span>TIP</span>

            <p>
              Move your mouse
              across the track
              to steer.
            </p>
          </div>
        </aside>

        {/* =================================================
                    GAME AREA
                ================================================= */}

        <section
          ref={gameRef}
          className={`gameArea ${paused
            ? "gamePaused"
            : ""
            }`}
          onPointerMove={
            handlePointerMove
          }
          onPointerEnter={() =>
            setTouchVisible(
              false
            )
          }
          onTouchStart={() =>
            setTouchVisible(
              true
            )
          }
        >
          {/* SKY */}

          <div className="sky">
            <div className="moon" />

            {Array.from({
              length: 28,
            }).map(
              (_, index) => (
                <span
                  key={index}
                  className="star"
                  style={{
                    left: `${(index *
                      37) %
                      100
                      }%`,
                    top: `${(index *
                      23) %
                      42
                      }%`,
                    animationDelay: `${index *
                      0.17
                      }s`,
                  }}
                />
              )
            )}
          </div>

          {/* CITY HORIZON */}

          <div className="city">
            {Array.from({
              length: 15,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="building"
                  style={{
                    height: `${45 +
                      ((index *
                        31) %
                        75)
                      }px`,
                  }}
                >
                  <span />
                  <span />
                  <span />
                </div>
              )
            )}
          </div>

          {/* STRAIGHT ROAD */}

          <div className="road">
            <div className="roadGlow" />

            <div className="roadEdge roadEdgeLeft" />
            <div className="roadEdge roadEdgeRight" />

            <div className="lane laneLeft" />
            <div className="lane laneRight" />

            <div className="roadTexture" />
          </div>

          {/* SPEED LINES */}

          <div className="speedLines">
            {Array.from({
              length: 16,
            }).map(
              (_, index) => (
                <span
                  key={index}
                  style={{
                    left: `${14 +
                      ((index *
                        17) %
                        72)
                      }%`,
                    animationDelay: `${index *
                      0.09
                      }s`,
                  }}
                />
              )
            )}
          </div>

          {/* RACE STATUS */}

          <div className="raceStatus">
            <span>
              SPEED
            </span>

            <strong>
              {speed}

              <small>
                KM/H
              </small>
            </strong>
          </div>

          {/* WORD HUNT */}

          <div className="wordHunt">
            <div className="wordHeader">
              <span>
                WORD HUNT
              </span>

              <strong>
                {
                  collectedLetters.length
                }
                /
                {
                  game.current
                    .word
                    .length
                }
              </strong>
            </div>

            <div className="wordLetters">
              {game.current.word
                .split("")
                .map(
                  (
                    letter,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className={`letterFound ${collectedLetters.includes(
                        letter
                      )
                        ? "active"
                        : ""
                        }`}
                    >
                      {collectedLetters.includes(
                        letter
                      )
                        ? letter
                        : "?"}
                    </div>
                  )
                )}
            </div>
          </div>

          {/* ENEMIES */}

          {enemies.map(
            (enemy) => (
              <div
                key={
                  enemy.id
                }
                ref={(el) => {
                  if (el) {
                    enemyRefs.current.set(
                      enemy.id,
                      el
                    );
                  } else {
                    enemyRefs.current.delete(
                      enemy.id
                    );
                  }
                }}
                className="dynamicObject enemyObject"
                style={{
                  left: `${enemy.x}%`,
                  transform: `translate3d(-50%, ${enemy.y}px, 0)`,
                }}
              >
                <div className="enemyShadow" />

                <img
                  src={
                    enemy.image
                  }
                  alt=""
                  draggable="false"
                />
              </div>
            )
          )}

          {/* COINS */}

          {coins.map(
            (coin) => (
              <div
                key={coin.id}
                ref={(el) => {
                  if (el) {
                    coinRefs.current.set(
                      coin.id,
                      el
                    );
                  } else {
                    coinRefs.current.delete(
                      coin.id
                    );
                  }
                }}
                className="dynamicObject coinObject"
                style={{
                  left: `${coin.x}%`,
                  transform: `translate3d(-50%, ${coin.y}px, 0) rotate(${coin.rotation}deg)`,
                }}
              >
                <div className="coinOuter">
                  <div className="coinInner">
                    $
                  </div>
                </div>
              </div>
            )
          )}

          {/* LETTERS */}

          {letters.map(
            (item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) {
                    letterRefs.current.set(
                      item.id,
                      el
                    );
                  } else {
                    letterRefs.current.delete(
                      item.id
                    );
                  }
                }}
                className="dynamicObject letterObject"
                style={{
                  left: `${item.x}%`,
                  transform: `translate3d(-50%, ${item.y}px, 0)`,
                }}
              >
                <div className="letterGlow">
                  {
                    item.letter
                  }
                </div>
              </div>
            )
          )}

          {/* PLAYER */}

          <div
            ref={playerRef}
            className={`playerCar ${game.current
              .boosting
              ? "boosting"
              : ""
              }`}
            style={{
              left: "50%",
            }}
          >
            <div className="playerShadow" />

            <img
              src={PLAYER_IMAGE}
              alt="Player car"
              draggable="false"
            />

            <div className="playerGlow" />

            {game.current
              .boosting && (
                <div className="nitroFlames">
                  <span />
                  <span />
                </div>
              )}
          </div>

          {/* SPEEDOMETER */}

          <div className="speedometer">
            <div className="speedRing">
              <div className="speedValue">
                {speed}
              </div>

              <span>
                KM/H
              </span>
            </div>
          </div>

          {/* START */}

          {!started && (
            <div className="gameOverlay">
              <div className="startCard">
                <div className="gameLogo">
                  SR
                </div>

                <div className="editionText">
                  STREET RACER
                </div>

                <div className="logoDivider" />

                <h2>
                  READY TO
                  RACE?
                </h2>

                <p>
                  Steer with your
                  mouse and
                  survive the
                  highway.
                </p>

                <button
                  className="mainButton"
                  onClick={
                    resetGame
                  }
                >
                  START RACE
                </button>

                <div className="keyboardHints">
                  <span>
                    ← →
                    STEER
                  </span>

                  <span>
                    SHIFT
                    BOOST
                  </span>

                  <span>
                    P
                    PAUSE
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PAUSE */}

          {paused &&
            !crashed && (
              <div className="gameOverlay">
                <div className="pauseCard">
                  <div className="pauseSymbol">
                    ||
                  </div>

                  <h2>
                    PAUSED
                  </h2>

                  <p>
                    Your race is
                    waiting.
                  </p>

                  <button
                    className="mainButton"
                    onClick={
                      togglePause
                    }
                  >
                    RESUME
                  </button>
                </div>
              </div>
            )}

          {/* CRASH */}

          {crashed && (
            <div className="gameOverlay">
              <div className="crashCard">
                <div className="crashBadge">
                  CRASHED
                </div>

                {newBest && (
                  <div className="newBestBadge">
                    NEW BEST
                  </div>
                )}

                <h2>
                  RACE OVER
                </h2>

                <div className="finalScore">
                  {score.toLocaleString()}
                </div>

                <div className="resultRow">
                  <span>
                    BEST
                  </span>

                  <strong>
                    {best.toLocaleString()}
                  </strong>
                </div>

                <button
                  className="mainButton"
                  onClick={
                    resetGame
                  }
                >
                  RACE AGAIN
                </button>

                <div className="restartHint">
                  PRESS ENTER TO
                  RESTART
                </div>
              </div>
            </div>
          )}

          {/* MOBILE CONTROLS */}

          <div
            className={`mobileControls ${touchVisible
              ? "touchVisible"
              : ""
              }`}
          >
            <button
              className="controlButton steeringButton"
              onPointerDown={
                steerLeft
              }
            >
              ←
            </button>

            <button
              className="controlButton nitroButton"
              onPointerDown={
                startBoost
              }
              onPointerUp={
                stopBoost
              }
              onPointerCancel={
                stopBoost
              }
            >
              BOOST
            </button>

            <button
              className="controlButton steeringButton"
              onPointerDown={
                steerRight
              }
            >
              →
            </button>

            <button
              className="controlButton pauseButton"
              onClick={
                togglePause
              }
            >
              ||
            </button>
          </div>
        </section>

        {/* RIGHT PANEL */}

        <aside className="sidePanel rightPanel">
          <div className="panelTitle">
            VEHICLE
          </div>

          <div className="statCard">
            <span className="statLabel">
              SPEED
            </span>

            <strong>
              {speed}

              <small>
                {" "}
                KM/H
              </small>
            </strong>
          </div>

          <div className="boostCard">
            <div className="boostHeader">
              <span>
                NITRO
              </span>

              <strong>
                {fuel}%
              </strong>
            </div>

            <div className="fuelGauge">
              <div
                className={`fuelFill ${fuel < 20
                  ? "fuelDraining"
                  : ""
                  }`}
                style={{
                  width: `${fuel}%`,
                }}
              />
            </div>

            <small>
              HOLD SHIFT
            </small>
          </div>

          <div className="comboCard">
            <span>
              COMBO
            </span>

            <strong>
              x{combo}
            </strong>
          </div>

          <div className="controlsCard">
            <div className="panelTitle">
              CONTROLS
            </div>

            <p>
              <kbd>←</kbd>
              <kbd>→</kbd>
              Steer
            </p>

            <p>
              <kbd>SHIFT</kbd>
              Boost
            </p>

            <p>
              <kbd>P</kbd>
              Pause
            </p>
          </div>
        </aside>
      </main>

      {/* FOOTER */}

      <footer>
        <span>
          STREET RACER
        </span>

        <span>
          HIGHWAY EDITION
        </span>

        <span>
          © 2026
        </span>
      </footer>
    </div>
  );
}