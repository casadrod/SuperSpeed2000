// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get UI elements
const scoreEl = document.getElementById('score');
const speedLevelEl = document.getElementById('speedLevel');
const messageEl = document.getElementById('message');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 400;

// --- Game Constants and Variables ---
let isGameRunning = false;
let animationFrameId;
let score = 0;
let speedUpCount = 0;
let scoreAccumulator = 0; // NEW: For fractional scoring

// Speed settings
const INITIAL_SPEED = 3;
const MAX_SPEED_LEVEL = 20; // NEW: Max level for speed
// NEW: Calculate max speed to cross 800px in 0.25s (at 60fps)
const MAX_SPEED = canvas.width / (0.25 * 60); 
let gameSpeed = INITIAL_SPEED;

// Player (the arrow/ship)
const player = {
    x: 100,
    y: canvas.height / 2,
    width: 30,
    height: 10,
    velocityY: 0,
    baseMoveSpeed: 4,
};

// Particle system for the tail
let particles = [];

// Obstacles
let obstacles = [];
let obstacleSpawnTimer = 0;
const OBSTACLE_SPAWN_INTERVAL = 90;
const OBSTACLE_PADDING = 30;

// --- Drawing Functions ---

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(player.width, 0);
    ctx.lineTo(0, -player.height / 2);
    ctx.lineTo(0, player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = `rgba(0, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawObstacles() {
    ctx.fillStyle = '#f33';
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// --- Update Functions ---

function updatePlayer() {
    player.y += player.velocityY;

    // NEW: Boundary Repulsion Logic
    // If player hits the top, push them down by one ship height
    if (player.y - player.height / 2 <= 0) {
        player.y += player.height * 1.5; // Push down
        player.velocityY = player.baseMoveSpeed * 0.5; // Add a little downward force
    }
    // If player hits the bottom, push them up by one ship height
    if (player.y + player.height / 2 >= canvas.height) {
        player.y -= player.height * 1.5; // Push up
        player.velocityY = -player.baseMoveSpeed * 0.5; // Add a little upward force
    }

    // Generate particles for the tail
    particles.push({
        x: player.x,
        y: player.y,
        size: Math.random() * 3 + 1,
        opacity: 1,
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x -= gameSpeed;
        p.opacity -= 0.02;
        p.size *= 0.98;
        if (p.opacity <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateObstacles() {
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer > OBSTACLE_SPAWN_INTERVAL) {
        if (obstacles.length < 4) {
            let height = Math.random() * 80 + 20;
            let width = Math.random() * 40 + 20;
            let yPosition = Math.random() * (canvas.height - height - OBSTACLE_PADDING * 2) + OBSTACLE_PADDING;
            obstacles.push({ x: canvas.width, y: yPosition, width: width, height: height });
        }
        obstacleSpawnTimer = 0;
    }
    
    obstacles.forEach(obstacle => obstacle.x -= gameSpeed);
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
}

function checkCollisions() {
    for (const obstacle of obstacles) {
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y - player.height / 2 < obstacle.y + obstacle.height &&
            player.y + player.height / 2 > obstacle.y
        ) {
            return true;
        }
    }
    return false;
}

// NEW: Updated scoring logic
function updateScore() {
    // Score per second = speed level + 1. Divide by 60 for per-frame amount.
    scoreAccumulator += (speedUpCount * speedUpCount) / 60;
    if (scoreAccumulator >= 1) {
        const pointsToAdd = Math.floor(scoreAccumulator);
        score += pointsToAdd;
        scoreAccumulator -= pointsToAdd;
        scoreEl.textContent = `Score: ${score}`;
    }
}

// --- Main Game Loop ---

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayer();
    updateParticles();
    updateObstacles();
    updateScore(); // Updated scoring
    
    drawParticles();
    drawPlayer();
    drawObstacles();

    if (checkCollisions()) {
        endGame();
        return;
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game State Management ---

function startGame() {
    if (isGameRunning) return;
    isGameRunning = true;
    
    player.y = canvas.height / 2;
    player.velocityY = 0;
    obstacles = [];
    particles = [];
    score = 0;
    scoreAccumulator = 0; // Reset accumulator
    speedUpCount = 0;
    gameSpeed = INITIAL_SPEED;
    
    scoreEl.textContent = 'Score: 0';
    speedLevelEl.textContent = 'Speed Lvl: 0';
    messageEl.style.display = 'none';

    gameLoop();
}

function endGame() {
    isGameRunning = false;
    cancelAnimationFrame(animationFrameId);
    messageEl.innerHTML = `Game Over! Your Score: ${score}<br>Press any key to Restart.`;
    messageEl.style.display = 'block';
}

// --- Event Listeners for controls ---
const keyState = {};

window.addEventListener('keydown', (e) => {
    // NEW: Manual speed increase with Right Arrow
    if (e.code === 'Digit6' && isGameRunning) {
        if (speedUpCount < MAX_SPEED_LEVEL) {
            speedUpCount++;
            // Linearly interpolate speed between INITIAL and MAX based on level
            gameSpeed = INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * (speedUpCount / MAX_SPEED_LEVEL);
            speedLevelEl.textContent = `Speed Lvl: ${speedUpCount}`;
        }
        return; // Prevent this key from affecting movement
    }

        // NEW: Manual speed increase with Right Arrow
    if (e.code === 'Digit4' && isGameRunning) {
        if (speedUpCount > 1) {
            speedUpCount--;
            // Linearly interpolate speed between INITIAL and MAX based on level
            gameSpeed = INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * (speedUpCount / MAX_SPEED_LEVEL);
            speedLevelEl.textContent = `Speed Lvl: ${speedUpCount}`;
        }
        return; // Prevent this key from affecting movement
    }

    if (!isGameRunning) {
        startGame();
        return;
    }
    
    keyState[e.code] = true;
    updatePlayerVelocity();
});

window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    updatePlayerVelocity();
});

function updatePlayerVelocity() {
    player.velocityY = 0;

    if (keyState['Numpad9'] || keyState['Digit9']) player.velocityY = -player.baseMoveSpeed * 2;
    else if (keyState['Numpad8'] || keyState['Digit8']) player.velocityY = -player.baseMoveSpeed * 1.5;
    else if (keyState['Numpad7'] || keyState['Digit7']) player.velocityY = -player.baseMoveSpeed;
    
    if (keyState['Numpad1'] || keyState['Digit1']) player.velocityY = player.baseMoveSpeed * 2;
    else if (keyState['Numpad2'] || keyState['Digit2']) player.velocityY = player.baseMoveSpeed * 1.5;
    else if (keyState['Numpad3'] || keyState['Digit3']) player.velocityY = player.baseMoveSpeed;
}