const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const grid = 20;
const rows = canvas.height / grid;
const cols = canvas.width / grid;

// Variables del juego
let snake, fruit, score, highScore = 0, gameInterval, isPaused = false, gameStarted = false;
const initialSpeed = 150;
let currentSpeed = initialSpeed;

// Elementos del DOM
const overlay = document.getElementById("gameOverlay");
const overlayText = document.getElementById("overlayText");
const pauseBtn = document.getElementById("pauseBtn");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");

// Paleta de Colores (Incluyendo tablero blanco/gris y verdes correctos)
const colors = {
  bg1: "#FFFFFF",         // Blanco
  bg2: "#E8E8E8",         // Gris muy claro
  head: "#76FF03",         // Verde lima brillante (cabeza)
  body: "#558B2F",         // Verde oliva oscuro (cuerpo y cola)
  eye: "#FFFFFF",          // Ojos blancos
  pupil: "#000000",        // Pupilas negras
  fruitBody: "#FF6347",    // Rojo tomate
  fruitStem: "#8B4513",    // Marrón tallo
  fruitLeaf: "#228B22",    // Verde hoja
  fruitShine: "rgba(255, 255, 255, 0.7)" // Brillo
};

// Configuración de Audio (con rutas de ejemplo)
// !! RECUERDA CREAR LA CARPETA 'sounds' Y PONER TUS ARCHIVOS !!
const sounds = {
    eat: new Audio('sounds/eat.wav'),
    lose: new Audio('sounds/lose.wav'),
    achievement: new Audio('sounds/achievement.wav'),
    music: new Audio('sounds/music.mp3')
};
sounds.music.loop = true;
sounds.music.volume = 0.3;
sounds.eat.volume = 0.5;
sounds.achievement.volume = 0.6;
sounds.lose.volume = 0.5;

// --- Clase Snake (con dibujo cuadrado y ojos móviles) ---
class Snake {
  constructor() {
    this.body = [ { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 } ];
    this.dx = 1;
    this.dy = 0;
  }

  changeDirection(newDx, newDy) {
    if (this.dx === -newDx && this.dx !== 0) return;
    if (this.dy === -newDy && this.dy !== 0) return;
    this.dx = newDx;
    this.dy = newDy;
  }

  move() {
    const head = { x: this.body[0].x + this.dx, y: this.body[0].y + this.dy };
    this.body.unshift(head);
  }

  // Separamos el incremento de score de grow para claridad
  incrementScore() {
     score++;
     scoreDisplay.innerText = "Puntos: " + score;
     // Aumentar velocidad opcionalmente
     if (score % 5 === 0 && currentSpeed > 50) {
         currentSpeed -= 10;
         resetInterval(); // Reinicia el intervalo con la nueva velocidad
     }
  }

  // Crecer solo añade el segmento, score se maneja aparte
  grow() {
      // No necesita hacer nada aquí, move() ya añade la cabeza
  }

  shrink() {
      this.body.pop();
  }

  draw() {
    this.body.forEach((part, i) => {
      const partX = part.x * grid;
      const partY = part.y * grid;

      // Color: Cabeza más clara, resto del cuerpo igual
      let segmentColor = (i === 0) ? colors.head : colors.body;
      ctx.fillStyle = segmentColor;
      // Dibuja un rectángulo simple (cuadrado)
      ctx.fillRect(partX, partY, grid, grid);

      // Dibuja Ojos (solo en la cabeza)
      if (i === 0) {
        const eyeRadius = grid * 0.18;
        const pupilRadius = grid * 0.09;

        // Centros fijos de los ojos blancos
        const eye1CenterX = partX + grid * 0.3;
        const eye1CenterY = partY + grid * 0.3;
        const eye2CenterX = partX + grid * 0.7;
        const eye2CenterY = partY + grid * 0.3;

        // Dibuja parte blanca
        ctx.fillStyle = colors.eye;
        ctx.beginPath(); ctx.arc(eye1CenterX, eye1CenterY, eyeRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eye2CenterX, eye2CenterY, eyeRadius, 0, Math.PI * 2); ctx.fill();

        // Lógica para dirigir las pupilas hacia la fruta
        const headCenterX = partX + grid / 2;
        const headCenterY = partY + grid / 2;
        // Asegúrate que 'fruit' es accesible y está definido
        const fruitCenterX = fruit ? fruit.x * grid + grid / 2 : headCenterX;
        const fruitCenterY = fruit ? fruit.y * grid + grid / 2 : headCenterY;

        let vectorX = fruitCenterX - headCenterX;
        let vectorY = fruitCenterY - headCenterY;
        const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

        let pupilOffsetX = 0;
        let pupilOffsetY = 0;
        const maxPupilShift = eyeRadius - pupilRadius;

        if (distance > 0) {
            const normalizedX = vectorX / distance;
            const normalizedY = vectorY / distance;
            pupilOffsetX = normalizedX * maxPupilShift;
            pupilOffsetY = normalizedY * maxPupilShift;
        }

        const pupil1X = eye1CenterX + pupilOffsetX;
        const pupil1Y = eye1CenterY + pupilOffsetY;
        const pupil2X = eye2CenterX + pupilOffsetX;
        const pupil2Y = eye2CenterY + pupilOffsetY;

        // Dibuja pupilas negras
        ctx.fillStyle = colors.pupil;
        ctx.beginPath(); ctx.arc(pupil1X, pupil1Y, pupilRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(pupil2X, pupil2Y, pupilRadius, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  collideSelf() {
    const [head, ...body] = this.body;
    // Empieza a comprobar desde el segundo segmento del cuerpo (índice 1)
    return body.some(p => p.x === head.x && p.y === head.y);
  }

  collideWall() {
    const head = this.body[0];
    return head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
  }

  eat(f) {
    const head = this.body[0];
    // Asegúrate que 'f' (fruta) no es null o undefined
    return f && head.x === f.x && head.y === f.y;
  }
}

// --- Clase Fruit (con dibujo de manzana grande) ---
class Fruit {
  constructor() {
    // Es importante llamar a randomize aquí, pero sin pasar snakeBody aún
    this.randomize();
  }

  randomize(snakeBody = []) {
      // Bucle para asegurar que no aparece sobre la serpiente
      let validPosition = false;
      while (!validPosition) {
          this.x = Math.floor(Math.random() * cols);
          this.y = Math.floor(Math.random() * rows);
          // Comprueba si la posición NO está en el cuerpo de la serpiente
          if (!snakeBody.some(part => part.x === this.x && part.y === this.y)) {
              validPosition = true;
          }
      }
  }

  draw() {
    const fruitX = this.x * grid;
    const fruitY = this.y * grid;
    const centerX = fruitX + grid / 2;
    const centerY = fruitY + grid / 2;
    const radius = grid * 0.45; // Radio grande

    // Dibuja Manzana Grande
    ctx.fillStyle = colors.fruitBody;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = colors.fruitStem;
    ctx.lineWidth = grid * 0.12;
    ctx.beginPath(); ctx.moveTo(centerX, centerY - radius * 0.6); ctx.lineTo(centerX + grid * 0.05, fruitY + grid * 0.1); ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = colors.fruitLeaf;
    ctx.beginPath();
    const leafStartX = centerX + grid * 0.05; const leafStartY = fruitY + grid * 0.2;
    ctx.moveTo(leafStartX, leafStartY);
    ctx.quadraticCurveTo(leafStartX + grid * 0.3, leafStartY - grid * 0.2, leafStartX + grid * 0.15, leafStartY + grid * 0.3);
    ctx.quadraticCurveTo(leafStartX - grid * 0.2, leafStartY + grid * 0.35, leafStartX, leafStartY);
    ctx.fill();

    ctx.fillStyle = colors.shine;
    ctx.beginPath(); ctx.arc(centerX - radius * 0.4, centerY - radius * 0.4, radius * 0.5, Math.PI * 1.4, Math.PI * 1.9); ctx.fill();
  }
}

// --- Funciones del Juego (con récord y sonidos integrados) ---

// Dibuja el fondo del tablero (blanco/gris)
function drawBoard() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? colors.bg1 : colors.bg2;
      ctx.fillRect(c * grid, r * grid, grid, grid);
    }
  }
}

// Carga High Score al inicio
function loadHighScore() {
    const storedScore = localStorage.getItem('snakeHighScore');
    // Usa || 0 para asignar 0 si storedScore es null o undefined
    highScore = parseInt(storedScore, 10) || 0;
    highScoreDisplay.innerText = `Record: ${highScore}`;
}

// Guarda High Score si es necesario
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore.toString());
        highScoreDisplay.innerText = `Record: ${highScore}`; // Actualiza visualización inmediatamente
    }
}

// Inicializa o resetea el estado del juego
function initGame() {
  snake = new Snake();
  fruit = new Fruit();
  // Ahora sí podemos pasar el cuerpo inicial de la serpiente a randomize
  fruit.randomize(snake.body);
  score = 0;
  currentSpeed = initialSpeed; // Resetea velocidad
  scoreDisplay.innerText = "Puntos: 0";
  // Muestra el récord actual al iniciar/reiniciar
  highScoreDisplay.innerText = `Record: ${highScore}`;
  isPaused = false;
  gameStarted = true;
  pauseBtn.disabled = false; // Habilita el botón de pausa
  pauseBtn.textContent = "Pausa";
  overlay.style.display = "none";

  // Iniciar música
  sounds.music.currentTime = 0;
  sounds.music.play().catch(error => {
      console.warn("Reproducción de música necesita interacción del usuario.", error);
      // Considerar añadir un botón "Activar Sonido" si esto es un problema frecuente
  });

  resetInterval(); // Inicia el bucle del juego
}

// Reinicia el intervalo del juego
function resetInterval() {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, currentSpeed);
}

// Muestra el overlay y detiene el juego/música
function showOverlay(htmlContent) {
    overlayText.innerHTML = htmlContent;
    const restartBtn = overlayText.querySelector("button");
    if (restartBtn) {
        restartBtn.onclick = initGame;
    }
    overlay.style.display = "flex";
    clearInterval(gameInterval); // Detiene el bucle
    sounds.music.pause();      // Pausa la música
    pauseBtn.disabled = true; // Deshabilita el botón de pausa en el overlay
}

// Bucle principal del juego
function gameLoop() {
  if (!gameStarted || isPaused) return;

  snake.move();

  // Comprobar Colisión (Pared o Cuerpo)
  if (snake.collideWall() || snake.collideSelf()) {
    gameStarted = false;
    sounds.lose.play(); // Sonido de perder
    saveHighScore();    // Guarda el récord si es necesario
    // Muestra puntaje y récord en el mensaje final
    showOverlay(`¡Perdiste!<br>Puntos: ${score}<br>Record: ${highScore}<br><button>Reiniciar</button>`);
    return; // Termina el bucle
  }

  // Comprobar Comer Fruta
  if (snake.eat(fruit)) {
    snake.grow(); // La serpiente crece (no quita cola)
    snake.incrementScore(); // Incrementa puntaje y actualiza display
    fruit.randomize(snake.body); // Nueva fruta en lugar válido

    // Sonido de comer
    sounds.eat.currentTime = 0;
    sounds.eat.play();

    // Sonido de logro cada 10 puntos
    if (score > 0 && score % 10 === 0) {
        sounds.achievement.currentTime = 0;
        sounds.achievement.play();
    }
  } else {
    snake.shrink(); // No comió, quita la cola
  }

  // Dibujar todo en el canvas
  drawBoard();
  // Es importante dibujar la fruta ANTES que la serpiente si quieres que la serpiente pase por encima visualmente
  fruit.draw();
  snake.draw();
}

// Manejador de eventos de teclado
document.addEventListener("keydown", (e) => {
  // Si el overlay está visible, solo permite Enter para iniciar/reiniciar
  if (overlay.style.display !== 'none') {
      if (e.key === "Enter") {
          initGame();
      }
      return; // Ignora otras teclas si el overlay está activo
  }

  // Si el juego ha iniciado pero está pausado, solo permite reanudar
  if (isPaused) {
       if (e.key === " " || e.key.toLowerCase() === "p") {
            togglePause();
       }
       return; // Ignora otras teclas si está pausado
  }

  // Si el juego está activo
  if (gameStarted && !isPaused) {
      switch (e.key.toLowerCase()) { // Usa toLowerCase para W, A, S, D, P
          case "arrowup": case "w":
              if (snake.dy === 0) snake.changeDirection(0, -1);
              break;
          case "arrowdown": case "s":
              if (snake.dy === 0) snake.changeDirection(0, 1);
              break;
          case "arrowleft": case "a":
              if (snake.dx === 0) snake.changeDirection(-1, 0);
              break;
          case "arrowright": case "d":
              if (snake.dx === 0) snake.changeDirection(1, 0);
              break;
          case " ": case "p":
              togglePause();
              break;
      }
  }
});

// Función para pausar/reanudar
function togglePause() {
    // Solo funciona si el juego ha iniciado
    if (!gameStarted) return;

    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = "Reanudar";
        clearInterval(gameInterval); // Detiene el bucle
        sounds.music.pause();      // Pausa la música
    } else {
        pauseBtn.textContent = "Pausa";
        // Reanuda la música solo si no estaba ya pausada por otra razón (ej. perder)
        sounds.music.play().catch(error => console.warn("Error al reanudar música:", error));
        resetInterval(); // Reanuda el bucle
    }
}

// Evento para el botón de Pausa/Reanudar
pauseBtn.onclick = togglePause;

// --- Código de Inicialización al Cargar la Página ---
window.onload = () => {
    loadHighScore(); // Carga el récord guardado
    showOverlay("¡Bienvenido a Snake!<br>Usa las flechas (o WASD) para moverte.<br><button>Empezar</button>");
    pauseBtn.disabled = true; // Deshabilita pausa inicialmente
};
