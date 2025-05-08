let canvas, ctx;
let player;
let gameRunning = false;
let obstacleSpeed = 3;
let obstacles = [];
let spawnTimer = 0;
let score = 0;

let powerUps = [];
let powerUpTimer = 0;
let activePowerUp = null;
let powerUpDuration = 0;
let allowSpawningObstacles = true;
let allowSpawningPowerUps = true;

const SPIRAL_SLOWDOWN = 0.5;
const ORIGINAL_JUMP_POWER = 12;
const GROUND_Y = 390; // 300 (player Y) + 90 (altura del sprite)



let nextPowerUpType = null;
let currentPhase = 1;

let playerInvulnerable = false;
let invulnerableTimer = 0;


function startGame() {
  document.getElementById("menu").style.display = "none";
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;


  player = new Player();
  gameRunning = true;

  requestAnimationFrame(gameLoop);
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
  else currentPhase = 3;
}

function getPhaseName(phase) {
  switch (phase) {
    case 1: return "ARCHIVOS";
    case 2: return "TÚNELES";
    case 3: return "SMIRKE";
    default: return "";
  }
}

function update() {
  player.update();
  score += 1;
  updatePhase(score);

  if (score % 500 === 0 && obstacleSpeed < 6) {
    obstacleSpeed += 0.5;
  }

  // Inmunidad por power-up
  if (playerInvulnerable) {
    invulnerableTimer--;
    if (invulnerableTimer <= 0) playerInvulnerable = false;
  }


  let spawnInterval = 120 - (obstacleSpeed * 10);
  spawnInterval = Math.max(spawnInterval, 40);

  spawnTimer++;
  if (spawnTimer > spawnInterval && allowSpawningObstacles) {
    const height = Math.random() * 30 + 40;
    const newObstacle = new Obstacle(800, GROUND_Y - height, 30, height, obstacleSpeed);
    obstacles.push(newObstacle);
    spawnTimer = 0;
  }

  obstacles.forEach(o => o.update());
  obstacles = obstacles.filter(o => !o.isOffScreen());

  obstacles.forEach(o => {
    if (!playerInvulnerable && checkCollision(player, o)) {
      gameRunning = false;
      alert("¡Has perdido! Recarga para reiniciar.");
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
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.draw(ctx);
  obstacles.forEach(o => o.draw(ctx));
  powerUps.forEach(p => p.draw(ctx));

  ctx.fillStyle = "#fff";
  ctx.font = "20px Courier";
  ctx.fillText("Puntuación: " + score, 10, 30);
  ctx.fillText("Fase: " + getPhaseName(currentPhase), 10, 50);

  if (activePowerUp) {
    ctx.fillText("Poder: " + activePowerUp, 10, 70);
  }

  if (activePowerUp === "eye") {
    if (nextPowerUpType) {
      ctx.fillText("Próximo poder: " + nextPowerUpType, 10, 90);
    }
    const nextPhase = currentPhase + 1;
    const nextScore = nextPhase * 1000;
    if (currentPhase < 3) {
      ctx.fillText("Cambio a fase " + nextPhase + " en: " + (nextScore - score) + " pts", 10, 110);
    } else {
      ctx.fillText("Fase final: SMIRKE", 10, 110);
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
      canvas.style.backgroundColor = "#330033";
      canvas.style.filter = "blur(1px)";
      obstacleSpeed *= SPIRAL_SLOWDOWN;
      spawnTimer = 60;
      player.jumpPower = ORIGINAL_JUMP_POWER * SPIRAL_SLOWDOWN;
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
      canvas.style.backgroundColor = "#000";
      canvas.style.filter = "none";
      obstacleSpeed /= SPIRAL_SLOWDOWN;
      player.jumpPower = ORIGINAL_JUMP_POWER;
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
    this.y = 300;
    this.width = 61;
    this.height = 90;
    this.velocityY = 0;
    this.jumpPower = ORIGINAL_JUMP_POWER;
    this.gravity = 0.5;
    this.isJumping = false;

    this.y = GROUND_Y - 90; // si tu sprite mide 90px de alto

    this.sprite = new Image();
    this.sprite.src = "assets/Jon_Run2.png"; // ajusta si tu ruta es distinta

    this.frameX = 0;
    this.frameY = 0;
    this.frameWidth = 61;
    this.frameHeight = 90;
    this.frameCount = 8;
    this.frameTimer = 0;
    this.frameDelay = 6; // menor = animación más rápida
  }

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }
    

    // Animación solo si está en suelo
    if (!this.isJumping) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameDelay) {
        this.frameX = (this.frameX + 1) % this.frameCount;
        this.frameTimer = 0;
      }
    } else {
      this.frameX = 0; // frame quieto al saltar
    }

  }

  draw(ctx) {

    ctx.strokeStyle = "red";
    ctx.strokeRect(this.x + 15, this.y + 20, this.width - 30, this.height - 40);


    const sx = this.frameX * this.frameWidth;
    const sy = this.frameY * this.frameHeight;

    ctx.drawImage(
      this.sprite,
      sx, sy, this.frameWidth, this.frameHeight,
      this.x, this.y, this.width, this.height
    );

    if (playerInvulnerable) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = -this.jumpPower;
      this.isJumping = true;
    }
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

function checkCollision(a, b) {
  // hitbox ajustada del jugador (a)
  const marginX = 15;
  const marginY = 20;

  return (
    a.x + marginX < b.x + b.width &&
    a.x + a.width - marginX > b.x &&
    a.y + marginY < b.y + b.height &&
    a.y + a.height - marginY > b.y
  );
}


window.addEventListener("keydown", function(e) {
  if (e.code === "Space") {
    player.jump();
  }
});
