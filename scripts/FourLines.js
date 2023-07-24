const gameContainer = document.getElementById("gameContainer");
const canvas = document.getElementById("gameCanvas");
const timerDisplay = document.getElementById("timerDisplay");
const pizzaCountDisplay = document.getElementById("pizzaCountDisplay");
const blockCountDisplay = document.getElementById("blockCountDisplay");

const ctx = canvas.getContext('2d');
const maxCircles = 4;

let gameStarted = false;
let circleMoved = false;

let continuousMovementInterval = null;
const keys = {};
const mapping = { w: 0, s: 0, a: 1, d: 1, i: 2, k: 2, j: 3, l: 3 };
let movementSpeed = 0;
let isSuccessState = false;
let COLOR = 'red';

const identifier = localStorage.getItem('identifier');
pizzaCountDisplay.textContent = `Pizzas: 0/${maxCircles}`;
blockCountDisplay.textContent = `Block: 1/${maxCircles}`;

let circlePositions = new Array(maxCircles).fill().map(() => 0);
let targetPositions = new Array(maxCircles).fill().map(() => 0);

function adjustCanvasSize() {
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    movementSpeed = canvas.width * 0.005;
}

adjustCanvasSize();
window.addEventListener('resize', adjustCanvasSize);

const leftLimit = canvas.width / 2 - canvas.width / 8;
const rightLimit = canvas.width / 2 + canvas.width / 8;
// Draw the player's circle
function drawCircle(index) {
    ctx.beginPath();
    ctx.arc(circlePositions[index], canvas.height/2 - canvas.height/3 + (index + 1) * canvas.height / 15, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
}

function drawWhiteLine(index) {
    ctx.beginPath();
    ctx.moveTo(canvas.width/2 - canvas.width/8, canvas.height/2 - canvas.height/3 + (index + 1) * canvas.height / 15);
    ctx.lineTo(canvas.width/2 + canvas.width/8, canvas.height/2 - canvas.height/3 + (index + 1) * canvas.height / 15);
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

// Modified drawTarget function to draw rectangles
function drawTarget(index, color = 'red') {
    const rectWidth = canvas.width/33;  
    const rectHeight = canvas.width/100; 
    ctx.beginPath();
    ctx.rect(targetPositions[index] - rectWidth / 2, canvas.height/2 - canvas.height/3 + (index + 1) * canvas.height / 15 - rectHeight / 2, rectWidth, rectHeight);
    ctx.fillStyle = color;
    ctx.fill();
}


function moveCircle(index, direction) {
    if (direction === 'left' && circlePositions[index] > leftLimit) {
        circlePositions[index] -= movementSpeed;
        circleMoved = true;
    }
    else if (direction === 'right' && circlePositions[index] < rightLimit) {
        circlePositions[index] += movementSpeed;
        circleMoved = true;
    }
}

function checkTargetHit(index) {
    return Math.abs(circlePositions[index] - targetPositions[index]) < canvas.width/66;
}

document.addEventListener('keydown', function(event) {
    if (mapping[event.key] !== undefined) {
        keys[event.key] = true; // Remember this key is pressed

        if (!continuousMovementInterval) {
            continuousMovementInterval = setInterval(() => {
                const directionMap = { w: 'left', s: 'right', a: 'right', d: 'left', i: 'left', k: 'right', j: 'left', l: 'right' };
                
                for (let key in keys) {
                    if (keys[key]) { // If this key is pressed
                        moveCircle(mapping[key], directionMap[key]);
                    }
                }
            }, 50);
        }
    }
});

document.addEventListener('keyup', function(event) {
    if (mapping[event.key] !== undefined) {
        delete keys[event.key]; // Remove this key from pressed keys

        // If no keys are pressed, clear the interval
        if (!Object.keys(keys).length) {
            clearInterval(continuousMovementInterval);
            continuousMovementInterval = null;
        }
    }
});

function resetGame() {
    do 
        circlePositions = new Array(maxCircles).fill().map(() => canvas.width / 2 + (Math.random() - 0.5) * canvas.width / 4);
    while (circlePositions.some(value => Math.abs(value - canvas.width/2) < canvas.width/25));
    targetPositions = new Array(maxCircles).fill().map(() => canvas.width / 2);
    pizzaCountDisplay.textContent = `Pizzas: 0/${maxCircles}`;
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let hits = 0; // To track the number of circles correctly positioned.

    for (let i = 0; i < maxCircles; i++) {
        drawWhiteLine(i);
        drawTarget(i, COLOR);
        drawCircle(i);
        if (checkTargetHit(i)) {
            hits++;
            pizzaCountDisplay.textContent = `Pizzas: ${hits}/${maxCircles}`;
        }
    }

    // If all circles are correctly positioned, reset the game.
    if (hits === maxCircles && !isSuccessState) {
        isSuccessState = true;
        COLOR = 'green';
        setTimeout(() => {
            resetGame();
            isSuccessState = false;
            COLOR = 'red';
        }, 500); 
    }

    requestAnimationFrame(update);
}
resetGame()
update();
