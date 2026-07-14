// Estructura del laberinto de 15x15. (1 = Pared, 0 = Camino con puntos)
const originalMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const width = 15;
let map = JSON.parse(JSON.stringify(originalMap));

// Variables del estado global
let currentLevel = 1;
let totalScore = 0;
let lives = 3;
let pacmanPos = { x: 1, y: 1 };
let dotsLeft = 0;
let levelScoreMultiplier = 250; // Ajustador basado en las vidas con las que se finaliza
let ghostInterval;

// Definición de Fantasmas
let ghosts = [
    { x: 13, y: 1, class: 'ghost-red', currentDir: {x: 0, y: 0} },
    { x: 1, y: 13, class: 'ghost-blue', currentDir: {x: 0, y: 0} },
    { x: 13, y: 13, class: 'ghost-yellow', currentDir: {x: 0, y: 0} },
    { x: 7, y: 7, class: 'ghost-pink', currentDir: {x: 0, y: 0} }
];

// Elementos del DOM
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const levelScreen = document.getElementById('level-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');

const mazeContainer = document.getElementById('maze');
const uiLevel = document.getElementById('ui-level');
const uiScore = document.getElementById('ui-score');
const uiLives = document.getElementById('ui-lives');

// Eventos de botones
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-reset').addEventListener('click', resetCurrentGame);
document.getElementById('btn-next').addEventListener('click', nextLevel);
document.getElementById('btn-restart-over').addEventListener('click', resetToLevel1);
document.getElementById('btn-restart-victory').addEventListener('click', resetToLevel1);

// Inicializar el juego desde cero
function startGame() {
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

// Carga de Nivel
function loadLevel() {
    clearInterval(ghostInterval);
    map = JSON.parse(JSON.stringify(originalMap));
    pacmanPos = { x: 1, y: 1 };
    
    // Ubicación inicial de fantasmas
    ghosts = [
        { x: 13, y: 1, class: 'ghost-red', currentDir: {x: -1, y: 0} },
        { x: 1, y: 13, class: 'ghost-blue', currentDir: {x: 1, y: 0} },
        { x: 13, y: 13, class: 'ghost-yellow', currentDir: {x: 0, y: -1} },
        { x: 7, y: 7, class: 'ghost-pink', currentDir: {x: 0, y: 1} }
    ];

    drawMaze();
    updateUI();

    // Dificultad incremental: se acelera el intervalo de los fantasmas en niveles altos
    const speed = Math.max(120, 350 - (currentLevel * 20));
    ghostInterval = setInterval(moveGhosts, speed);
}

// Dibujar el mapa en el Grid HTML
function drawMaze() {
    mazeContainer.innerHTML = '';
    dotsLeft = 0;

    for (let y = 0; y < width; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (map[y][x] === 1) {
                cell.classList.add('wall');
            } else {
                cell.classList.add('road');
                if ((x !== 1 || y !== 1) && (x !== 7 || y !== 7)) {
                    if (map[y][x] === 0) {
                        const dot = document.createElement('div');
                        dot.classList.add('dot');
                        cell.appendChild(dot);
                        dotsLeft++;
                    }
                }
            }
            mazeContainer.appendChild(cell);
        }
    }
    placeCharacters();
}

// Renderizar personajes
function placeCharacters() {
    document.querySelectorAll('.pacman, .ghost').forEach(el => el.remove());

    const pacCell = getCell(pacmanPos.x, pacmanPos.y);
    if(pacCell) {
        const pacHTML = document.createElement('div');
        pacHTML.classList.add('pacman');
        pacCell.appendChild(pacHTML);
    }

    ghosts.forEach(g => {
        const ghostCell = getCell(g.x, g.y);
        if(ghostCell) {
            const ghostHTML = document.createElement('div');
            ghostHTML.classList.add('ghost', g.class);
            ghostCell.appendChild(ghostHTML);
        }
    });
}

function getCell(x, y) {
    return document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
}

function updateUI() {
    uiLevel.innerText = currentLevel;
    uiScore.innerText = totalScore;
    uiLives.innerText = '❤️'.repeat(lives) || 'Ninguna';
}

// Movimiento de Pacman
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
            
            if (dotsLeft === 0) {
                levelComplete();
            }
        }
        placeCharacters();
        checkCollisions();
    }
});

// Movimiento de los Fantasmas
function moveGhosts() {
    const directions = [
        {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}
    ];

    ghosts.forEach(g => {
        let possibleMoves = [];
        
        directions.forEach(dir => {
            let nextX = g.x + dir.x;
            let nextY = g.y + dir.y;
            if (map[nextY] && map[nextY][nextX] !== 1) {
                possibleMoves.push(dir);
            }
        });

        if (possibleMoves.length > 0) {
            let chooseDir = g.currentDir;
            const canKeepGoing = possibleMoves.some(d => d.x === g.currentDir.x && d.y === g.currentDir.y);
            
            if (!canKeepGoing || Math.random() < 0.25) {
                chooseDir = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }

            g.x += chooseDir.x;
            g.y += chooseDir.y;
            g.currentDir = chooseDir;
        }
    });

    placeCharacters();
    checkCollisions();
}

// Control de Daños / Colisión
function checkCollisions() {
    ghosts.forEach(g => {
        if (g.x === pacmanPos.x && g.y === pacmanPos.y) {
            lives--;
            updateUI();
            
            if (lives <= 0) {
                gameOver();
            } else {
                pacmanPos = { x: 1, y: 1 };
                placeCharacters();
            }
        }
    });
}

// Finalización del nivel e informe detallado
function levelComplete() {
    clearInterval(ghostInterval);
    
    // Asignar puntajes exactos según reglas:
    let scoreEarned = 250;
    if (lives === 3) scoreEarned = 750;
    else if (lives === 2) scoreEarned = 500;
    
    totalScore += scoreEarned;

    if (currentLevel === 10) {
        // Pantalla de Felicidades Final (Nivel 10)
        gameContainer.classList.add('hidden');
        document.getElementById('total-score').innerText = `${totalScore} pts`;
        document.getElementById('total-lives').innerText = '❤️'.repeat(lives) + ` (${lives} vidas)`;
        victoryScreen.classList.remove('hidden');
    } else {
        // Interfaz intermedia (Niveles 1 al 9) actualizando datos de nivel, suma "total" y vidas actuales.
        document.getElementById('level-msg').innerText = `Nivel ${currentLevel} completado`;
        document.getElementById('level-points').innerText = `${scoreEarned} pts`;
        document.getElementById('level-total-score').innerText = `${totalScore} pts`;
        document.getElementById('level-lives').innerText = '❤️'.repeat(lives) + ` (${lives} restantes)`;
        
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
    gameContainer.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
}