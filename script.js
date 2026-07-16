const wordText = document.getElementById('wordText');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const lifeDisplay = document.getElementById('lifeDisplay');
const difficultyEl = document.getElementById('difficulty');
const difficultyValueEl = document.getElementById('difficultyValue');
const speedValueEl = document.getElementById('speedValue');
const accuracyEl = document.getElementById('accuracy');
const startButton = document.getElementById('startButton');
const params = new URLSearchParams(window.location.search);
const requestedDifficulty = params.get('difficulty') || 'normal';
const restartButton = document.getElementById('restartButton');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const obstacleLayer = document.getElementById('obstacleLayer');
const dino = document.getElementById('dino');
const ground = document.getElementById('ground');
const keyboard = document.getElementById('keyboard');
const mobileInput = document.getElementById('mobileInput');

const words = [
  'apple','yellow','flower','castle','mushroom','pepper','jungle','rocket','banana','pirate','kingdom','champion','future','monster','puzzle','sunrise','driver','friend','galaxy','history','island','journey','lemonade','marble','nature','orchestra','people','quality','rhythm','science','treasure','umbrella','victory','whisper','xylophone','youth','zodiac'
];

const keyRows = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
  ['Space']
];

const difficultySettings = {
  easy: 1,
  normal: 1,
  hard: 2,
  impossible: 4
};

const MAX_LIVES = 5;
const BEST_SCORE_KEY = 'typingDinoBestScore';

let gameState = {
  running: false,
  score: 0,
  bestScore: 0,
  lives: 5,
  speed: 1,
  accuracy: 100,
  totalKeyPresses: 0,
  correctKeyPresses: 0,
  currentWord: '',
  typedIndex: 0,
  combo: 0,
  wordMistakes: 0,
  obstacles: [],
  spawnCooldownUntil: 0,
  lastUpdate: null,
  currentObstacle: null,
  highestSpeed: 1,
  jumpWindowEndsAt: 0,
  readyToJump: false,
};

const COLLISION_RADIUS = 58;
const COLLISION_OFFSET_X = 26;

function createKeyboard() {
  keyboard.innerHTML = '';
  keyRows.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';
    row.forEach((label) => {
      const key = document.createElement('button');
      key.className = 'key';
      key.dataset.key = label.toLowerCase();
      key.textContent = label === 'Space' ? 'Space' : label;
      if (label === 'Space') key.classList.add('large');
      rowEl.appendChild(key);
    });
    keyboard.appendChild(rowEl);
  });
}

function resetGame() {
  gameState.running = false;
  gameState.score = 0;
  gameState.bestScore = getStoredBestScore();
  gameState.lives = 5;
  gameState.speed = 1;
  gameState.accuracy = 100;
  gameState.totalKeyPresses = 0;
  gameState.correctKeyPresses = 0;
  gameState.currentWord = '';
  gameState.typedIndex = 0;
  gameState.combo = 0;
  gameState.wordMistakes = 0;
  gameState.obstacles = [];
  gameState.spawnCooldownUntil = 0;
  gameState.lastUpdate = null;
  gameState.currentObstacle = null;
  gameState.highestSpeed = 1;
  gameState.jumpWindowEndsAt = 0;
  gameState.readyToJump = false;
  obstacleLayer.innerHTML = '';
  dino.classList.remove('jump');
  updateHud();
  renderCurrentWord();
  hideOverlay();
}

function getSelectedDifficulty() {
  if (difficultyEl && difficultyEl.value) {
    return difficultyEl.value;
  }
  return requestedDifficulty;
}

function createLifeDisplay() {
  if (!lifeDisplay) return;
  lifeDisplay.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i += 1) {
    const heart = document.createElement('div');
    heart.className = 'life-heart';
    lifeDisplay.appendChild(heart);
  }
  updateLifeDisplay();
}

function updateLifeDisplay() {
  if (!lifeDisplay) return;
  const hearts = lifeDisplay.querySelectorAll('.life-heart');
  hearts.forEach((heart, index) => {
    const isRemaining = index < gameState.lives;
    heart.classList.toggle('lost', !isRemaining);
    heart.style.backgroundImage = isRemaining ? "url('reds.jpg')" : "url('whites.jpg')";
  });
}

function updateHud() {
  scoreEl.textContent = gameState.score;
  if (bestScoreEl) {
    bestScoreEl.textContent = gameState.bestScore;
  }
  const selectedDifficulty = getSelectedDifficulty();
  if (difficultyValueEl) {
    difficultyValueEl.textContent = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1);
  }
  speedValueEl.textContent = `${gameState.speed.toFixed(1)}x`;
  accuracyEl.textContent = `${gameState.accuracy.toFixed(0)}%`;
  updateLifeDisplay();
}

function showOverlay(title, message) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function getStoredBestScore() {
  return parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10) || 0;
}

function saveBestScore(score) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function updateBestScore() {
  if (gameState.score > gameState.bestScore) {
    gameState.bestScore = gameState.score;
    saveBestScore(gameState.bestScore);
  }
}

function chooseNextWord() {
  const count = difficultySettings[getSelectedDifficulty()] || 3;
  const pieces = [];
  while (pieces.length < count) {
    pieces.push(randomWord());
  }
  gameState.currentWord = pieces.join(' ');
  gameState.typedIndex = 0;
  renderCurrentWord();
  highlightKeyboardKey();
}

function renderCurrentWord() {
  wordText.innerHTML = '';
  const text = gameState.currentWord;
  for (let i = 0; i < text.length; i++) {
    const letterSpan = document.createElement('span');
    letterSpan.className = 'word-letter';
    letterSpan.textContent = text[i] === ' ' ? '␣' : text[i];
    if (i < gameState.typedIndex) {
      letterSpan.classList.add('correct');
    }
    if (i === gameState.typedIndex) {
      letterSpan.classList.add('current');
    }
    wordText.appendChild(letterSpan);
  }
}

function highlightKeyboardKey() {
  const nextChar = gameState.currentWord[gameState.typedIndex] || '';
  document.querySelectorAll('.key').forEach((button) => {
    button.classList.remove('active', 'correct', 'incorrect');
    if (gameState.readyToJump && button.dataset.key === 'space') {
      button.classList.add('active');
    } else if (nextChar === ' ' && button.dataset.key === 'space') {
      button.classList.add('active');
    } else if (button.dataset.key === nextChar.toLowerCase()) {
      button.classList.add('active');
    }
  });
}

function startGame() {
  if (gameState.running) return;
  hideOverlay();
  gameState.running = true;
  gameState.speed = 1;
  gameState.score = 0;
  gameState.lives = 5;
  gameState.totalKeyPresses = 0;
  gameState.correctKeyPresses = 0;
  gameState.highestSpeed = 1;
  gameState.currentWord = '';
  gameState.typedIndex = 0;
  gameState.obstacles = [];
  gameState.currentObstacle = null;
  gameState.readyToJump = false;
  gameState.jumpWindowEndsAt = 0;
  obstacleLayer.innerHTML = '';
  dino.classList.remove('jump');
  spawnObstacle();
  scheduleNextSpawn();
  gameState.lastUpdate = performance.now();
  requestAnimationFrame(gameLoop);
  updateHud();
}

function setCurrentWord(word) {
  gameState.currentWord = word;
  gameState.typedIndex = 0;
  renderCurrentWord();
  highlightKeyboardKey();
}

function spawnObstacle() {
  if (!gameState.running || gameState.obstacles.length > 0) return;

  const obstacle = document.createElement('div');
  obstacle.className = 'obstacle cactus';
  obstacle.dataset.type = 'cactus';
  const laneWidth = obstacleLayer.clientWidth || window.innerWidth;
  obstacle.style.left = `${laneWidth + 40}px`;
  obstacle.style.bottom = '0px';
  const word = makeObstacleWord();
  obstacle.dataset.word = word;
  obstacle.dataset.progress = '0';
  obstacle.dataset.cleared = '0';
  obstacle.dataset.hit = '0';
  obstacle.dataset.damaged = '0';
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = word;
  obstacle.appendChild(label);
  obstacleLayer.appendChild(obstacle);
  gameState.obstacles.push(obstacle);
  gameState.currentObstacle = obstacle;
  gameState.readyToJump = false;
  gameState.jumpWindowEndsAt = 0;
  setCurrentWord(word);
}

function scheduleNextSpawn() {
  const delay = Math.max(900, 1500 - gameState.speed * 120);
  gameState.spawnCooldownUntil = performance.now() + delay;
}

function makeObstacleWord() {
  const count = difficultySettings[getSelectedDifficulty()] || 3;
  const pieces = [];
  while (pieces.length < count) pieces.push(randomWord());
  return pieces.join(' ');
}

function updateSpeed(deltaSeconds) {
  gameState.speed += deltaSeconds * 0.014;
  if (gameState.speed > gameState.highestSpeed) {
    gameState.highestSpeed = gameState.speed;
  }
  speedValueEl.textContent = `${gameState.speed.toFixed(1)}x`;
}

function clearObstacle(obstacle, reward = false) {
  if (!obstacle || !gameState.obstacles.includes(obstacle)) return;
  obstacle.remove();
  gameState.obstacles = gameState.obstacles.filter((item) => item !== obstacle);
  if (gameState.currentObstacle === obstacle) {
    gameState.currentObstacle = null;
  }
  if (reward) {
    rewardClear();
  } else {
    loseLife();
  }
  scheduleNextSpawn();
}

function failJump(obstacle) {
  if (!obstacle || !gameState.obstacles.includes(obstacle) || obstacle.dataset.hit === '1') return;
  obstacle.dataset.hit = '1';
  obstacle.classList.add('stuck');
  obstacle.remove();
  gameState.obstacles = gameState.obstacles.filter((item) => item !== obstacle);
  if (gameState.currentObstacle === obstacle) {
    gameState.currentObstacle = null;
  }
  loseLife();
  scheduleNextSpawn();
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  const delta = Math.min((timestamp - gameState.lastUpdate) / 1000, 0.05);
  gameState.lastUpdate = timestamp;
  updateSpeed(delta);
  moveGround(delta);
  moveObstacles(delta);
  updateHud();

  if (gameState.running && gameState.obstacles.length === 0 && performance.now() >= gameState.spawnCooldownUntil) {
    spawnObstacle();
  }

  if (gameState.lives <= 0) {
    gameOver();
    return;
  }
  requestAnimationFrame(gameLoop);
}

function moveGround(deltaSeconds) {
  const currentPos = parseFloat(getComputedStyle(ground).getPropertyValue('--offset') || '0');
  const newPos = (currentPos - 110 * deltaSeconds * gameState.speed) % 200;
  ground.style.setProperty('--offset', newPos);
  ground.style.transform = `translateX(${newPos}px)`;
}

function moveObstacles(deltaSeconds) {
  const speed = 170 * gameState.speed;
  const activeObstacles = [...gameState.obstacles];
  activeObstacles.forEach((obstacle) => {
    const currentLeft = parseFloat(obstacle.style.left) || window.innerWidth + 120;
    const nextLeft = currentLeft - speed * deltaSeconds;
    obstacle.style.left = `${nextLeft}px`;

    if (obstacle.dataset.cleared !== '1' && obstacle.dataset.hit !== '1' && !dino.classList.contains('jump')) {
      const dinoRect = dino.getBoundingClientRect();
      const obstacleRect = obstacle.getBoundingClientRect();
      const dinoCenterX = dinoRect.left + dinoRect.width / 2 - COLLISION_OFFSET_X;
      const dinoCenterY = dinoRect.top + dinoRect.height / 2;
      const obstacleCenterX = obstacleRect.left + obstacleRect.width / 2;
      const obstacleCenterY = obstacleRect.top + obstacleRect.height / 2;
      const distanceX = Math.abs(dinoCenterX - obstacleCenterX);
      const distanceY = Math.abs(dinoCenterY - obstacleCenterY);
      const hitDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (hitDistance <= COLLISION_RADIUS) {
        obstacle.dataset.hit = '1';
        obstacle.classList.add('stuck');
        flashDamage(650);
        clearObstacle(obstacle, false);
        return;
      }
    }

    const rect = obstacle.getBoundingClientRect();
    if (rect.right < -40 || rect.left > window.innerWidth + 40) {
      const wasCleared = obstacle.dataset.cleared === '1' || obstacle.dataset.jumped === '1';
      clearObstacle(obstacle, wasCleared);
    }
  });
}

function loseLife() {
  gameState.lives -= 1;
  gameState.combo = 0;
  gameState.wordMistakes = 0;
  updateLifeDisplay();
  gameState.typedIndex = 0;
  gameState.readyToJump = false;
  gameState.jumpWindowEndsAt = 0;
  flashDamage(900);
  if (gameState.currentObstacle) {
    setCurrentWord(gameState.currentObstacle.dataset.word);
  } else {
    setCurrentWord(makeObstacleWord());
  }
}

function flashDamage(duration = 800) {
  const el = document.getElementById('damageOverlay');
  if (!el) return;
  el.classList.add('active');
  clearTimeout(flashDamage._t);
  flashDamage._t = setTimeout(() => {
    el.classList.remove('active');
  }, duration);
}

function rewardClear() {
  const selectedDifficulty = getSelectedDifficulty();
  const lengthBonus = Math.max(0, gameState.currentWord.length - 3);
  const difficultyMultiplier = selectedDifficulty === 'hard' ? 1.5 : selectedDifficulty === 'impossible' ? 2 : selectedDifficulty === 'normal' ? 1.2 : 1;
  const speedBonus = Math.floor(gameState.speed * 1.4);
  const perfectBonus = gameState.wordMistakes === 0 ? 5 : 0;
  const comboBonus = gameState.combo * 2;
  const mistakePenalty = Math.min(gameState.wordMistakes * 2, 10);
  let points = Math.round((15 + lengthBonus * 2 + speedBonus * 3 + difficultyMultiplier * 4 + comboBonus + perfectBonus) - mistakePenalty);
  if (points < 8) points = 8;

  gameState.score += points;
  gameState.combo = gameState.wordMistakes === 0 ? gameState.combo + 1 : 0;
  gameState.wordMistakes = 0;
  updateBestScore();
  updateHud();

  gameState.typedIndex = 0;
  gameState.readyToJump = false;
  gameState.jumpWindowEndsAt = 0;
  if (gameState.currentObstacle) {
    setCurrentWord(gameState.currentObstacle.dataset.word);
  } else {
    setCurrentWord(makeObstacleWord());
  }
}

function jumpObstacle(obstacle) {
  if (!obstacle || !gameState.readyToJump) return;

  dino.classList.add('jump');
  gameState.readyToJump = false;
  gameState.jumpWindowEndsAt = 0;
  obstacle.dataset.jumped = '1';

  setTimeout(() => dino.classList.remove('jump'), 700);
}

function gameOver() {
  gameState.running = false;
  updateBestScore();
  overlayMessage.textContent = `Final score: ${gameState.score}. Best score: ${gameState.bestScore}. Highest speed: ${gameState.highestSpeed.toFixed(1)}x.`;
  showOverlay('GAME OVER', overlayMessage.textContent);
}

function updateAccuracy() {
  if (gameState.totalKeyPresses === 0) {
    gameState.accuracy = 100;
  } else {
    gameState.accuracy = (gameState.correctKeyPresses / gameState.totalKeyPresses) * 100;
  }
}

function markKey(key, status) {
  const button = document.querySelector(`.key[data-key="${key}"]`);
  if (!button) return;
  button.classList.remove('active');
  button.classList.add(status);
  setTimeout(() => {
    button.classList.remove(status);
    highlightKeyboardKey();
  }, 250);
}

function handleKeyPress(event) {
  if (!gameState.running) return;
  const pressed = event.key.toLowerCase();

  if ((pressed === ' ' || pressed === 'space') && gameState.readyToJump && gameState.currentObstacle) {
    jumpObstacle(gameState.currentObstacle);
    markKey('space', 'correct');
    updateHud();
    return;
  }

  const required = gameState.currentWord[gameState.typedIndex] || '';
  const expectedKey = required === ' ' ? ' ' : required;

  if (pressed === expectedKey) {
    gameState.totalKeyPresses += 1;
    gameState.correctKeyPresses += 1;
    gameState.typedIndex += 1;
    renderCurrentWord();
    markKey(pressed === ' ' ? 'space' : pressed, 'correct');
    updateAccuracy();
    if (gameState.typedIndex >= gameState.currentWord.length) {
      gameState.readyToJump = true;
      gameState.jumpWindowEndsAt = performance.now() + 1800;
      highlightKeyboardKey();
      const sp = document.querySelector('.key[data-key="space"]');
      if (sp) sp.classList.add('active');
    }
  } else if (pressed.length === 1 || pressed === ' ') {
    gameState.totalKeyPresses += 1;
    gameState.wordMistakes += 1;
    gameState.combo = 0;
    updateAccuracy();
    markKey(pressed === ' ' ? 'space' : pressed, 'incorrect');
  }
  updateHud();
}

if (startButton) {
  startButton.addEventListener('click', startGame);
}
restartButton.addEventListener('click', () => {
  resetGame();
  startGame();
});

if (difficultyEl) {
  difficultyEl.addEventListener('change', () => {
    if (difficultyValueEl) {
      difficultyValueEl.textContent = difficultyEl.value.charAt(0).toUpperCase() + difficultyEl.value.slice(1);
    }
    if (!gameState.running) chooseNextWord();
  });
}

document.addEventListener('keydown', handleKeyPress);
// Open the Android keyboard when the typing area is tapped
wordText.addEventListener('click', () => {
    mobileInput.focus();
});

// Send the typed character to your existing game logic
mobileInput.addEventListener('input', (e) => {
    const value = e.target.value;

    if (value.length > 0) {
        handleKeyPress({
            key: value[value.length - 1]
        });
    }

    // Clear the input for the next character
    e.target.value = "";
});

createKeyboard();
createLifeDisplay();
resetGame();
startGame();
