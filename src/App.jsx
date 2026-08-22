import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

/* =========================================================
   CONFIG
========================================================= */

const ENEMY_IMAGES = [
  "/images/enemycar1.png",
  "/images/enemycar2.png",
  "/images/enemycar3.png",
  "/images/enemycar4.png",
];

const WORDS = ["RACER", "BOOST", "SPEED", "TURBO", "NITRO", "DRIFT"];

const PLAYER_SPEED_PCT_PER_SEC = 95;
const BASE_FALL_SPEED = 190;
const FALL_SPEED_PER_SEC = 3.2;
const MAX_FALL_SPEED = 520;

const BOOST_MULTIPLIER = 1.7;
const BRAKE_MULTIPLIER = 0.5;

const ENEMY_SPAWN_START_MS = 1300;
const ENEMY_SPAWN_MIN_MS = 620;
const COIN_SPAWN_MS = 850;
const LETTER_SPAWN_MS = 2600;

let idCounter = 1;

const nextId = () => idCounter++;

/* =========================================================
   HELPERS
========================================================= */

function pickWord(exclude) {
  const options = WORDS.filter((w) => w !== exclude);

  return (
    options[Math.floor(Math.random() * options.length)] ||
    WORDS[0]
  );
}

function getSizes() {
  const w = window.innerWidth;

  if (w <= 380) {
    return {
      car: 55,
      enemy: 53,
      edge: 25,
    };
  }

  if (w <= 700) {
    return {
      car: 60,
      enemy: 57,
      edge: 25,
    };
  }

  if (w <= 900) {
    return {
      car: 68,
      enemy: 64,
      edge: 42,
    };
  }

  return {
    car: 76,
    enemy: 70,
    edge: 42,
  };
}

function loadBest() {
  const v = Number(localStorage.getItem("streetRacerBest"));

  return Number.isFinite(v) ? v : 0;
}

/* =========================================================
   COMPONENT
========================================================= */

function App() {
  /* -------------------------------------------------------
     BASIC GAME STATE
  ------------------------------------------------------- */

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [best, setBest] = useState(loadBest);

  /* -------------------------------------------------------
     HUD
  ------------------------------------------------------- */

  const [hud, setHud] = useState({
    score: 0,
    coins: 0,
    speed: 0,
    boosting: false,
  });

  /* -------------------------------------------------------
     WORD STATE
  ------------------------------------------------------- */

  const [wordState, setWordState] = useState({
    word: WORDS[0],
    collected: [],
  });

  /* -------------------------------------------------------
     GAME OBJECTS
  ------------------------------------------------------- */

  const [playerX, setPlayerX] = useState(50);
  const [enemies, setEnemies] = useState([]);
  const [coins, setCoins] = useState([]);
  const [letters, setLetters] = useState([]);

  /* -------------------------------------------------------
     REFS
  ------------------------------------------------------- */

  const gameAreaRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  /* -------------------------------------------------------
     AUDIO REFS
  ------------------------------------------------------- */

  const backgroundMusicRef = useRef(null);
  const crashSoundRef = useRef(null);

  /* =========================================================
     AUDIO SETUP
  ========================================================= */

  useEffect(() => {
    const bgMusic = new Audio("/alex-morgan-gaming-rock-545508.mp3");

    bgMusic.loop = true;
    bgMusic.volume = 0.35;

    const crashSound = new Audio("/fahhhhh.mp3");

    crashSound.volume = 0.85;

    backgroundMusicRef.current = bgMusic;
    crashSoundRef.current = crashSound;

    return () => {
      bgMusic.pause();
      bgMusic.currentTime = 0;

      crashSound.pause();
      crashSound.currentTime = 0;
    };
  }, []);

  /* =========================================================
     MUTABLE GAME STATE
  ========================================================= */

  const gs = useRef({
    playerX: 50,

    score: 0,

    coinsCollected: 0,

    elapsed: 0,

    fallSpeed: BASE_FALL_SPEED,

    boosting: false,

    braking: false,

    keys: {
      left: false,
      right: false,
      boost: false,
      brake: false,
    },

    enemies: [],

    coins: [],

    letters: [],

    lastEnemySpawn: 0,

    lastCoinSpawn: 0,

    lastLetterSpawn: 0,

    word: WORDS[0],

    collected: new Set(),
  });

  /* =========================================================
     RESET GAME
  ========================================================= */

  const resetGame = useCallback(() => {
    idCounter = 1;

    gs.current = {
      playerX: 50,

      score: 0,

      coinsCollected: 0,

      elapsed: 0,

      fallSpeed: BASE_FALL_SPEED,

      boosting: false,

      braking: false,

      keys: {
        left: false,
        right: false,
        boost: false,
        brake: false,
      },

      enemies: [],

      coins: [],

      letters: [],

      lastEnemySpawn: 0,

      lastCoinSpawn: 0,

      lastLetterSpawn: 0,

      word: pickWord(),

      collected: new Set(),
    };

    setPlayerX(50);

    setEnemies([]);

    setCoins([]);

    setLetters([]);

    setHud({
      score: 0,
      coins: 0,
      speed: Math.round(BASE_FALL_SPEED * 0.35),
      boosting: false,
    });

    setWordState({
      word: gs.current.word,
      collected: [],
    });

    setCrashed(false);

    setPaused(false);
  }, []);

  /* =========================================================
     START GAME
  ========================================================= */

  const startGame = useCallback(() => {
    resetGame();

    setStarted(true);

    /* Start background music */

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;

      backgroundMusicRef.current
        .play()
        .catch((error) => {
          console.log(
            "Background music could not start:",
            error
          );
        });
    }
  }, [resetGame]);

  /* =========================================================
     RESTART GAME
  ========================================================= */

  const restartGame = useCallback(() => {
    resetGame();

    setStarted(true);

    /* Restart background music */

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;

      backgroundMusicRef.current
        .play()
        .catch((error) => {
          console.log(
            "Background music could not start:",
            error
          );
        });
    }
  }, [resetGame]);

  /* =========================================================
     PAUSE / RESUME AUDIO
  ========================================================= */

  useEffect(() => {
    if (!backgroundMusicRef.current) {
      return;
    }

    if (paused || crashed || !started) {
      backgroundMusicRef.current.pause();
    } else if (started) {
      backgroundMusicRef.current
        .play()
        .catch(() => { });
    }
  }, [paused, crashed, started]);

  /* =========================================================
     KEYBOARD INPUT
  ========================================================= */

  useEffect(() => {
    const down = (e) => {
      const k = gs.current.keys;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          k.left = true;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          k.right = true;
          break;

        case "ArrowUp":
        case "w":
        case "W":
        case " ":
          k.boost = true;
          e.preventDefault();
          break;

        case "ArrowDown":
        case "s":
        case "S":
          k.brake = true;
          break;

        case "p":
        case "P":
          if (started && !crashed) {
            setPaused((p) => !p);
          }
          break;

        default:
          break;
      }
    };

    const up = (e) => {
      const k = gs.current.keys;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          k.left = false;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          k.right = false;
          break;

        case "ArrowUp":
        case "w":
        case "W":
        case " ":
          k.boost = false;
          break;

        case "ArrowDown":
        case "s":
        case "S":
          k.brake = false;
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", down);

    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);

      window.removeEventListener("keyup", up);
    };
  }, [started, crashed]);

  /* =========================================================
     MOBILE / POINTER CONTROLS
  ========================================================= */

  const setKey = (key, val) => () => {
    gs.current.keys[key] = val;
  };

  /* =========================================================
     PLAYER POSITION
  ========================================================= */

  const clampPlayerX = (pct) => {
    const { car, edge } = getSizes();

    const width = gameAreaRef.current
      ? gameAreaRef.current.clientWidth
      : 500;

    const edgePct = (edge / width) * 100;

    const halfCarPct = (car / 2 / width) * 100;

    const min = edgePct + halfCarPct + 1;

    const max = 100 - edgePct - halfCarPct - 1;

    return Math.min(max, Math.max(min, pct));
  };

  /* =========================================================
     MOUSE CONTROL
  ========================================================= */

  const handlePointerMove = (e) => {
    if (!started || paused || crashed) {
      return;
    }

    const rect =
      gameAreaRef.current.getBoundingClientRect();

    const pct =
      ((e.clientX - rect.left) / rect.width) * 100;

    gs.current.playerX = clampPlayerX(pct);
  };

  /* =========================================================
     GAME LOOP
  ========================================================= */

  useEffect(() => {
    if (!started || paused || crashed) {
      lastTimeRef.current = null;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      return;
    }

    const tick = (time) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }

      const dt = Math.min(
        50,
        time - lastTimeRef.current
      );

      lastTimeRef.current = time;

      const state = gs.current;

      const area = gameAreaRef.current;

      if (!area) {
        rafRef.current =
          requestAnimationFrame(tick);

        return;
      }

      const areaWidth = area.clientWidth;

      const areaHeight = area.clientHeight;

      const {
        car: carSize,
        enemy: enemySize,
        edge,
      } = getSizes();

      /* -----------------------------------------------------
         SPEED / DIFFICULTY
      ----------------------------------------------------- */

      state.elapsed += dt;

      state.boosting = state.keys.boost;

      state.braking =
        state.keys.brake &&
        !state.keys.boost;

      const rampSpeed = Math.min(
        MAX_FALL_SPEED,

        BASE_FALL_SPEED +
        (state.elapsed / 1000) *
        FALL_SPEED_PER_SEC *
        10
      );

      let effectiveSpeed = rampSpeed;

      if (state.boosting) {
        effectiveSpeed *= BOOST_MULTIPLIER;
      } else if (state.braking) {
        effectiveSpeed *= BRAKE_MULTIPLIER;
      }

      state.fallSpeed = effectiveSpeed;

      /* -----------------------------------------------------
         PLAYER MOVEMENT
      ----------------------------------------------------- */

      const movePct =
        (PLAYER_SPEED_PCT_PER_SEC * dt) / 1000;

      if (state.keys.left) {
        state.playerX -= movePct;
      }

      if (state.keys.right) {
        state.playerX += movePct;
      }

      state.playerX = clampPlayerX(
        state.playerX
      );

      /* -----------------------------------------------------
         ENEMY SPAWN
      ----------------------------------------------------- */

      const enemyInterval = Math.max(
        ENEMY_SPAWN_MIN_MS,

        ENEMY_SPAWN_START_MS -
        state.elapsed / 12
      );

      state.lastEnemySpawn += dt;

      if (
        state.lastEnemySpawn >=
        enemyInterval
      ) {
        state.lastEnemySpawn = 0;

        const edgePct =
          (edge / areaWidth) * 100;

        const halfPct =
          (enemySize / 2 / areaWidth) *
          100;

        const x =
          edgePct +
          halfPct +
          Math.random() *
          (100 -
            2 *
            (edgePct +
              halfPct));

        state.enemies.push({
          id: nextId(),

          x,

          y: -160,

          img:
            ENEMY_IMAGES[
            Math.floor(
              Math.random() *
              ENEMY_IMAGES.length
            )
            ],
        });
      }

      /* -----------------------------------------------------
         COIN SPAWN
      ----------------------------------------------------- */

      state.lastCoinSpawn += dt;

      if (
        state.lastCoinSpawn >=
        COIN_SPAWN_MS
      ) {
        state.lastCoinSpawn = 0;

        const edgePct =
          (edge / areaWidth) * 100;

        const x =
          edgePct +
          4 +
          Math.random() *
          (100 -
            2 *
            (edgePct + 4));

        state.coins.push({
          id: nextId(),

          x,

          y: -60,
        });
      }

      /* -----------------------------------------------------
         LETTER SPAWN
      ----------------------------------------------------- */

      state.lastLetterSpawn += dt;

      if (
        state.lastLetterSpawn >=
        LETTER_SPAWN_MS
      ) {
        state.lastLetterSpawn = 0;

        const needed = [
          ...new Set(
            state.word.split("")
          ),
        ].filter(
          (ch) =>
            !state.collected.has(ch)
        );

        if (needed.length > 0) {
          const ch =
            needed[
            Math.floor(
              Math.random() *
              needed.length
            )
            ];

          const edgePct =
            (edge / areaWidth) *
            100;

          const x =
            edgePct +
            6 +
            Math.random() *
            (100 -
              2 *
              (edgePct + 6));

          state.letters.push({
            id: nextId(),

            x,

            y: -60,

            ch,
          });
        }
      }

      /* -----------------------------------------------------
         MOVE FALLING OBJECTS
      ----------------------------------------------------- */

      const fallPx =
        (state.fallSpeed * dt) /
        1000;

      state.enemies.forEach(
        (e) => {
          e.y += fallPx;
        }
      );

      state.coins.forEach(
        (c) => {
          c.y += fallPx;
        }
      );

      state.letters.forEach(
        (l) => {
          l.y += fallPx;
        }
      );

      /* -----------------------------------------------------
         REMOVE OFF-SCREEN OBJECTS
      ----------------------------------------------------- */

      state.enemies =
        state.enemies.filter(
          (e) =>
            e.y <
            areaHeight + 120
        );

      state.coins =
        state.coins.filter(
          (c) =>
            c.y <
            areaHeight + 60
        );

      state.letters =
        state.letters.filter(
          (l) =>
            l.y <
            areaHeight + 60
        );

      /* -----------------------------------------------------
         PLAYER COLLISION RECT
      ----------------------------------------------------- */

      const playerLeft =
        (state.playerX / 100) *
        areaWidth -
        carSize / 2;

      const playerRect = {
        left:
          playerLeft +
          carSize * 0.18,

        right:
          playerLeft +
          carSize * 0.82,

        top:
          areaHeight -
          30 -
          96,

        bottom:
          areaHeight -
          30 -
          8,
      };

      /* -----------------------------------------------------
         COLLISION RECT
      ----------------------------------------------------- */

      const rectOf = (
        item,
        size,
        boxScale = 0.8
      ) => {
        const left =
          (item.x / 100) *
          areaWidth -
          size / 2;

        const inset =
          (size *
            (1 - boxScale)) /
          2;

        return {
          left:
            left + inset,

          right:
            left +
            size -
            inset,

          top:
            item.y + inset,

          bottom:
            item.y +
            size -
            inset,
        };
      };

      const overlaps = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;

      /* -----------------------------------------------------
         ENEMY COLLISION
      ----------------------------------------------------- */

      let hitEnemy = false;

      for (const e of state.enemies) {
        const r = rectOf(
          e,
          enemySize * 1.25,
          0.65
        );

        if (
          overlaps(
            playerRect,
            r
          )
        ) {
          hitEnemy = true;

          break;
        }
      }

      /* -----------------------------------------------------
         COIN COLLECTION
      ----------------------------------------------------- */

      const remainingCoins = [];

      let coinsGained = 0;

      for (const c of state.coins) {
        const r = rectOf(
          c,
          38,
          0.9
        );

        if (
          overlaps(
            playerRect,
            r
          )
        ) {
          coinsGained += 1;
        } else {
          remainingCoins.push(c);
        }
      }

      state.coins =
        remainingCoins;

      if (coinsGained > 0) {
        state.coinsCollected +=
          coinsGained;

        state.score +=
          coinsGained * 15;
      }

      /* -----------------------------------------------------
         LETTER COLLECTION
      ----------------------------------------------------- */

      const remainingLetters = [];

      let letterCollected = false;

      for (const l of state.letters) {
        const r = rectOf(
          l,
          48,
          0.9
        );

        if (
          overlaps(
            playerRect,
            r
          )
        ) {
          state.collected.add(
            l.ch
          );

          letterCollected = true;
        } else {
          remainingLetters.push(l);
        }
      }

      state.letters =
        remainingLetters;

      /* -----------------------------------------------------
         WORD COMPLETE
      ----------------------------------------------------- */

      const uniqueWordLetters =
        new Set(
          state.word.split("")
        );

      const isComplete = [
        ...uniqueWordLetters,
      ].every(
        (ch) =>
          state.collected.has(ch)
      );

      let wordJustCompleted =
        false;

      if (isComplete) {
        wordJustCompleted = true;

        state.score += 300;

        state.word =
          pickWord(
            state.word
          );

        state.collected =
          new Set();
      }

      /* -----------------------------------------------------
         DISTANCE SCORE
      ----------------------------------------------------- */

      state.score +=
        (state.fallSpeed / 1000) *
        dt *
        0.02;

      /* -----------------------------------------------------
         UPDATE REACT STATE
      ----------------------------------------------------- */

      setPlayerX(
        state.playerX
      );

      setEnemies([
        ...state.enemies,
      ]);

      setCoins([
        ...state.coins,
      ]);

      setLetters([
        ...state.letters,
      ]);

      setHud({
        score:
          Math.floor(
            state.score
          ),

        coins:
          state.coinsCollected,

        speed:
          Math.round(
            state.fallSpeed *
            0.45
          ),

        boosting:
          state.boosting,
      });

      if (
        wordJustCompleted ||
        letterCollected
      ) {
        setWordState({
          word: state.word,

          collected: [
            ...state.collected,
          ],
        });
      }

      /* =====================================================
         CRASH
      ===================================================== */

      if (hitEnemy) {
        /* Stop background music */

        if (
          backgroundMusicRef.current
        ) {
          backgroundMusicRef.current.pause();

          backgroundMusicRef.current.currentTime = 0;
        }

        /* Play crash sound */

        if (
          crashSoundRef.current
        ) {
          crashSoundRef.current.currentTime = 0;

          crashSoundRef.current
            .play()
            .catch((error) => {
              console.log(
                "Crash sound could not play:",
                error
              );
            });
        }

        /* Set crashed */

        setCrashed(true);

        /* Update best score */

        setBest(
          (prevBest) => {
            const finalScore =
              Math.floor(
                state.score
              );

            if (
              finalScore >
              prevBest
            ) {
              localStorage.setItem(
                "streetRacerBest",
                String(
                  finalScore
                )
              );

              return finalScore;
            }

            return prevBest;
          }
        );

        return;
      }

      rafRef.current =
        requestAnimationFrame(
          tick
        );
    };

    rafRef.current =
      requestAnimationFrame(
        tick
      );

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(
          rafRef.current
        );
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    started,
    paused,
    crashed,
  ]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div className="logo">
          🏎️
        </div>

        <div className="brand-text">

          <h1>
            STREET RACER
          </h1>

          <p>
            HIGHWAY EDITION
          </p>

        </div>

      </header>

      {/* =====================================================
          GAME LAYOUT
      ===================================================== */}

      <div className="gameLayout">

        {/* ===================================================
            LEFT DASHBOARD
        =================================================== */}

        <aside className="sideBoard leftBoard">

          <div className="statCard">

            <span className="statIcon">
              🏆
            </span>

            <span className="label">
              SCORE
            </span>

            <strong>
              {hud.score}
            </strong>

          </div>

          <div className="statCard coinCard">

            <span className="statIcon">
              🪙
            </span>

            <span className="label">
              COINS
            </span>

            <strong>
              {hud.coins}
            </strong>

          </div>

        </aside>

        {/* ===================================================
            GAME AREA
        =================================================== */}

        <div
          className="gameArea"
          ref={gameAreaRef}
          onMouseMove={
            handlePointerMove
          }
        >

          {/* ROAD GLOW */}

          <div className="roadGlow leftGlow"></div>

          <div className="roadGlow rightGlow"></div>

          {/* ROAD EDGES */}

          <div className="roadEdge leftEdge"></div>

          <div className="roadEdge rightEdge"></div>

          {/* ROAD LINES */}

          <div className="roadLine roadLine1"></div>

          <div className="roadLine roadLine2"></div>

          <div className="roadLine roadLine3"></div>

          <div className="roadLine roadLine4"></div>

          <div className="roadLine roadLine5"></div>

          <div className="roadLine roadLine6"></div>

          {/* =================================================
              WORD CHALLENGE
          ================================================= */}

          {started && (
            <div className="wordChallenge">

              <div className="wordTitle">
                SPELL THE WORD
              </div>

              <div className="wordDisplay">

                {wordState.word
                  .split("")
                  .map(
                    (ch, i) => (
                      <span
                        key={i}
                        className={
                          wordState.collected.includes(
                            ch
                          )
                            ? "collected-letter"
                            : ""
                        }
                      >
                        {ch}
                      </span>
                    )
                  )}

              </div>

              <small>
                Grab the matching letters
              </small>

            </div>
          )}

          {/* =================================================
              SPEED EFFECT
          ================================================= */}

          <div
            id="speedEffect"
            className={
              hud.boosting
                ? "active"
                : ""
            }
          ></div>

          {/* =================================================
              PLAYER
          ================================================= */}

          {started && (
            <div className="playerWrapper">

              <img
                className="car playerCar"
                src="/images/mycar.png"
                alt="Player Car"
                style={{
                  left: `${playerX}%`,
                  transform:
                    "translateX(-50%)",
                }}
              />

            </div>
          )}

          {/* =================================================
              ENEMY CARS
          ================================================= */}

          {enemies.map(
            (e) => (
              <img
                key={e.id}
                className="enemyCar"
                src={e.img}
                alt="Enemy"
                style={{
                  left: `${e.x}%`,
                  top: `${e.y}px`,
                  transform:
                    "translateX(-50%)",
                }}
              />
            )
          )}

          {/* =================================================
              COINS
          ================================================= */}

          <div id="coinContainer">

            {coins.map(
              (c) => (
                <div
                  key={c.id}
                  className="coin"
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}px`,
                    transform:
                      "translateX(-50%)",
                  }}
                >
                  🪙
                </div>
              )
            )}

          </div>

          {/* =================================================
              LETTERS
          ================================================= */}

          <div id="letterContainer">

            {letters.map(
              (l) => (
                <div
                  key={l.id}
                  className="letter"
                  style={{
                    left: `${l.x}%`,
                    top: `${l.y}px`,
                    transform:
                      "translateX(-50%)",
                  }}
                >
                  {l.ch}
                </div>
              )
            )}

          </div>

          {/* =================================================
              START SCREEN
          ================================================= */}

          {!started && (
            <div className="overlay">

              <div className="overlayCard">

                <div className="raceIcon">
                  🏁
                </div>

                <h2>
                  STREET RACER
                </h2>

                <p>
                  Dodge traffic,
                  <br />
                  collect coins &
                  complete words!
                </p>

                <div className="quickControls">

                  <span>
                    ← → DRIVE
                  </span>

                  <span>
                    ⚡ BOOST
                  </span>

                  <span>
                    🪙 COLLECT
                  </span>

                </div>

                <button
                  className="mainButton"
                  onClick={startGame}
                >
                  🏁 START RACE
                </button>

              </div>

            </div>
          )}

          {/* =================================================
              PAUSE SCREEN
          ================================================= */}

          {started &&
            paused &&
            !crashed && (
              <div className="overlay">

                <div className="overlayCard">

                  <div className="pauseIcon">
                    ⏸️
                  </div>

                  <h2>
                    PAUSED
                  </h2>

                  <p>
                    Take a breath.
                    The road will wait.
                  </p>

                  <button
                    className="mainButton"
                    onClick={() =>
                      setPaused(false)
                    }
                  >
                    ▶️ RESUME
                  </button>

                </div>

              </div>
            )}

          {/* =================================================
              CRASH SCREEN
          ================================================= */}

          {crashed && (
            <div className="overlay">

              <div className="overlayCard">

                <div className="crashIcon">
                  💥
                </div>

                <h2>
                  CRASHED!
                </h2>

                <p>

                  Score:
                  <strong>
                    {hud.score}
                  </strong>

                  <br />

                  Best:
                  <strong>
                    {best}
                  </strong>

                  <br />

                  Coins collected:
                  <strong>
                    {hud.coins}
                  </strong>

                </p>

                <button
                  className="mainButton"
                  onClick={
                    restartGame
                  }
                >
                  🔄 RACE AGAIN
                </button>

              </div>

            </div>
          )}

        </div>

        {/* ===================================================
            RIGHT DASHBOARD
        =================================================== */}

        <aside className="sideBoard rightBoard">

          <div className="statCard">

            <span className="statIcon">
              👑
            </span>

            <span className="label">
              BEST
            </span>

            <strong>
              {best}
            </strong>

          </div>

          <div className="statCard speedCard">

            <span className="statIcon">
              ⚡
            </span>

            <span className="label">
              SPEED
            </span>

            <strong>

              {hud.speed}

              <small>
                {" "}KM/H
              </small>

            </strong>

          </div>

        </aside>

      </div>

      {/* =====================================================
          CONTROLS
      ===================================================== */}

      <div className="gameControls">

        {/* LEFT */}

        <button
          className="controlButton directionButton"
          onPointerDown={
            setKey(
              "left",
              true
            )
          }
          onPointerUp={
            setKey(
              "left",
              false
            )
          }
          onPointerLeave={
            setKey(
              "left",
              false
            )
          }
        >

          <span>
            ◀
          </span>

          <small>
            LEFT
          </small>

        </button>

        {/* CENTER */}

        <div className="centerControls">

          {/* ACCEL */}

          <button
            className="controlButton accelerator"
            onPointerDown={
              setKey(
                "boost",
                true
              )
            }
            onPointerUp={
              setKey(
                "boost",
                false
              )
            }
            onPointerLeave={
              setKey(
                "boost",
                false
              )
            }
          >

            <span>
              ⚡
            </span>

            <small>
              ACCEL
            </small>

          </button>

          {/* PAUSE */}

          <button
            className="pauseButton"
            onClick={() =>
              started &&
              !crashed &&
              setPaused(
                (p) => !p
              )
            }
          >
            ⏸️
          </button>

          {/* BRAKE */}

          <button
            className="controlButton brake"
            onPointerDown={
              setKey(
                "brake",
                true
              )
            }
            onPointerUp={
              setKey(
                "brake",
                false
              )
            }
            onPointerLeave={
              setKey(
                "brake",
                false
              )
            }
          >

            <span>
              🛑
            </span>

            <small>
              BRAKE
            </small>

          </button>

        </div>

        {/* RIGHT */}

        <button
          className="controlButton directionButton"
          onPointerDown={
            setKey(
              "right",
              true
            )
          }
          onPointerUp={
            setKey(
              "right",
              false
            )
          }
          onPointerLeave={
            setKey(
              "right",
              false
            )
          }
        >

          <span>
            ▶
          </span>

          <small>
            RIGHT
          </small>

        </button>

      </div>

      {/* =====================================================
          CONTROL INFO
      ===================================================== */}

      <div className="controlInfo">

        <div className="controlItem">

          <span>
            ⌨️
          </span>

          <b>
            Drive
          </b>

          <small>
            ← → / A D
          </small>

        </div>

        <div className="controlItem">

          <span>
            ⚡
          </span>

          <b>
            Boost
          </b>

          <small>
            ↑ / W / Space
          </small>

        </div>

        <div className="controlItem">

          <span>
            🖱️
          </span>

          <b>
            Mouse
          </b>

          <small>
            Move cursor
          </small>

        </div>

        <div className="controlItem">

          <span>
            ⏸️
          </span>

          <b>
            Pause
          </b>

          <small>
            P / Button
          </small>

        </div>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <span>
          🏁 STREET RACER
        </span>

        <i>
          •
        </i>

        <span>
          DRIVE SAFE
        </span>

        <i>
          •
        </i>

        <span>
          BEAT YOUR BEST
        </span>

      </footer>

    </div>
  );
}

export default App;