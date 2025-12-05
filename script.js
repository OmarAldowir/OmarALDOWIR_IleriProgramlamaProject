// Simple Flappy Bird Clone With Day/Night Cycle & Preloaded Sounds
// All in-game text is in English

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Physics & game constants
const GRAVITY = 0.35;
const JUMP_STRENGTH = -7;
const PIPE_SPEED = 2;
const PIPE_WIDTH = 60;
const PIPE_GAP = 140;
const PIPE_INTERVAL = 1500;
const GROUND_HEIGHT = 40;

// Parallax speeds
const CLOUD_SPEED = 0.3;
const HILL_SPEED = 0.7;
const MOUNTAIN_FAR_SPEED = 0.15;

// Day/Night system
let isNight = false;
let dayNightBlend = 0;     // 0 = day, 1 = night
let lastDayNightSwitch = 0;
const DAY_NIGHT_INTERVAL = 7000; // 7s

// Lerp helper
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Color blending helpers
function skyColor() {
    const day = { r: 135, g: 206, b: 235 };
    const night = { r: 10, g: 20, b: 40 };
    return `rgb(${lerp(day.r, night.r, dayNightBlend)},
                ${lerp(day.g, night.g, dayNightBlend)},
                ${lerp(day.b, night.b, dayNightBlend)})`;
}

function hillColor() {
    const day = { r: 46, g: 125, b: 50 };
    const night = { r: 20, g: 50, b: 30 };
    return `rgb(${lerp(day.r, night.r, dayNightBlend)},
                ${lerp(day.g, night.g, dayNightBlend)},
                ${lerp(day.b, night.b, dayNightBlend)})`;
}

function mountainColor() {
    const day = { r: 85, g: 102, b: 119 };
    const night = { r: 40, g: 45, b: 70 };
    return `rgb(${lerp(day.r, night.r, dayNightBlend)},
                ${lerp(day.g, night.g, dayNightBlend)},
                ${lerp(day.b, night.b, dayNightBlend)})`;
}

function pipeColor() {
    const day = { r: 27, g: 94, b: 32 };
    const night = { r: 10, g: 40, b: 15 };
    return `rgb(${lerp(day.r, night.r, dayNightBlend)},
                ${lerp(day.g, night.g, dayNightBlend)},
                ${lerp(day.b, night.b, dayNightBlend)})`;
}

// Background layers
let clouds = [];
let hills = [];
let mountainsFar = [];

// Bird skins
const skins = ["#f1c40f", "#e74c3c", "#9b59b6", "#2ecc71", "#3498db"];
let currentSkin = 0;

// UI elements
const skinBtn = document.getElementById("skinBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBestBtn = document.getElementById("resetBestBtn");

// Preloaded audio elements
const flySoundEl = document.getElementById("flySound");
const deathSoundEl = document.getElementById("deathSound");
const bestSoundEl = document.getElementById("bestSound");

// Sound helpers (clone preloaded audio so no network delay, no cutting)
function playFlySound() {
    if (!flySoundEl) return;
    const s = flySoundEl.cloneNode();
    s.volume = 0.5;
    s.play().catch(() => {});
}

function playDeathSound() {
    if (!deathSoundEl) return;
    const s = deathSoundEl.cloneNode();
    s.volume = 0.7;
    s.play().catch(() => {});
}

function playBestSound() {
    if (!bestSoundEl) return;
    const s = bestSoundEl.cloneNode();
    s.volume = 0.6;
    s.play().catch(() => {});
}

// Shake + fade
let shakeTime = 0;
const SHAKE_DURATION = 250;
const SHAKE_MAGNITUDE = 6;

let deathFade = 0;
const DEATH_FADE_TIME = 700;

// Game state
let bird;
let pipes = [];
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let gameState = "ready"; // "ready", "playing", "paused", "gameover"
let lastTime = 0;
let lastPipeTime = 0;

// Bird factory
function createBird() {
    return {
        x: canvas.width * 0.25,
        y: canvas.height / 2,
        radius: 15,
        velocityY: 0,
        rotation: 0
    };
}

// Background init
function initBackground() {
    clouds = [];
    mountainsFar = [];
    hills = [];

    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: i * 130 + Math.random() * 60,
            y: 60 + Math.random() * 120,
            radius: 20 + Math.random() * 10
        });
    }

    for (let i = 0; i < 3; i++) {
        mountainsFar.push({
            x: i * 280,
            width: 340,
            height: 120 + Math.random() * 40
        });
    }

    for (let i = 0; i < 3; i++) {
        hills.push({
            x: i * 220,
            width: 240,
            height: 70 + Math.random() * 30
        });
    }
}

// Reset game
function resetGame() {
    bird = createBird();
    pipes = [];
    score = 0;
    shakeTime = 0;
    deathFade = 0;

    // reset day/night
    dayNightBlend = 0;
    isNight = false;
    lastDayNightSwitch = performance.now();

    gameState = "ready";
    lastTime = performance.now();
    lastPipeTime = 0;

    initBackground();
    if (pauseBtn) pauseBtn.textContent = "Pause";
}

// Spawn pipe
function spawnPipe() {
    const min = 100;
    const max = canvas.height - 100;
    const gapY = Math.random() * (max - min) + min;

    pipes.push({
        x: canvas.width,
        width: PIPE_WIDTH,
        gapY: gapY,
        gapHeight: PIPE_GAP,
        passed: false
    });
}

// Input (jump / restart)
function handleInput() {
    if (gameState === "ready") {
        gameState = "playing";
        bird.velocityY = JUMP_STRENGTH;
        playFlySound();
    } else if (gameState === "playing") {
        bird.velocityY = JUMP_STRENGTH;
        playFlySound();
    } else if (gameState === "gameover") {
        resetGame();
    }
}

// Pause toggle
function togglePause() {
    if (gameState === "playing") {
        gameState = "paused";
        pauseBtn.textContent = "Resume";
    } else if (gameState === "paused") {
        gameState = "playing";
        pauseBtn.textContent = "Pause";
    }
}

// Update game
function update(delta) {
    if (gameState !== "playing") return;

    const now = performance.now();

    // Day/night switch
    if (now - lastDayNightSwitch >= DAY_NIGHT_INTERVAL) {
        isNight = !isNight;
        lastDayNightSwitch = now;
    }

    // Blend day/night smoothly
    dayNightBlend += (isNight ? 1 : -1) * delta / 1500;
    dayNightBlend = Math.max(0, Math.min(1, dayNightBlend));

    // Parallax movement
    clouds.forEach(c => {
        c.x -= CLOUD_SPEED;
        if (c.x < -120) c.x = canvas.width + 120;
    });

    mountainsFar.forEach(m => {
        m.x -= MOUNTAIN_FAR_SPEED;
        if (m.x + m.width < 0) m.x = canvas.width + 120;
    });

    hills.forEach(h => {
        h.x -= HILL_SPEED;
        if (h.x + h.width < 0) h.x = canvas.width + 60;
    });

    // Bird physics
    bird.velocityY += GRAVITY;
    bird.y += bird.velocityY;

    // Rotation (tilt)
    if (bird.velocityY < -2) {
        bird.rotation = Math.min(bird.rotation + 0.2, 0.6);
    } else {
        bird.rotation = Math.max(bird.rotation - 0.15, -1.2);
    }

    // Hit ground or top
    if (bird.y + bird.radius > canvas.height - GROUND_HEIGHT || bird.y < bird.radius) {
        gameOver();
    }

    // Spawn pipes
    if (now - lastPipeTime > PIPE_INTERVAL) {
        spawnPipe();
        lastPipeTime = now;
    }

    // Move pipes & scoring
    pipes.forEach((p, i) => {
        p.x -= PIPE_SPEED;

        if (!p.passed && p.x + p.width < bird.x) {
            score++;
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem("bestScore", bestScore);
                playBestSound();
            }
            p.passed = true;
        }

        if (checkCollision(bird, p)) gameOver();
        if (p.x + p.width < 0) pipes.splice(i, 1);
    });
}

// Collision check
function checkCollision(bird, pipe) {
    const inX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width;
    if (!inX) return false;

    const top = pipe.gapY - pipe.gapHeight / 2;
    const bottom = pipe.gapY + pipe.gapHeight / 2;

    return bird.y - bird.radius < top || bird.y + bird.radius > bottom;
}

// Game over
function gameOver() {
    if (gameState !== "gameover") {
        playDeathSound();
        shakeTime = SHAKE_DURATION;
        deathFade = 0;
    }
    gameState = "gameover";
}

// Draw
function draw() {
    ctx.save();

    // Screen shake
    if (shakeTime > 0) {
        ctx.translate(
            (Math.random() - 0.5) * SHAKE_MAGNITUDE,
            (Math.random() - 0.5) * SHAKE_MAGNITUDE
        );
    }

    // Sky
    ctx.fillStyle = skyColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars at night
    if (dayNightBlend > 0.5) {
        ctx.fillStyle = "white";
        for (let i = 0; i < 40; i++) {
            const x = (i * 70 + performance.now() / 50) % canvas.width;
            const y = (i * 33) % (canvas.height / 2);
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // Clouds
    clouds.forEach(c => {
        ctx.fillStyle = `rgba(255,255,255,${lerp(1, 0.3, dayNightBlend)})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.radius * 1.5, c.radius, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    // Far mountains
    ctx.fillStyle = mountainColor();
    mountainsFar.forEach(m => {
        ctx.beginPath();
        ctx.moveTo(m.x, canvas.height - GROUND_HEIGHT);
        ctx.lineTo(m.x + m.width / 2, canvas.height - GROUND_HEIGHT - m.height);
        ctx.lineTo(m.x + m.width, canvas.height - GROUND_HEIGHT);
        ctx.fill();
    });

    // Hills
    ctx.fillStyle = hillColor();
    hills.forEach(h => {
        ctx.beginPath();
        ctx.moveTo(h.x, canvas.height - GROUND_HEIGHT);
        ctx.quadraticCurveTo(
            h.x + h.width / 2,
            canvas.height - GROUND_HEIGHT - h.height,
            h.x + h.width,
            canvas.height - GROUND_HEIGHT
        );
        ctx.fill();
    });

    // Pipes
    ctx.fillStyle = pipeColor();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    pipes.forEach(p => {
        const topHeight = p.gapY - p.gapHeight / 2;
        const bottomStart = p.gapY + p.gapHeight / 2;

        ctx.fillRect(p.x, 0, p.width, topHeight);
        ctx.fillRect(p.x, bottomStart, p.width, canvas.height - bottomStart - GROUND_HEIGHT);

        ctx.strokeRect(p.x, 0, p.width, topHeight);
        ctx.strokeRect(p.x, bottomStart, p.width, canvas.height - bottomStart - GROUND_HEIGHT);
    });

    // Ground
    ctx.fillStyle = dayNightBlend > 0.5 ? "#4d4d4d" : "#ded895";
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    // Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (gameState === "gameover") {
        ctx.globalAlpha = 1 - deathFade;
    }

    // Body
    ctx.fillStyle = skins[currentSkin];
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Expression
    let expr = "normal";
    if (gameState === "gameover") expr = "dead";
    else if (bird.velocityY < -3) expr = "up";
    else if (bird.velocityY > 3) expr = "down";

    const ex = bird.radius * 0.35;
    const ey = -bird.radius * 0.35;

    if (expr === "dead") {
        ctx.beginPath();
        ctx.moveTo(ex - 3, ey - 3);
        ctx.lineTo(ex + 3, ey + 3);
        ctx.moveTo(ex + 3, ey - 3);
        ctx.lineTo(ex - 3, ey + 3);
        ctx.stroke();
    } else {
        let eSize = expr === "up" ? 4 : expr === "down" ? 2.5 : 3;

        ctx.beginPath();
        ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        if (expr === "up") ctx.arc(0, bird.radius * 0.2, 4, 0, Math.PI, false);
        else if (expr === "down") ctx.arc(0, bird.radius * 0.45, 4, Math.PI, 0, true);
        else {
            ctx.moveTo(-3, bird.radius * 0.4);
            ctx.lineTo(3, bird.radius * 0.4);
        }
        ctx.stroke();
    }

    ctx.restore();

    // UI
    ctx.fillStyle = "#000";
    ctx.font = "24px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("Best: " + bestScore, 10, 60);

    ctx.textAlign = "center";

    if (gameState === "ready") {
        ctx.font = "28px Arial";
        ctx.fillText("Press SPACE or CLICK to start", canvas.width / 2, canvas.height / 2);
    }

    if (gameState === "paused") {
        ctx.font = "32px Arial";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }

    if (gameState === "gameover") {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;

        ctx.font = "32px Arial";
        ctx.strokeText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#ff0000";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = "20px Arial";
        const scoreText = `Score: ${score} | Best: ${bestScore}`;
        ctx.strokeText(scoreText, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillStyle = "#000";
        ctx.fillText(scoreText, canvas.width / 2, canvas.height / 2 + 10);

        const restartText = "Press SPACE or CLICK to restart";
        ctx.strokeText(restartText, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText(restartText, canvas.width / 2, canvas.height / 2 + 40);
    }

    ctx.restore();
}

// Main loop
function gameLoop(t) {
    const delta = t - lastTime;
    lastTime = t;

    if (shakeTime > 0) shakeTime -= delta;

    if (gameState === "gameover") {
        deathFade += delta / DEATH_FADE_TIME;
        if (deathFade > 1) deathFade = 1;
        bird.y += 0.1 * delta;
    }

    update(delta);
    draw();
    requestAnimationFrame(gameLoop);
}

// Events
document.addEventListener("keydown", e => {
    if (e.code === "Space") {
        e.preventDefault();
        handleInput();
    }
    if (e.code === "KeyP") {
        e.preventDefault();
        togglePause();
    }
});

canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });

// Skin button
skinBtn.addEventListener("click", () => {
    currentSkin = (currentSkin + 1) % skins.length;
});

// Pause button
pauseBtn.addEventListener("click", togglePause);

// Reset best score button
resetBestBtn.addEventListener("click", () => {
    bestScore = 0;
    localStorage.removeItem("bestScore");
});

// Init
resetGame();
requestAnimationFrame(gameLoop);
