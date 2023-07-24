const gameContainer = document.getElementById("gameContainer");
const canvas = document.getElementById("gameCanvas");
const timerDisplay = document.getElementById("timerDisplay");
const pizzaCountDisplay = document.getElementById("pizzaCountDisplay");
const blockCountDisplay = document.getElementById("blockCountDisplay");

const ctx = canvas.getContext('2d');

let trials = 0;
const maxTrials = 15;
const breakDuration = 10; // 30 seconds
let breakTime = breakDuration;
let blockScores = [];
blockScores.push(1);
let onBreak = false;

let data = []; // Data for each frame will be stored here
let frameCount = 0; // Frame counter

let gameStarted = false;
let carMoved = false; 
let blockStartTime = new Date().getTime();
let elapsedTime = 0;
let timerInterval = null;
let bestTime = [];

let speed = 0;
const maxBlocks = 15;

const identifier = localStorage.getItem('identifier');
pizzaCountDisplay.textContent = `Pizzas: 0/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
blockCountDisplay.textContent = `Block: ${blockScores.length}/${maxBlocks}`; 

let sliceStartTime = null; // Time when the car first hits the pizza slice
const sliceCollectDuration = 500; // Time in ms the car has to stay on the slice to collect it
let sliceTimer = null; // Timer for collecting pizza slice

let previousTimestamp = performance.now();
let frameTime;
let frameRate;

let lastMovementTime = null; // Time of the last car movement

let positionXMet = 100;
let positionYMet = 100;

let dimension = [1,1,1,1];
let padding = 0;  // add padding to control the thickness of shaded region

let canvasSize = 0;

function adjustCanvasSize() {
  //const container = document.getElementById('gameContainer');
  //const canvas = document.getElementById('gameCanvas');

  const containerWidth = gameContainer.offsetWidth;
  const containerHeight = gameContainer.offsetHeight;

  if (containerHeight < containerWidth) {
      // container height is smaller, set canvas dimensions based on height
      canvas.style.width = `${containerHeight}px`;
      canvas.style.height = `${containerHeight}px`;
      canvasSize = containerHeight;
      speed = (containerHeight)/2 * 0.004;
      padding = (containerHeight*2)/75;
      canvas.height = canvasSize;
      canvas.width = canvasSize;
  } else {
      // container width is smaller, or they're equal
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerWidth}px`;
      canvasSize = containerWidth;
      speed = (containerWidth)/2 * 0.004;
      padding = (containerWidth*2)/75;
      canvas.height = canvasSize;
      canvas.width = canvasSize;
  }
}

// Run the function initially and also when the window is resized
adjustCanvasSize();
window.addEventListener('resize', adjustCanvasSize);

// The rectangle object
const player = {
  x: canvasSize/2,
  y: canvasSize/2, 
  width: 50,
  height: 50,
  get centerX() {
    return this.x + this.width / 2;
  },
  get centerY() {
    return this.y + this.height / 2;
  },
  speed: 6,
};

const target = {
    x: canvasSize/2,
    y: canvasSize/2,
    width: 50,
    height: 50,
    get centerX() {
      return this.x + this.width / 2;
    },
    get centerY() {
      return this.y + this.height / 2;
    }
};

const keys = {};

// Key mappings
const mapping =  { w: 'left', s: 'right', j: 'up', l: 'down', a: 'heightDown', d: 'heightUp', i: 'widthDown', k: 'widthUp'};

function setTargetPosition() {
  // Ensure that the size of the target is not the same as the player's rectangle
  if (dimension[0]) {
    do {
      target.width = Math.random() * canvasSize/2 + canvasSize/20;
    } while (Math.abs(target.width - player.width) <= canvasSize*0.1);
    }
  if (dimension[1]) {
    do {
      target.height = Math.random() * canvasSize/2 + canvasSize/20;
    } while (Math.abs(target.height - player.height) <= canvasSize*0.1);
  }
  // Ensure that the position of the target is not the same as the player's rectangle
  if (dimension[2]) {
    do {
      target.x = canvasSize*0.05 + Math.random() * (canvasSize*0.95);
    } while ((Math.abs(target.x - player.x) <= canvasSize*0.1) || (target.x - target.width/2 - padding < 0) || (target.x + target.width/2 + padding > canvasSize));  
  }
  if (dimension[3]) {
    do {
      target.y = canvasSize*0.05 + Math.random() * (canvasSize*0.95);
    } while ((Math.abs(target.y - player.y) <= canvasSize*0.1) || (target.y - target.height/2 - padding < 0) || (target.y + target.height/2 + padding > canvasSize));
  }
} 

// Draw the players rectangle on the canvas
function drawRectangle() {
  ctx.beginPath();
  ctx.rect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
  ctx.strokeStyle = 'blue'; 
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Draw the target rectangle on the canvas
function drawTarget() {
  ctx.beginPath();
  ctx.rect(target.x - target.width / 2 - padding, target.y - target.height / 2 - padding, target.width + 2 * padding, target.height + 2 * padding);
  ctx.fillStyle = 'rgba(155, 0, 0, 0.5)'; // You can adjust the color and opacity to your liking
  ctx.strokeStyle = 'red'; 
  ctx.fill();
  ctx.stroke();

  // The original target rectangle
  ctx.beginPath();
  ctx.rect(target.x - target.width / 2, target.y - target.height / 2, target.width, target.height);
  ctx.fillStyle = 'black'; // This color should match the background color
  ctx.fill();
  ctx.strokeStyle = 'red'; 
  ctx.lineWidth = 2;
  ctx.stroke();


  if (sliceStartTime !== null) {
    const timePassed = new Date().getTime() - sliceStartTime;
    const rectWidth = (1 - timePassed / sliceCollectDuration) * (target.width * 2); // The width decreases as time passes
    ctx.fillStyle = 'red';
    ctx.fillRect(target.x - rectWidth / 2, target.y -target.height/2 - 10 - padding, rectWidth, 10);
  }
} 

function collectTarget() {
  if (positionXMet && positionYMet) {
    if (sliceStartTime === null) {
      sliceStartTime = new Date().getTime();
      sliceTimer = setTimeout(() => {
        pizzaCountDisplay.textContent = `Pizzas: ${++trials}/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
        padding = (canvasSize + canvasSize)/75;
        setTargetPosition();
        if (trials >= maxTrials) {
          startBreak();
          pizzaCountDisplay.style.backgroundColor = 'red';
          pizzaCountDisplay.style.animation = 'blink 1s infinite';
          timerDisplay.style.backgroundColor = 'red';
          timerDisplay.style.animation = 'blink 1s infinite';
        }
        sliceStartTime = null;
        clearTimeout(sliceTimer);
        sliceTimer = null;
      }, sliceCollectDuration);
    } 
  } else {
    // If the rectangle moves away from the target or changes its dimension before the timer has ended, reset the timer
    sliceStartTime = null;
    if (sliceTimer) {
      clearTimeout(sliceTimer);
      sliceTimer = null;
    }
  }
}

// The conditions that you use to check whether dimensions are met can be adjusted according to your needs
function checkDimensions() {
  // Get the target's outer and inner bounding box (with padding)
  const outerTargetLeft = target.x - target.width / 2 - padding;
  const outerTargetRight = target.x + target.width / 2 + padding;
  const outerTargetTop = target.y - target.height / 2 - padding;
  const outerTargetBottom = target.y + target.height / 2 + padding;
  
  const innerTargetLeft = target.x - target.width / 2;
  const innerTargetRight = target.x + target.width / 2;
  const innerTargetTop = target.y - target.height / 2;
  const innerTargetBottom = target.y + target.height / 2;

  // Get the player's bounding box
  const playerLeft = player.x - player.width / 2;
  const playerRight = player.x + player.width / 2;
  const playerTop = player.y - player.height / 2;
  const playerBottom = player.y + player.height / 2;
  
  // Check if the player is inside the target's outer bounding box
  const insideOuter = playerLeft >= outerTargetLeft && playerRight <= outerTargetRight &&
                      playerTop >= outerTargetTop && playerBottom <= outerTargetBottom;
  // Check if the player is outside the target's inner bounding box
  const outsideInner = playerRight >= innerTargetRight && playerLeft <= innerTargetLeft &&
                       playerBottom >= innerTargetBottom && playerTop <= innerTargetTop;
  // The player is in the shaded area if they are inside the outer bounding box but outside the inner bounding box
  positionXMet = positionYMet = insideOuter && outsideInner;
}

// Key event handlers for ending the break (Space key)
function handleKeyDown(event) {
  keys[event.key] = true;
  if (onBreak && event.key === " " && breakTime <= 0 && blockScores.length - 1 < maxBlocks) {
      onBreak = false;
      breakTime = breakDuration;
      pizzaCountDisplay.style.backgroundColor = '';
      pizzaCountDisplay.style.animation = '';
      timerDisplay.style.backgroundColor = '';
      timerDisplay.style.animation = '';
      blockCountDisplay.textContent = `Block: ${blockScores.length}/${maxBlocks}`; // Increment the trial count and update the pizza count display to show the total number of trials
      blockStartTime = new Date().getTime(); // Reset the game start time
      startTimer(); // Restart the timer
      pizzaCountDisplay.textContent = `Pizzas: 0/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
      window.removeEventListener("keydown", handleKeyDown);
      window.addEventListener("keydown", handleKeyDown); // Reattach handleKeyDown event listener
      window.addEventListener("keyup", handleKeyUp);
  }
}

// Key event handler to make sure the car only stops when the key is released
function handleKeyUp(event) {
  keys[event.key] = false;
}

// Move the rectangle in the specified direction
function moveplayer(direction) {
  speed = (canvasSize + canvasSize) / 2  * 0.2 * frameTime;
  switch (direction) {
      case 'left':
          player.x -= speed;
          break;
      case 'right':
          player.x += speed;
          break;
      case 'up':
          player.y -= speed;
          break;
      case 'down':
          player.y += speed;
          break;
      case 'heightDown':
        player.height -= speed;
        break;
      case 'heightUp':
        player.height += speed;
        break;
      case 'widthDown':
        player.width -= speed;
        break;
      case 'widthUp':
        player.width += speed;
        break;
  }
  carMoved = true;
}

// Draw the instructions on the canvas.
function drawInstructions() {
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Match-the-Rectangles Game", canvasSize / 2, canvasSize / 2 - 180);
  ctx.fillText("Your task is to match the blue rectangle as fast as possible to the red rectangle.", canvasSize / 2, canvasSize / 2 - 130);
  ctx.fillText('Control the position of the rectangle with "w", "s", "j", and "l".', canvasSize / 2, canvasSize / 2 - 80);
  ctx.fillText('Control the width and height with "a", "d", "i", and "k".', canvasSize / 2, canvasSize / 2 - 30);
  ctx.fillText("The faster you are, the better! Can you get the highscore?", canvasSize / 2, canvasSize / 2 + 20);
  ctx.fillText("Press Space to continue", canvasSize / 2, canvasSize / 2 + 100);
}

// Start the break
function startBreak() {
  onBreak = true;
  stopTimer(); // Stop the timer
  blockScores.push(1);
  trials = 0;
  frameCount = 0;

  sendPizzaDataToServer(data);
  data = []; // Reset data
  const breakInterval = setInterval(() => {
    breakTime -= 1;
    if (breakTime <= 0) {
      clearInterval(breakInterval);
      window.addEventListener("keydown", handleKeyDown);
    }
  }, 1000);
}

// Draw the break info
function drawBreakInfo() {
  // Reset the position, velocity and acceleration
  player.x = canvasSize / 2;
  player.y = canvasSize / 2;
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Time needed to deliver all pizzas: ${formatTime(bestTime.slice(-1))}`, canvasSize / 2, canvasSize / 2 - 50);
  ctx.fillText(`Your fastest deliver time this session: ${formatTime(Math.min(...bestTime))}`, canvasSize / 2, canvasSize / 2);
  ctx.fillText(`Break Time Remaining: ${breakTime}s`, canvasSize / 2, canvasSize / 2 + 50);
  
  if (breakTime <= 0) {
    ctx.fillText("Press Space to continue", canvasSize / 2, canvasSize / 2 + 100);
  }
}

// Draw the break info
function drawFinishedInfo() {
  // Reset the position, velocity and acceleration
  player.x = canvasSize / 2;
  player.y = canvasSize / 2;

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Time needed to deliver all pizzas: ${formatTime(bestTime.slice(-1))}`, canvasSize / 2, canvasSize / 2 - 50);
  ctx.fillText(`Your fastest deliver time this session: ${formatTime(Math.min(...bestTime))}`, canvasSize / 2, canvasSize / 2);
  ctx.fillText(`You finished all blocks for today. See you tomorrow!`, canvasSize / 2, canvasSize / 2 + 50);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function startTimer() {
  timerInterval = setInterval(function() {
    const currentTime = new Date().getTime();
    elapsedTime = Math.floor((currentTime - blockStartTime) / 1000); // Calculate elapsed time in seconds
    timerDisplay.textContent = `Time: ${formatTime(elapsedTime)}`; // Update the timer display
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval); // This will stop the timer
  bestTime.push(elapsedTime); 
  timerInterval = null; // Reset interval
  timerDisplay.textContent = `Time: ${formatTime(elapsedTime)}`; // Update the timer display
  elapsedTime = 0; // Reset elapsed time
}

function sendPizzaDataToServer(data) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/save_fourd_data', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(data));
}

// The main game loop
function update() {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  frameCount += 1;
  const currentTimestamp = performance.now();
  const deltaTime = currentTimestamp - previousTimestamp; // Delta time in milliseconds
  
  // Convert deltaTime from milliseconds to seconds before pushing
  frameTime = deltaTime / 1000;
    
  // Save the current timestamp for the next frame
  previousTimestamp = currentTimestamp;
  // Save data if either the car moved, or if it's been at least 6 seconds since the last save
  
  if (carMoved || (lastMovementTime && currentTimestamp - lastMovementTime < 6000)) {
    data.push({
      frame: frameCount,
      cursorPositionX: player.x, 
      cursorPositionY: player.y,
      cursorWidth: player.width,
      cursorHeight: player.height,
      targetPositionX:target.x,
      targetPositionY: target.y,
      targetWidth: target.width,
      targetHeight: target.height,
      targetNumber: trials,
      blockNumber: blockScores.length,
      identifier: identifier,
      canvasWidth: canvasSize,  
      canvasHeight: canvasSize,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '), // This line adds a timestamp in SQL datetime format
      frameTime: frameTime,
    });
  }

  if (carMoved) {
    lastMovementTime = currentTimestamp;
    carMoved = false; // Reset the carMoved flag after adding data
  }

  if (onBreak) {
    if (blockScores.length > maxBlocks) {
      drawFinishedInfo();
    }
    else {
      drawBreakInfo();
      }
  } else {
      if (trials >= maxTrials) {
          window.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("keyup", handleKeyUp);
          startBreak();
        }
      if (breakTime < breakDuration) {
          drawBreakInfo();
        } else {
          ctx.clearRect(0, 0, canvasSize, canvasSize);

          // Update circle position based on pressed keys and current mapping
          if (keys['w'] && player.x - player.width/2 > 0 && dimension[2]) moveplayer(mapping.w);
          if (keys['s'] && player.x + player.width/2 < canvasSize && dimension[2]) moveplayer(mapping.s);
          if (keys['j'] && player.y - player.height/2 > 0 && dimension[3]) moveplayer(mapping.j);
          if (keys['l'] && player.y + player.height/2 < canvasSize && dimension[3]) moveplayer(mapping.l);

          if (keys['a'] && dimension[1]) moveplayer(mapping.a);
          if (keys['d'] && player.y + player.height/2 < canvasSize && player.y - player.height/2 > 0 && dimension[1]) moveplayer(mapping.d);
          if (keys['i'] && dimension[0]) moveplayer(mapping.i);  
          if (keys['k'] && player.x + player.width/2 < canvasSize && player.x - player.width/2 > 0 && dimension[0]) moveplayer(mapping.k);

           // Apply a minimum limit of 1 to width
          player.width = Math.max(player.width, 1);

          // Apply a minimum limit of 1 to height
          player.height = Math.max(player.height, 1);
          checkDimensions();
          collectTarget();
          drawTarget();
          drawRectangle();

      }
  }
  requestAnimationFrame(update);
}

// Handle a mouse click on the canvas to start the game loop.
window.addEventListener('keydown', function(event) {
  // Check if the click is within the bounds of the Start Game button.
  if (!gameStarted && event.code === 'Space') {
    gameStarted = true;
    ctx.clearRect(0, 0, canvasSize, canvasSize); // Clear the canvas
    setTargetPosition();
    update();
    blockStartTime = new Date().getTime();
    startTimer();
  }
});

// Start the first screen. Draw the instructions on the canvas. 
drawInstructions();

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);