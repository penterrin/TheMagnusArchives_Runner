let canvas, ctx;
let player;
let gameRunning = false;
let obstacleSpeed = 3;
let obstacles = [];
let spawnTimer = 0;
let score = 0;
let backgroundMusic;
let musicPlaying = false;

let powerUps = [];
let powerUpTimer = 0;
let activePowerUp = null;
let powerUpDuration = 0;
let allowSpawningObstacles = true;
let allowSpawningPowerUps = true;
let spiralEffectActive = false;
let spiralWaveOffset = 0;

const SPIRAL_WAVE_FREQUENCY = 0.05;
const SPIRAL_WAVE_AMPLITUDE = 30;

const SPIRAL_SLOWDOWN = 0.5;
const ORIGINAL_JUMP_POWER = 12;
const GROUND_Y = 390;

let frameCount = 0;

// Add with other variables at top
let particles = [];
// Reemplaza la línea de PARTICLE_COLORS con esto:
const PARTICLE_COLORS = [
  "#3a0ca3",  // Azul oscuro
  "#480ca8",  // Púrpura oscuro
  "#560bad",  // Púrpura intenso
  "#7209b7",  // Púrpura eléctrico
  "#b5179e"   // Rosa oscuro
];




let nextPowerUpType = null;
let currentPhase = 1;

let playerInvulnerable = false;
let invulnerableTimer = 0;

let levelsData = {};
let phaseItems = [];
let phasePointer = 0;
let gameDistance = 0; // mide “distancia recorrida” en píxeles

// At the top with other variables


// Modify your fetch call:
fetch('levels.json')
  .then(res => {
    if (!res.ok) throw new Error("Failed to load levels");
    return res.json();
  })
  .then(json => {
    levelsData = json;
    loadPhase(1);
    levelsLoaded = true;
    console.log("Levels loaded successfully");
  })
  .catch(error => {
    console.error("Error loading levels:", error);
    levelsData = {
      "1": [
        { "x": 500, "type": "obstacle", "height": 50 },
        { "x": 900, "type": "powerup", "powerupType": "eye", "y": 250 }
      ]
    };
    loadPhase(1);
    levelsLoaded = true;
  });

function loadPhase(phase) {
  currentPhase = phase;
  
  if (phase === 4) {
    if (canvas && canvas.style) {
      canvas.style.filter = "contrast(1.5) brightness(0.8)";
    }
    if (backgroundMusic) {
      backgroundMusic.playbackRate = 0.9;
    }
  } else {
    if (canvas && canvas.style) {
      canvas.style.filter = "none";
    }
    if (backgroundMusic) {
      backgroundMusic.playbackRate = 1.0;
    }
  }

  phaseItems = (phase <= 3) ? 
    levelsData[phase] || [] : 
    generateEndlessLevel();
  
  phasePointer = 0;
  gameDistance = 0;
}

function generateEndlessLevel() {
  const obstacles = [];
  const baseSpeed = 3 + Math.floor((score-3000)/2000);
  
  for (let i = 0; i < 6 + Math.floor(Math.random() * 4); i++) {
    const isDistorted = Math.random() > 0.5;
    obstacles.push({
      x: 300 + i * (400 + Math.random() * 200),
      type: "obstacle",
      height: isDistorted ? 30 + Math.random() * 100 : 50 + Math.random() * 50,
      distorted: isDistorted
    });
  }

  if (Math.random() > 0.66) {
    obstacles.push({
      x: 2500,
      type: "powerup",
      powerupType: ["eye","spiral","lonely"][Math.floor(Math.random()*3)],
      y: 200 + Math.random() * 100,
      distorted: true
    });
  }

  return obstacles;
}

class Particle {
  constructor(angle, distance) {
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.angle = angle;
    this.distance = distance;
    this.speed = Math.random() * 0.3 + 0.1;
    this.size = Math.random() * 2 + 1;
    this.color = `rgba(${Math.floor(Math.random() * 30 + 70)}, 0, ${Math.floor(Math.random() * 50 + 100)}, ${Math.random() * 0.3 + 0.3})`;
    this.life = 100;
    this.updatePosition();
  }

  updatePosition() {
    this.x = this.centerX + Math.cos(this.angle) * this.distance;
    this.y = this.centerY + Math.sin(this.angle) * this.distance;
    this.distance += this.speed;
    this.angle += 0.03;
  }

  update() {
    this.updatePosition();
    this.life -= 0.7;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / 100;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initGame() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  player = new Player();
  gameRunning = true;
  score = 0;
  obstacles = [];
  powerUps = [];
  activePowerUp = null;
  gameDistance = 0;

  // Only start the game if levels are loaded
  if (phaseItems.length > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    console.error("Level data not loaded yet");
    return;
  }

  const deathSound = document.getElementById('deathSound');
  deathSound.volume = 0.4;

  // Force preload (mobile browsers require user interaction)
  const jumpSound = document.getElementById('jumpSound');
  jumpSound.volume = 0;
  jumpSound.play().then(() => {
    jumpSound.pause();
    jumpSound.volume = 0.3;
  }).catch(e => console.log("Preload failed (will work after click)"));

 
  backgroundMusic = document.getElementById('backgroundMusic');
  backgroundMusic.volume = 0.3; // Set to 30% volume
  
  // Start music (many browsers require this to be user-initiated)
  document.addEventListener('click', function firstClick() {
    if (!musicPlaying) {
      backgroundMusic.play().then(() => {
        musicPlaying = true;
      }).catch(error => {
        console.log("Audio playback failed:", error);
      });
    }
    document.removeEventListener('click', firstClick);
  }, { once: true });
  
}

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function updatePhase(score) {
  if (score < 1000) currentPhase = 1;
  else if (score < 2000) currentPhase = 2;
  else if (score < 3000) currentPhase = 3;
  else currentPhase = 4;
}

function getPhaseName(phase) {
  switch (phase) {
    case 1: return "ARCHIVES";
    case 2: return "TUNNELS";
    case 3: return "SMIRKE";
    case 4: return "THE ENDLESS";
    default: return "";
  }
}

function update() {
  player.update();
  score += 1;
  // updatePhase(score);
  // — 2 — Phase detection & reload
  const prevPhase = currentPhase;
  updatePhase(score);              // this sets currentPhase = 1,2 or 3
  if (currentPhase !== prevPhase) {
    loadPhase(currentPhase);        // reset phaseItems, phasePointer & gameDistance
  }

  // if (score % 500 === 0 && obstacleSpeed < 6) {
  //   obstacleSpeed += 0.5;
  // }

  

  if (playerInvulnerable) {
    invulnerableTimer--;
    if (invulnerableTimer <= 0) playerInvulnerable = false;
  }

  gameDistance += obstacleSpeed;

  




  // 3) Genera según levels.json
  while (phasePointer < phaseItems.length && phaseItems[phasePointer].x <= gameDistance) {
    const item = phaseItems[phasePointer++];
    if (item.type === 'obstacle') {
      obstacles.push(new Obstacle(800, GROUND_Y - item.height, 30, item.height, obstacleSpeed));
    } else if (item.type === 'powerup') {
      const y = item.y !== undefined ? item.y : (GROUND_Y - 60);
      powerUps.push(new PowerUp(canvas.width, y, item.powerupType));
    }
  }

  obstacles.forEach(o => o.update());
  obstacles = obstacles.filter(o => !o.isOffScreen());

  obstacles.forEach(o => {
    if (!playerInvulnerable && checkCollision(player, o)) {
      deathSound.currentTime = 0; // Rewind sound if already playing
      deathSound.play().catch(e => console.log("Death sound error:", e));

      gameRunning = false;
      setTimeout(() => { // Small delay before alert
        alert("¡You lost: " + score + "\nReload to try again.");
      }, 300);
    }
  });

  powerUpTimer++;
  if (powerUpTimer > 600 && allowSpawningPowerUps) {
    const y = Math.random() * 80 + 220;
    const types = ["eye", "spiral", "lonely"];
    const type = types[Math.floor(Math.random() * types.length)];
    nextPowerUpType = type;
    powerUps.push(new PowerUp(800, y, type));
    powerUpTimer = 0;
  }

  powerUps.forEach(p => p.update());
  powerUps = powerUps.filter(p => {
    if (checkCollision(player, p)) {
      activatePowerUp(p.type);
      playerInvulnerable = true;
      invulnerableTimer = 60;
      return false;
    }
    return !p.isOffScreen();
  });

  if (activePowerUp) {
    powerUpDuration--;
    if (powerUpDuration <= 0) {
      deactivatePowerUp();
    }
  }

  if (spiralEffectActive) {
    spiralWaveOffset += 0.1;
    
    // Genera partículas en espiral
    if (frameCount % 3 === 0) { // Cada 3 frames
      const startAngle = Math.random() * Math.PI * 2;
      particles.push(new Particle(
        startAngle, // Ángulo inicial aleatorio
        5 // Distancia inicial desde el centro
      ));
    }
    
    // Actualiza todas las partículas
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0 && 
                                   p.distance < Math.max(canvas.width, canvas.height) * 0.8);
  }

  if (currentPhase === 4) {
    if (Math.random() > 0.99 && !playerInvulnerable) {
      const whisper = new Audio("assets/whisper.ogg");
      whisper.volume = 0.3;
      whisper.play().catch(e => {});
    }
  
    if (Math.random() > 0.995) {
      canvas.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
      setTimeout(() => canvas.style.transform = "", 200);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Dibuja el fondo del efecto espiral primero
  if (spiralEffectActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 0, 20, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, 150
    );
    gradient.addColorStop(0, 'rgba(60, 0, 90, 0.8)');
    gradient.addColorStop(1, 'rgba(10, 0, 30, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Dibuja las partículas (sobre el fondo pero bajo otros elementos)
  particles.forEach(p => p.draw(ctx));

  // 3. Dibuja obstáculos y power-ups
  obstacles.forEach(o => o.draw(ctx));
  powerUps.forEach(p => p.draw(ctx));

  // 4. Dibuja al jugador (encima de todo)
  player.draw(ctx);

  // 5. Dibuja la UI
  ctx.fillStyle = "#fff";
  ctx.font = "20px Courier";
  ctx.fillText("Score: " + score, 10, 30);
  ctx.fillText("Phase: " + getPhaseName(currentPhase), 10, 50);

  if (activePowerUp) {
    ctx.fillText("Power: " + activePowerUp, 10, 70);
  }

  if (activePowerUp === "eye") {
    if (nextPowerUpType) {
      ctx.fillText("Next power-up: " + nextPowerUpType, 10, 90);
    }
    const nextPhase = currentPhase + 1;
    const nextScore = nextPhase * 1000;
    if (currentPhase < 3) {
      ctx.fillText("Next phase: " + nextPhase + " in: " + (nextScore - score) + " pts", 10, 110);
    } else {
      ctx.fillText("Final phase: SMIRKE", 10, 110);
    }
  }
}


function activatePowerUp(type) {
  if (activePowerUp) deactivatePowerUp();
  activePowerUp = type;
  powerUpDuration = 600;

  switch (type) {
    case "eye":
      canvas.style.backgroundColor = "#003f2e";
      break;
    case "spiral":
      spiralEffectActive = true;
      particles = [];
      // Add particle burst on activation
       // Explosión inicial en espiral
      for (let i = 0; i < 36; i++) {
      particles.push(new Particle(
      (i / 36) * Math.PI * 2, // Ángulo equidistante
      0 // Comenzando desde el centro
      ));
     }
      canvas.style.backgroundColor = "#110033";
      obstacleSpeed *= 0.7; // Only 30% speed reduction
      player.jumpPower = ORIGINAL_JUMP_POWER * 1.3; // Better jumps
      player.gravity = 0.3; // Reduced gravity for floaty feel
      break;
    case "lonely":
      canvas.style.backgroundColor = "#001f3f";
      obstacles = [];
      powerUps = [];
      allowSpawningObstacles = false;
      allowSpawningPowerUps = false;
      break;
  }
}

function deactivatePowerUp() {
  switch (activePowerUp) {
    case "eye":
      canvas.style.backgroundColor = "#000";
      break;
    case "spiral":
      spiralEffectActive = false;
      particles = [];
      canvas.style.backgroundColor = "#000";
      obstacleSpeed /= 0.7;
      player.jumpPower = ORIGINAL_JUMP_POWER;
      player.gravity = 0.5;
      break;
    case "lonely":
      canvas.style.backgroundColor = "#000";
      allowSpawningObstacles = true;
      allowSpawningPowerUps = true;
      break;
  }
  activePowerUp = null;
  powerUpDuration = 0;
}

class Player {
  constructor() {
    this.x = 100;
    this.y = GROUND_Y - 90;
    this.width = 61;
    this.height = 90;
    this.velocityY = 0;
    this.jumpPower = ORIGINAL_JUMP_POWER;
    this.gravity = 0.5;
    this.isJumping = false;

    // Hitbox ajustada (15px margen izquierdo, 20px margen superior)
    this.hitbox = {
      x: 15,
      y: 20,
      width: 31, // 61 - 15 - 15
      height: 50 // 90 - 20 - 20
    };

    this.sprite = new Image();
    this.sprite.src = "assets/Jon_Run2.png";

    this.frameX = 0;
    this.frameY = 0;
    this.frameWidth = 61;
    this.frameHeight = 90;
    this.frameCount = 8;
    this.frameTimer = 0;
    this.frameDelay = 10;

    this.tintedSprite = new Image();
    this.tintedSprite.src = "assets/Jon_Run2_tinted.png"; // Pre-made green version
    this.isTintedLoaded = false;
    this.tintedSprite.onload = () => this.isTintedLoaded = true;
    this.jumpSound = document.getElementById('jumpSound');
    this.jumpSound.volume = 0.3; // Lower than background music

  }
  
  jump() {
    if (!this.isJumping) {
      this.velocityY = -this.jumpPower;
      this.isJumping = true;
      this.jumpSound.currentTime = 0; // Reset if already playing
      this.jumpSound.play().catch(e => console.log("Jump sound error:", e));
    }
  }

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }

    if (!this.isJumping) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameDelay) {
        this.frameX = (this.frameX + 1) % this.frameCount;
        this.frameTimer = 0;
      }
    } else {
      this.frameX = 0;
    }
  }

  draw(ctx) {
    const sx = this.frameX * this.frameWidth;
    const sy = this.frameY * this.frameHeight;

    const spriteToUse = (playerInvulnerable && this.isTintedLoaded) 
      ? this.tintedSprite 
      : this.sprite;

    ctx.drawImage(
      spriteToUse,
      sx, sy, this.frameWidth, this.frameHeight,
      this.x, this.y, this.width, this.height
    );

    // if (playerInvulnerable) {
    //   const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8; // 0.6-1.0 range
    //   ctx.globalAlpha = pulse; // Makes the tint pulse slightly
    // }
    
  }

}

class Obstacle {
  constructor(x, y, width, height, speed) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
  }

  update() {
    this.x -= this.speed;
    
    if (spiralEffectActive) {
      // Add sinusoidal wave movement to obstacles
      this.y = GROUND_Y - this.height + 
               Math.sin(this.x * SPIRAL_WAVE_FREQUENCY + spiralWaveOffset) * SPIRAL_WAVE_AMPLITUDE;
    }
  }

  draw(ctx) {
    switch (currentPhase) {
      case 1: ctx.fillStyle = "#800"; break;
      case 2: ctx.fillStyle = "#446"; break;
      case 3: ctx.fillStyle = "#520060"; break;
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.type = type;
    this.color = this.getColorFromType();
  }

  getColorFromType() {
    switch (this.type) {
      case "eye": return "#00ff88";
      case "spiral": return "#ff00aa";
      case "lonely": return "#6f96b3";
      default: return "#aaa";
    }
  }

  update() {
    this.x -= obstacleSpeed;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}



function checkCollision(player, object) {
  const playerBox = {
    x: player.x + player.hitbox.x,
    y: player.y + player.hitbox.y,
    width: player.hitbox.width,
    height: player.hitbox.height
  };

  return (
    playerBox.x < object.x + object.width &&
    playerBox.x + playerBox.width > object.x &&
    playerBox.y < object.y + object.height &&
    playerBox.y + playerBox.height > object.y
  );
}
window.addEventListener("keydown", function(e) {
  if (e.code === "Space") {
    player.jump();
  }
});

// Music controls
document.getElementById('toggleMusic').addEventListener('click', function() {
  if (backgroundMusic.paused) {
    backgroundMusic.play();
    this.textContent = "🔇 Mute";
    musicPlaying = true;
  } else {
    backgroundMusic.pause();
    this.textContent = "🔈 Unmute";
    musicPlaying = false;
  }
});

document.getElementById('volumeUp').addEventListener('click', function() {
  if (backgroundMusic.volume < 1) {
    backgroundMusic.volume = Math.min(1, backgroundMusic.volume + 0.1);
  }
});

document.getElementById('volumeDown').addEventListener('click', function() {
  if (backgroundMusic.volume > 0) {
    backgroundMusic.volume = Math.max(0, backgroundMusic.volume - 0.1);
  }
});

/// Muestra la pantalla de juego y oculta menú/créditos
function startGame() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("credits").style.display = "none";
  document.getElementById("gameCanvas").style.display = "block";
  // Aquí llamas a tu initGame() o requestAnimationFrame(gameLoop)
}

// Oculta menú y muestra créditos
function showCredits() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("credits").style.display = "flex";
}

// Vuelve de créditos al menú principal
function showMenu() {
  document.getElementById("credits").style.display = "none";
  document.getElementById("menu").style.display = "flex";
}

