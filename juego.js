// Mapa estructural base 15x15 (1=Pared, 0=Camino, 3=Fruta Invisibilidad, 4=Fruta Caza)
const originalMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,3,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1],
    [1,4,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,4,1],
    [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,3,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const width = 15;
let map = [];

// Estados del Juego
let currentLevel = 1;
let totalScore = 0; 
let levelDotsEaten = 0;
let lives = 3;
let pacmanPos = { x: 1, y: 1 };
let dotsLeft = 0;
let gameTime = 0;

// Emojis de frutas según el nivel
const fruitHideEmojis = ['🍓', '🍇', '🍉', '🥝', '🍑'];
const fruitEatEmojis  = ['🍒', '🍋', '🍊', '🍍', '🍌'];

// Intervals y Timers
let ghostInterval;
let timeInterval;
let powerHideTimer = null;
let powerEatTimer = null;

// Estados especiales
let ghostsHidden = false;
let ghostsVulnerable = false;
let ghosts = [];

const wallThemes = [
    "#1a237e", "#b71c1c", "#006064", "#1b5e20", "#4a148c", 
    "#e65100", "#004d40", "#3e2723", "#263238", "#880e4f"
];
let currentWallColor = "#1a237e";

// --- MOTOR DE AUDIO ---
const AudioEngine = {
    ctx: null,
    musicInterval: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    playTone(freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        try {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    },
    startMusic() {
        this.init();
        clearInterval(this.musicInterval);
        let step = 0;
        this.musicInterval = setInterval(() => {
            const notes = [110, 130, 146, 165];
            this.playTone(notes[step % 4], 'sawtooth', 0.25, 0.04);
            step++;
        }, 300);
    },
    stopMusic() { clearInterval(this.musicInterval); },
    playDotSound() { this.playTone(880, 'sine', 0.08, 0.06); },
    playPowerSound() {
        this.playTone(1200, 'triangle', 0.15, 0.1);
        setTimeout(() => this.playTone(1500, 'triangle', 0.15, 0.1), 80);
    },
    playDeathSound() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }
};

// --- ANMACIÓN FONDO PELOTAS ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let balls = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

for(let i=0; i<35; i++) {
    balls.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 8 + 4
    });
}

function animateBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 0, 127, 0.25)"; 
    balls.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        if(b.x < 0 || b.x > canvas.width) b.vx *= -1;
        if(b.y < 0 || b.y > canvas.height) b.vy *= -1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animateBackground);
}
animateBackground();

// --- ELEMENTOS DOM ---
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const levelScreen = document.getElementById('level-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');
const mazeContainer = document.getElementById('maze');

const uiLevel = document.getElementById('ui-level');
const uiScore = document.getElementById('ui-score');
const uiLives = document.getElementById('ui-lives');
const uiTime = document.getElementById('ui-time');

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-reset').addEventListener('click', resetCurrentGame);
document.getElementById('btn-next').addEventListener('click', nextLevel);
document.getElementById('btn-restart-over').addEventListener('click', resetToLevel1);
document.getElementById('btn-restart-victory').addEventListener('click', resetToLevel1);

function startGame() {
    AudioEngine.init();
    AudioEngine.startMusic();
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentLevel = 1;
    totalScore = 0;
    lives = 3;
    loadLevel();
}

function resetToLevel1() {
    gameoverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    startGame();
}

function resetCurrentGame() {
    lives = 3;
    loadLevel();
}

function loadLevel() {
    clearInterval(ghostInterval);
    clearInterval(timeInterval);
    clearTimeout(powerHideTimer);
    clearTimeout(powerEatTimer);
    
    ghostsHidden = false;
    ghostsVulnerable = false;
    levelDotsEaten = 0;
    gameTime = 0;

    currentWallColor = wallThemes[Math.floor(Math.random() * wallThemes.length)];
    map = JSON.parse(JSON.stringify(originalMap));
    pacmanPos = { x: 1, y: 1 };
    
    ghosts = [
        { x: 13, y: 1, class: 'ghost-red', alive: true },
        { x: 1, y: 13, class: 'ghost-blue', alive: true },
        { x: 13, y: 13, class: 'ghost-yellow', alive: true },
        { x: 7, y: 7, class: 'ghost-pink', alive: true }
    ];

    drawMaze();
    updateUI();

    timeInterval = setInterval(() => {
        gameTime++;
        uiTime.innerText = gameTime + "s";
    }, 1000);

    // Ajuste de velocidad para la persecución inteligente
    const speed = Math.max(120, 360 - (currentLevel * 22));
    ghostInterval = setInterval(moveGhosts, speed);
}

function drawMaze() {
    mazeContainer.innerHTML = '';
    dotsLeft = 0;

    // Seleccionar emojis según el nivel actual
    const hideEmoji = fruitHideEmojis[(currentLevel - 1) % fruitHideEmojis.length];
    const eatEmoji  = fruitEatEmojis[(currentLevel - 1) % fruitEatEmojis.length];

    for (let y = 0; y < width; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (map[y][x] === 1) {
                cell.classList.add('wall');
                cell.style.backgroundColor = currentWallColor;
            } else {
                cell.classList.add('road');
                if ((x !== 1 || y !== 1) && (x !== 7 || y !== 7)) {
                    if (map[y][x] === 0) {
                        const dot = document.createElement('div');
                        dot.classList.add('dot');
                        cell.appendChild(dot);
                        dotsLeft++;
                    } else if (map[y][x] === 3) {
                        // Cambiado por Fruta Emoji
                        const sp = document.createElement('span');
                        sp.classList.add('fruit-hide');
                        sp.innerText = hideEmoji;
                        cell.appendChild(sp);
                        dotsLeft++;
                    } else if (map[y][x] === 4) {
                        // Cambiado por Fruta Emoji
                        const sp = document.createElement('span');
                        sp.classList.add('fruit-eat');
                        sp.innerText = eatEmoji;
                        cell.appendChild(sp);
                        dotsLeft++;
                    }
                }
            }
            mazeContainer.appendChild(cell);
        }
    }
    placeCharacters();
}

function placeCharacters() {
    document.querySelectorAll('.pacman, .ghost').forEach(el => el.remove());

    const pacCell = getCell(pacmanPos.x, pacmanPos.y);
    if(pacCell) {
        const pacHTML = document.createElement('div');
        pacHTML.classList.add('pacman');
        pacCell.appendChild(pacHTML);
    }

    ghosts.forEach(g => {
        if (!g.alive) return;
        const ghostCell = getCell(g.x, g.y);
        if(ghostCell) {
            const ghostHTML = document.createElement('div');
            ghostHTML.classList.add('ghost', g.class);
            if (ghostsHidden) ghostHTML.classList.add('invisible-mode');
            if (ghostsVulnerable) ghostHTML.classList.add('vulnerable-mode');
            ghostCell.appendChild(ghostHTML);
        }
    });
}

function getCell(x, y) { return document.querySelector(`[data-x="${x}"][data-y="${y}"]`); }

function updateUI() {
    uiLevel.innerText = currentLevel;
    uiScore.innerText = totalScore + " pts";
    uiLives.innerText = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    uiTime.innerText = gameTime + "s";
}

// Movimiento e inteligencia artificial de los fantasmas (Algoritmo de Rastreo / Distancia Manhattan)
function moveGhosts() {
    if (ghostsHidden) return; 

    const directions = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];

    ghosts.forEach(g => {
        if (!g.alive) return;
        let bestDir = null;
        let minDistance = Infinity;

        // Evaluar cuál dirección los acerca más a Pacman (o los aleja si están vulnerables)
        directions.forEach(dir => {
            let nextX = g.x + dir.x;
            let nextY = g.y + dir.y;

            if (map[nextY] && map[nextY][nextX] !== 1) {
                // Distancia absoluta hacia la posición de Pacman
                let dist = Math.abs(nextX - pacmanPos.x) + Math.abs(nextY - pacmanPos.y);
                
                if (ghostsVulnerable) {
                    // Si el jugador tiene poder de caza, los fantasmas huyen (buscan la máxima distancia)
                    if (dist > minDistance || bestDir === null) {
                        minDistance = dist;
                        bestDir = dir;
                    }
                } else {
                    // Persecución activa inteligente (buscan la menor distancia para interceptar)
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestDir = dir;
                    }
                }
            }
        });

        // Si se encuentra un camino válido hacia el objetivo, se desplaza
        if (bestDir) {
            g.x += bestDir.x;
            g.y += bestDir.y;
        }
    });

    placeCharacters();
    checkCollisions();
}

document.addEventListener('keydown', (e) => {
    if (gameContainer.classList.contains('hidden')) return;

    let nextX = pacmanPos.x;
    let nextY = pacmanPos.y;

    if (e.key === 'ArrowUp' || e.key === 'Up') nextY--;
    else if (e.key === 'ArrowDown' || e.key === 'Down') nextY++;
    else if (e.key === 'ArrowLeft' || e.key === 'Left') nextX--;
    else if (e.key === 'ArrowRight' || e.key === 'Right') nextX++;
    else return;

    if (map[nextY] && map[nextY][nextX] !== 1) {
        pacmanPos.x = nextX;
        pacmanPos.y = nextY;
        
        const cell = getCell(nextX, nextY);
        
        const dot = cell.querySelector('.dot');
        if (dot) {
            dot.remove();
            map[nextY][nextX] = 2;
            dotsLeft--;
            levelDotsEaten++;
            totalScore++;
            AudioEngine.playDotSound();
            updateUI();
        }

        const fHide = cell.querySelector('.fruit-hide');
        if (fHide) {
            fHide.remove();
            map[nextY][nextX] = 2;
            dotsLeft--;
            levelDotsEaten += 15;
            totalScore += 15;
            AudioEngine.playPowerSound();
            triggerHidePower();
            updateUI();
        }

        const fEat = cell.querySelector('.fruit-eat');
        if (fEat) {
            fEat.remove();
            map[nextY][nextX] = 2;
            dotsLeft--;
            levelDotsEaten += 15;
            totalScore += 15;
            AudioEngine.playPowerSound();
            triggerEatPower();
            updateUI();
        }

        placeCharacters();
        checkCollisions();

        if (dotsLeft <= 0) {
            levelComplete();
        }
    }
});

function triggerHidePower() {
    ghostsHidden = true;
    clearTimeout(powerHideTimer);
    powerHideTimer = setTimeout(() => {
        ghostsHidden = false;
        placeCharacters();
    }, 8000);
}

function triggerEatPower() {
    ghostsVulnerable = true;
    clearTimeout(powerEatTimer);
    powerEatTimer = setTimeout(() => {
        ghostsVulnerable = false;
        placeCharacters();
    }, 8000);
}

function checkCollisions() {
    ghosts.forEach(g => {
        if (!g.alive) return;
        if (g.x === pacmanPos.x && g.y === pacmanPos.y) {
            if (ghostsVulnerable && !ghostsHidden) {
                g.alive = false;
                totalScore += 50;
                levelDotsEaten += 50;
                AudioEngine.playPowerSound();
                updateUI();
            } else if (!ghostsHidden) {
                lives--;
                AudioEngine.playDeathSound();
                updateUI();
                
                if (lives <= 0) {
                    gameOver();
                } else {
                    pacmanPos = { x: 1, y: 1 };
                    placeCharacters();
                }
            }
        }
    });
}

function levelComplete() {
    clearInterval(ghostInterval);
    clearInterval(timeInterval);

    let scoreByLives = 0;
    if (lives === 3) scoreByLives = 750;
    else if (lives === 2) scoreByLives = 500;
    else if (lives === 1) scoreByLives = 250;

    let subTotalLevel = scoreByLives + levelDotsEaten;
    let dynamicPreviousTotal = totalScore - levelDotsEaten;
    totalScore = dynamicPreviousTotal + subTotalLevel;

    if (currentLevel === 10) {
        gameContainer.classList.add('hidden');
        AudioEngine.stopMusic();
        document.getElementById('final-grand-total').innerText = `${totalScore} pts`;
        document.getElementById('final-lives').innerText = '❤️'.repeat(lives);
        victoryScreen.classList.remove('hidden');
    } else {
        document.getElementById('level-msg').innerText = `Nivel ${currentLevel} completado`;
        document.getElementById('level-lives-points').innerText = `${scoreByLives} pts`;
        document.getElementById('level-dots-points').innerText = `${levelDotsEaten} pts`;
        document.getElementById('level-subtotal').innerText = `${subTotalLevel} pts`;
        document.getElementById('level-grand-total').innerText = `${totalScore} pts`;
        document.getElementById('level-lives-count').innerText = '❤️'.repeat(lives) + ` (${lives} restantes)`;
        
        gameContainer.classList.add('hidden');
        levelScreen.classList.remove('hidden');
    }
}

function nextLevel() {
    levelScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentLevel++;
    loadLevel();
}

function gameOver() {
    clearInterval(ghostInterval);
    clearInterval(timeInterval);
    AudioEngine.stopMusic();
    gameContainer.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
}