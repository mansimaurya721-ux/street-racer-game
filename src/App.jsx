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

const WORDS = [
  "RACER",
  "BOOST",
  "SPEED",
  "TURBO",
  "NITRO",
  "DRIFT",
];

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
  const options = WORDS.filter(
    (word) => word !== exclude
  );

  return (
    options[
    Math.floor(
      Math.random() * options.length
    )
    ] || WORDS[0]
  );
}

function loadBest() {
  try {
    const value = Number(
      localStorage.getItem("streetRacerBest")
    );

    return Number.isFinite(value)
      ? value
      : 0;
  } catch {
    return 0;
  }
}


/* =========================================================
   APP
========================================================= */

function App() {
  /* =======================================================
     BASIC STATE
  ======================================================= */

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [crashed, setCrashed] = useState(false);

  const [best, setBest] = useState(loadBest);


  /* =======================================================
     HUD
  ======================================================= */

  const [hud, setHud] = useState({
    score: 0,
    coins: 0,
    speed: 0,
    boosting: false,
  });


  /* =======================================================
     WORD
  ======================================================= */

  const [wordState, setWordState] = useState({
    word: WORDS[0],
    collected: [],
  });


  /* =======================================================
     RENDERED GAME OBJECTS
  ======================================================= */

  const [playerX, setPlayerX] = useState(50);
  const [enemies, setEnemies] = useState([]);
  const [coins, setCoins] = useState([]);
  const [letters, setLetters] = useState([]);
  const [coinBursts, setCoinBursts] = useState([]);


  /* =======================================================
     REFS
  ======================================================= */

  const gameAreaRef = useRef(null);

  const rafRef = useRef(null);

  const lastTimeRef = useRef(null);


  /* =======================================================
     AUDIO
  ======================================================= */

  const backgroundMusicRef = useRef(null);

  const crashSoundRef = useRef(null);


  /* =======================================================
     AUDIO SETUP
  ======================================================= */

  useEffect(() => {
    const bgMusic = new Audio(
      "/alex-morgan-gaming-rock-545508.mp3"
    );

    bgMusic.loop = true;
    bgMusic.volume = 0.35;
    bgMusic.preload = "auto";

    const crashSound = new Audio(
      "/fahhhhh.mp3"
    );

    crashSound.volume = 0.85;
    crashSound.preload = "auto";

    backgroundMusicRef.current = bgMusic;
    crashSoundRef.current = crashSound;

    return () => {
      bgMusic.pause();
      bgMusic.currentTime = 0;

      crashSound.pause();
      crashSound.currentTime = 0;
    };
  }, []);


  /* =======================================================
     MUTABLE GAME STATE
  ======================================================= */

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


  /* =======================================================
     RESPONSIVE GAME SIZE
  ======================================================= */

  const getSizes = useCallback(() => {
    const gameWidth =
      gameAreaRef.current?.clientWidth ||
      window.innerWidth;

    if (gameWidth <= 320) {
      return {
        car: 53,
        enemy: 50,
        edge: 18,
      };
    }

    if (gameWidth <= 380) {
      return {
        car: 55,
        enemy: 53,
        edge: 20,
      };
    }

    if (gameWidth <= 500) {
      return {
        car: 60,
        enemy: 57,
        edge: 22,
      };
    }

    if (gameWidth <= 650) {
      return {
        car: 68,
        enemy: 64,
        edge: 30,
      };
    }

    return {
      car: 76,
      enemy: 70,
      edge: 42,
    };
  }, []);


  /* =======================================================
     CLAMP PLAYER
  ======================================================= */

  const clampPlayerX = useCallback(
    (pct) => {
      const { car, edge } =
        getSizes();

      const width =
        gameAreaRef.current?.clientWidth ||
        500;

      const edgePct =
        (edge / width) * 100;

      const halfCarPct =
        (car / 2 / width) * 100;

      const min =
        edgePct +
        halfCarPct +
        1;

      const max =
        100 -
        edgePct -
        halfCarPct -
        1;

      return Math.min(
        max,
        Math.max(min, pct)
      );
    },
    [getSizes]
  );


  /* =======================================================
     RESET
  ======================================================= */

  const resetGame = useCallback(() => {
    idCounter = 1;

    const newWord = pickWord();

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

      word: newWord,

      collected: new Set(),
    };

    setPlayerX(50);

    setEnemies([]);

    setCoins([]);

    setLetters([]);

    setHud({
      score: 0,
      coins: 0,
      speed: Math.round(
        BASE_FALL_SPEED * 0.45
      ),
      boosting: false,
    });

    setWordState({
      word: newWord,
      collected: [],
    });

    setCrashed(false);

    setPaused(false);
  }, []);


  /* =======================================================
     START
  ======================================================= */

  const startGame = useCallback(() => {
    resetGame();

    setStarted(true);

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;

      backgroundMusicRef.current
        .play()
        .catch(() => {
          console.log(
            "Background music requires user interaction."
          );
        });
    }
  }, [resetGame]);


  /* =======================================================
     RESTART
  ======================================================= */

  const restartGame = useCallback(() => {
    resetGame();

    setStarted(true);

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;

      backgroundMusicRef.current
        .play()
        .catch(() => {
          console.log(
            "Background music requires user interaction."
          );
        });
    }
  }, [resetGame]);


  /* =======================================================
     PAUSE / RESUME AUDIO
  ======================================================= */

  useEffect(() => {
    const music =
      backgroundMusicRef.current;

    if (!music) return;

    if (
      !started ||
      paused ||
      crashed
    ) {
      music.pause();
      return;
    }

    music
      .play()
      .catch(() => { });
  }, [
    started,
    paused,
    crashed,
  ]);


  /* =======================================================
     KEYBOARD
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      const keys =
        gs.current.keys;

      switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          keys.left = true;
          event.preventDefault();
          break;

        case "ArrowRight":
        case "d":
        case "D":
          keys.right = true;
          event.preventDefault();
          break;

        case "ArrowUp":
        case "w":
        case "W":
        case " ":
          keys.boost = true;
          event.preventDefault();
          break;

        case "ArrowDown":
        case "s":
        case "S":
          keys.brake = true;
          event.preventDefault();
          break;

        case "p":
        case "P":
          if (
            started &&
            !crashed
          ) {
            setPaused(
              (value) => !value
            );
          }
          break;

        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      const keys =
        gs.current.keys;

      switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          keys.left = false;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          keys.right = false;
          break;

        case "ArrowUp":
        case "w":
        case "W":
        case " ":
          keys.boost = false;
          break;

        case "ArrowDown":
        case "s":
        case "S":
          keys.brake = false;
          break;

        default:
          break;
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
    started,
    crashed,
  ]);


  /* =======================================================
     RESET KEYS
  ======================================================= */

  const releaseAllKeys = useCallback(() => {
    gs.current.keys.left = false;
    gs.current.keys.right = false;
    gs.current.keys.boost = false;
    gs.current.keys.brake = false;
  }, []);


  /* =======================================================
     BUTTON CONTROL
  ======================================================= */

  const setKey = useCallback(
    (key, value) => {
      if (
        !started ||
        paused ||
        crashed
      ) {
        return;
      }

      gs.current.keys[key] =
        value;
    },
    [
      started,
      paused,
      crashed,
    ]
  );


  /* =======================================================
     POINTER / TOUCH MOVEMENT
  ======================================================= */

  const handlePointerMove = useCallback(
    (event) => {
      if (
        !started ||
        paused ||
        crashed
      ) {
        return;
      }

      const area =
        gameAreaRef.current;

      if (!area) return;

      const rect =
        area.getBoundingClientRect();

      const clientX =
        event.clientX;

      if (
        typeof clientX !== "number"
      ) {
        return;
      }

      const pct =
        ((clientX - rect.left) /
          rect.width) *
        100;

      gs.current.playerX =
        clampPlayerX(pct);
    },
    [
      started,
      paused,
      crashed,
      clampPlayerX,
    ]
  );


  /* =======================================================
     GAME LOOP
  ======================================================= */

  useEffect(() => {
    if (
      !started ||
      paused ||
      crashed
    ) {
      lastTimeRef.current = null;

      if (rafRef.current) {
        cancelAnimationFrame(
          rafRef.current
        );
      }

      return;
    }

    const tick = (time) => {
      if (
        lastTimeRef.current === null
      ) {
        lastTimeRef.current = time;
      }

      const dt = Math.min(
        50,
        time -
        lastTimeRef.current
      );

      lastTimeRef.current = time;

      const state =
        gs.current;

      const area =
        gameAreaRef.current;

      if (!area) {
        rafRef.current =
          requestAnimationFrame(
            tick
          );

        return;
      }

      const areaWidth =
        area.clientWidth;

      const areaHeight =
        area.clientHeight;

      const {
        car: carSize,
        enemy: enemySize,
        edge,
      } = getSizes();


      /* ===================================================
         SPEED
      =================================================== */

      state.elapsed += dt;

      state.boosting =
        state.keys.boost;

      state.braking =
        state.keys.brake &&
        !state.keys.boost;

      const rampSpeed =
        Math.min(
          MAX_FALL_SPEED,

          BASE_FALL_SPEED +
          (state.elapsed /
            1000) *
          FALL_SPEED_PER_SEC *
          10
        );

      let effectiveSpeed =
        rampSpeed;

      if (
        state.boosting
      ) {
        effectiveSpeed *=
          BOOST_MULTIPLIER;
      } else if (
        state.braking
      ) {
        effectiveSpeed *=
          BRAKE_MULTIPLIER;
      }

      state.fallSpeed =
        effectiveSpeed;


      /* ===================================================
         PLAYER MOVEMENT
      =================================================== */

      const movePct =
        (PLAYER_SPEED_PCT_PER_SEC *
          dt) /
        1000;

      if (
        state.keys.left
      ) {
        state.playerX -=
          movePct;
      }

      if (
        state.keys.right
      ) {
        state.playerX +=
          movePct;
      }

      state.playerX =
        clampPlayerX(
          state.playerX
        );


      /* ===================================================
         ENEMY SPAWN
      =================================================== */

      const enemyInterval =
        Math.max(
          ENEMY_SPAWN_MIN_MS,

          ENEMY_SPAWN_START_MS -
          state.elapsed / 12
        );

      state.lastEnemySpawn +=
        dt;

      if (
        state.lastEnemySpawn >=
        enemyInterval
      ) {
        state.lastEnemySpawn = 0;

        const edgePct =
          (edge / areaWidth) *
          100;

        const halfPct =
          (enemySize /
            2 /
            areaWidth) *
          100;

        const available =
          100 -
          2 *
          (
            edgePct +
            halfPct
          );

        const x =
          edgePct +
          halfPct +
          Math.random() *
          available;

        state.enemies.push({
          id: nextId(),

          x,

          y: -180,

          img:
            ENEMY_IMAGES[
            Math.floor(
              Math.random() *
              ENEMY_IMAGES.length
            )
            ],
        });
      }


      /* ===================================================
         COINS
      =================================================== */

      state.lastCoinSpawn +=
        dt;

      if (
        state.lastCoinSpawn >=
        COIN_SPAWN_MS
      ) {
        state.lastCoinSpawn = 0;

        const edgePct =
          (edge / areaWidth) *
          100;

        const available =
          100 -
          2 *
          (edgePct + 4);

        const x =
          edgePct +
          4 +
          Math.random() *
          available;

        state.coins.push({
          id: nextId(),

          x,

          y: -60,
        });
      }


      /* ===================================================
         LETTERS
      =================================================== */

      state.lastLetterSpawn +=
        dt;

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
          (letter) =>
            !state.collected.has(
              letter
            )
        );

        if (
          needed.length > 0
        ) {
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

          const available =
            100 -
            2 *
            (edgePct + 6);

          const x =
            edgePct +
            6 +
            Math.random() *
            available;

          state.letters.push({
            id: nextId(),

            x,

            y: -60,

            ch,
          });
        }
      }


      /* ===================================================
         FALLING OBJECTS
      =================================================== */

      const fallPx =
        (state.fallSpeed *
          dt) /
        1000;

      state.enemies.forEach(
        (enemy) => {
          enemy.y += fallPx;
        }
      );

      state.coins.forEach(
        (coin) => {
          coin.y += fallPx;
        }
      );

      state.letters.forEach(
        (letter) => {
          letter.y += fallPx;
        }
      );


      /* ===================================================
         REMOVE OFFSCREEN
      =================================================== */

      state.enemies =
        state.enemies.filter(
          (enemy) =>
            enemy.y <
            areaHeight + 150
        );

      state.coins =
        state.coins.filter(
          (coin) =>
            coin.y <
            areaHeight + 80
        );

      state.letters =
        state.letters.filter(
          (letter) =>
            letter.y <
            areaHeight + 80
        );


      /* ===================================================
         PLAYER COLLISION
      =================================================== */

      const playerWidth =
        carSize;

      const playerHeight =
        carSize * 1.35;

      const playerLeft =
        (state.playerX /
          100) *
        areaWidth -
        playerWidth / 2;

      const playerBottom =
        30;

      const playerTop =
        areaHeight -
        playerBottom -
        playerHeight;

      const playerRect = {
        left:
          playerLeft +
          playerWidth *
          0.18,

        right:
          playerLeft +
          playerWidth *
          0.82,

        top:
          playerTop +
          playerHeight *
          0.12,

        bottom:
          areaHeight -
          playerBottom -
          playerHeight *
          0.08,
      };


      /* ===================================================
         RECTANGLE HELPER
      =================================================== */

      const rectOf = (
        item,
        size,
        scale = 0.8
      ) => {
        const left =
          (item.x / 100) *
          areaWidth -
          size / 2;

        const inset =
          (size *
            (1 - scale)) /
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

      const overlaps = (
        a,
        b
      ) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;


      /* ===================================================
         ENEMY COLLISION
      =================================================== */

      let hitEnemy = false;

      for (
        const enemy of state.enemies
      ) {
        const enemyRect =
          rectOf(
            enemy,
            enemySize * 1.25,
            0.65
          );

        if (
          overlaps(
            playerRect,
            enemyRect
          )
        ) {
          hitEnemy = true;
          break;
        }
      }


      /* ===================================================
         COIN COLLECTION
      =================================================== */

      const remainingCoins = [];
      const collectedCoinBursts = [];

      let coinsGained = 0;

      for (
        const coin of state.coins
      ) {
        const coinRect =
          rectOf(
            coin,
            38,
            0.9
          );

        if (
          overlaps(
            playerRect,
            coinRect
          )
        ) {
          coinsGained++;
          collectedCoinBursts.push({
            id: coin.id,
            x: coin.x,
            y: coin.y,
          });
        } else {
          remainingCoins.push(
            coin
          );
        }
      }

      state.coins =
        remainingCoins;

      if (
        coinsGained > 0
      ) {
        state.coinsCollected +=
          coinsGained;

        state.score +=
          coinsGained * 15;

        // Create a short-lived bloom/burst for every collected coin.
        if (collectedCoinBursts.length > 0) {
          const burstIds = collectedCoinBursts.map((coin) => ({
            ...coin,
            id: `${coin.id}-${Date.now()}-${Math.random()}`,
          }));

          setCoinBursts((current) => [
            ...current,
            ...burstIds,
          ]);

          window.setTimeout(() => {
            setCoinBursts((current) =>
              current.filter(
                (burst) =>
                  !burstIds.some((item) => item.id === burst.id)
              )
            );
          }, 600);
        }
      }


      /* ===================================================
         LETTER COLLECTION
      =================================================== */

      const remainingLetters = [];

      let letterCollected = false;

      for (
        const letter of
        state.letters
      ) {
        const letterRect =
          rectOf(
            letter,
            48,
            0.9
          );

        if (
          overlaps(
            playerRect,
            letterRect
          )
        ) {
          state.collected.add(
            letter.ch
          );

          letterCollected = true;
        } else {
          remainingLetters.push(
            letter
          );
        }
      }

      state.letters =
        remainingLetters;


      /* ===================================================
         WORD COMPLETION
      =================================================== */

      const uniqueLetters =
        new Set(
          state.word.split("")
        );

      const isComplete =
        [...uniqueLetters].every(
          (letter) =>
            state.collected.has(
              letter
            )
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


      /* ===================================================
         SCORE
      =================================================== */

      state.score +=
        (state.fallSpeed /
          1000) *
        dt *
        0.02;


      /* ===================================================
         REACT UPDATE
      =================================================== */

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
        score: Math.floor(
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


      /* ===================================================
         CRASH
      =================================================== */

      if (hitEnemy) {
        releaseAllKeys();

        if (
          backgroundMusicRef.current
        ) {
          backgroundMusicRef.current.pause();

          backgroundMusicRef.current.currentTime = 0;
        }

        if (
          crashSoundRef.current
        ) {
          crashSoundRef.current.currentTime = 0;

          crashSoundRef.current
            .play()
            .catch(() => { });
        }

        const finalScore =
          Math.floor(
            state.score
          );

        if (
          finalScore > best
        ) {
          try {
            localStorage.setItem(
              "streetRacerBest",
              String(
                finalScore
              )
            );
          } catch { }

          setBest(
            finalScore
          );
        }

        setCrashed(true);

        return;
      }


      /* ===================================================
         NEXT FRAME
      =================================================== */

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

      releaseAllKeys();
    };
  }, [
    started,
    paused,
    crashed,
    best,
    getSizes,
    clampPlayerX,
    releaseAllKeys,
  ]);


  /* =======================================================
     CLEANUP WHEN COMPONENT UNMOUNTS
  ======================================================= */

  useEffect(() => {
    return () => {
      releaseAllKeys();

      if (rafRef.current) {
        cancelAnimationFrame(
          rafRef.current
        );
      }
    };
  }, [
    releaseAllKeys,
  ]);


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="container">

      {/* ===================================================
          HEADER
      =================================================== */}

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


      {/* ===================================================
          LETTER COLLECTOR
      =================================================== */}

      {started && (
        <section className="letterCollector" aria-label="Letter Collector">
          <div className="collectorHeader">
            <div className="collectorIcon">🔤</div>

            <div className="collectorText">
              <span className="collectorLabel">LETTER COLLECTOR</span>
              <span className="collectorHint">Collect letters to complete the word</span>
            </div>
          </div>

          <div className="wordDisplay">
            {wordState.word.split("").map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={
                  wordState.collected.includes(character)
                    ? "collected-letter"
                    : "pending-letter"
                }
              >
                {character}
              </span>
            ))}
          </div>

          <div className="collectorProgress">
            {wordState.collected.length} / {new Set(wordState.word.split("")).size} COLLECTED
          </div>
        </section>
      )}


      {/* ===================================================
          GAME LAYOUT
      =================================================== */}

      <div className="gameLayout">


        {/* =================================================
            LEFT DASHBOARD
        ================================================= */}

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


        {/* =================================================
            GAME AREA
        ================================================= */}

        <div
          className="gameArea"
          ref={gameAreaRef}
          onPointerMove={
            handlePointerMove
          }
          onPointerDown={
            handlePointerMove
          }
        >

          {/* ROAD GLOW */}

          <div className="roadGlow leftGlow" />

          <div className="roadGlow rightGlow" />


          {/* ROAD EDGES */}

          <div className="roadEdge leftEdge" />

          <div className="roadEdge rightEdge" />


          {/* ROAD LINES */}

          <div className="roadLine roadLine1" />

          <div className="roadLine roadLine2" />

          <div className="roadLine roadLine3" />

          <div className="roadLine roadLine4" />

          <div className="roadLine roadLine5" />

          <div className="roadLine roadLine6" />



          {/* SPEED EFFECT */}

          <div
            id="speedEffect"
            className={
              hud.boosting
                ? "active"
                : ""
            }
          />


          {/* =================================================
              PLAYER
          ================================================= */}

          {started && (
            <div className="playerWrapper">

              <img
                className="car playerCar"
                src="/images/mycar.png"
                alt="Player Car"
                draggable="false"
                style={{
                  left: `${playerX}%`,
                  transform:
                    "translateX(-50%)",
                }}
              />

            </div>
          )}


          {/* =================================================
              ENEMIES
          ================================================= */}

          {enemies.map(
            (enemy) => (
              <img
                key={enemy.id}
                className="enemyCar"
                src={enemy.img}
                alt="Enemy car"
                draggable="false"
                style={{
                  left: `${enemy.x}%`,
                  top: `${enemy.y}px`,
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

            {coinBursts.map((burst) => (
              <div
                key={burst.id}
                className="coinBurst"
                style={{
                  left: `${burst.x}%`,
                  top: `${burst.y}px`,
                }}
                aria-hidden="true"
              >
                <span className="burstCore">✦</span>
                <span className="burstRay ray1">✦</span>
                <span className="burstRay ray2">✦</span>
                <span className="burstRay ray3">✦</span>
                <span className="burstRay ray4">✦</span>
                <span className="burstRay ray5">✦</span>
                <span className="burstRay ray6">✦</span>
                <span className="burstRing" />
              </div>
            ))}

            {coins.map(
              (coin) => (
                <div
                  key={coin.id}
                  className="coin"
                  style={{
                    left: `${coin.x}%`,
                    top: `${coin.y}px`,
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
              (letter) => (
                <div
                  key={letter.id}
                  className="letter"
                  style={{
                    left: `${letter.x}%`,
                    top: `${letter.y}px`,
                    transform:
                      "translateX(-50%)",
                  }}
                >
                  {letter.ch}
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
                  <br />
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
                  type="button"
                  className="mainButton"
                  onClick={
                    startGame
                  }
                >
                  🏁 START RACE
                </button>

              </div>

            </div>
          )}


          {/* =================================================
              PAUSE
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
                    <br />
                    The road will wait.
                  </p>

                  <button
                    type="button"
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
              CRASH
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
                  Score:{" "}
                  <strong>
                    {hud.score}
                  </strong>

                  <br />

                  Best:{" "}
                  <strong>
                    {best}
                  </strong>

                  <br />

                  Coins collected:{" "}
                  <strong>
                    {hud.coins}
                  </strong>
                </p>

                <button
                  type="button"
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


        {/* =================================================
            RIGHT DASHBOARD
        ================================================= */}

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


      {/* ===================================================
          GAME CONTROLS
      =================================================== */}

      <div className="gameControls">


        {/* LEFT */}

        <button
          type="button"
          className="controlButton directionButton"
          onPointerDown={() =>
            setKey("left", true)
          }
          onPointerUp={() =>
            setKey("left", false)
          }
          onPointerCancel={() =>
            setKey("left", false)
          }
          onPointerLeave={() =>
            setKey("left", false)
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


          {/* BOOST */}

          <button
            type="button"
            className="controlButton accelerator"
            onPointerDown={() =>
              setKey(
                "boost",
                true
              )
            }
            onPointerUp={() =>
              setKey(
                "boost",
                false
              )
            }
            onPointerCancel={() =>
              setKey(
                "boost",
                false
              )
            }
            onPointerLeave={() =>
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
            type="button"
            className="pauseButton"
            onClick={() => {
              if (
                started &&
                !crashed
              ) {
                setPaused(
                  (value) =>
                    !value
                );
              }
            }}
          >
            ⏸️
          </button>


          {/* BRAKE */}

          <button
            type="button"
            className="controlButton brake"
            onPointerDown={() =>
              setKey(
                "brake",
                true
              )
            }
            onPointerUp={() =>
              setKey(
                "brake",
                false
              )
            }
            onPointerCancel={() =>
              setKey(
                "brake",
                false
              )
            }
            onPointerLeave={() =>
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
          type="button"
          className="controlButton directionButton"
          onPointerDown={() =>
            setKey("right", true)
          }
          onPointerUp={() =>
            setKey("right", false)
          }
          onPointerCancel={() =>
            setKey(
              "right",
              false
            )
          }
          onPointerLeave={() =>
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


      {/* ===================================================
          CONTROL INFO
      =================================================== */}

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
            Mouse / Touch
          </b>

          <small>
            Move on road
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


      {/* ===================================================
          FOOTER
      =================================================== */}

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