// CENTIPEDE 2026 - Game Engine
// Tecnologie moderne: ES6+, Canvas API, RequestAnimationFrame

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    distance(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    copy() {
        return new Vector2(this.x, this.y);
    }
}

class Player {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.size = 15;
        this.speed = 5;
        this.vel = new Vector2(0, 0);
        this.fireRate = 200; // ms
        this.lastShot = 0;
    }

    update(keys, width, height) {
        // Movimento basato su input
        this.vel.x = 0;
        if (keys['a'] || keys['ArrowLeft']) this.vel.x = -this.speed;
        if (keys['d'] || keys['ArrowRight']) this.vel.x = this.speed;

        // Aggiorna posizione
        this.pos.x += this.vel.x;

        // Vincoli ai bordi
        this.pos.x = Math.max(this.size, Math.min(width - this.size, this.pos.x));
    }

    draw(ctx) {
        // Giocatore - forma triangolare moderna
        ctx.save();
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;

        // Triangolo
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y - this.size);
        ctx.lineTo(this.pos.x - this.size, this.pos.y + this.size);
        ctx.lineTo(this.pos.x + this.size, this.pos.y + this.size);
        ctx.closePath();
        ctx.fill();

        // Glow effect
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    canFire(now) {
        if (now - this.lastShot > this.fireRate) {
            this.lastShot = now;
            return true;
        }
        return false;
    }
}

class Bullet {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(0, -10);
        this.size = 4;
        this.active = true;
    }

    update(height) {
        this.pos = this.pos.add(this.vel);
        if (this.pos.y < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    intersects(x, y, radius) {
        return this.pos.distance(new Vector2(x, y)) < radius + this.size;
    }
}

class CentipedeSegment {
    constructor(x, y, currentLevel = 1) {
        this.pos = new Vector2(x, y);
        this.size = 12;
        
        // MODIFICA: La velocità aumenta linearmente del 15% ad ogni livello in modo continuo
        const speedMultiplier = 1 + (currentLevel - 1) * 0.15;
        this.vel = new Vector2(1 * speedMultiplier, 0);
        
        this.nextPos = this.pos.copy();
        this.moveCounter = 0;
        this.moveInterval = 1; // Esecuzione fissa ad ogni frame per fluidità massima
    }

    update(width, height, funghi) {
        this.moveCounter++;
        if (this.moveCounter >= this.moveInterval) {
            this.moveCounter = 0;
            this.nextPos = this.pos.add(this.vel);

            // Controlla i bordi (tiene conto del moltiplicatore di velocità nel rimbalzo)
            if (this.nextPos.x - this.size < 0 || this.nextPos.x + this.size > width) {
                this.vel.x *= -1;
                this.nextPos.y += 20;
                this.nextPos.x = this.pos.x + (this.vel.x * 2);
            }

            // Controlla i bordi verticali
            if (this.nextPos.y + this.size > height) {
                return false; // Centipede ha raggiunto il fondo
            }

            // Controlla collisione con funghi
            let hasCollision = false;
            for (let fungo of funghi) {
                if (this.pos.distance(fungo.pos) < this.size + fungo.size) {
                    hasCollision = true;
                    break;
                }
            }

            if (!hasCollision) {
                this.pos = this.nextPos.copy();
            } else {
                // Inverte la marcia se colpisce un fungo lateralmente
                this.vel.x *= -1;
                this.pos.y += 20;
            }
        }

        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Occhio del centipede
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.pos.x - 4, this.pos.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Centipede {
    constructor(startX, startY, length, currentLevel = 1) {
        this.segments = [];
        for (let i = 0; i < length; i++) {
            this.segments.push(new CentipedeSegment(startX - i * 30, startY, currentLevel));
        }
    }

    update(width, height, funghi) {
        if (this.segments.length === 0) return true;

        // Aggiorna dalla testa
        if (!this.segments[0].update(width, height, funghi)) {
            return false; // Il centipede ha raggiunto il fondo
        }

        // Aggiorna il resto del corpo (mantiene i segmenti uniti proporzionalmente alla velocità)
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const current = this.segments[i];
            const dist = prev.pos.distance(current.pos);

            if (dist > 25) {
                const direction = new Vector2(
                    prev.pos.x - current.pos.x,
                    prev.pos.y - current.pos.y
                );
                const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
                direction.x /= len;
                direction.y /= len;

                current.pos.x = prev.pos.x - direction.x * 25;
                current.pos.y = prev.pos.y - direction.y * 25;
            }
        }

        return true;
    }

    draw(ctx) {
        for (let segment of this.segments) {
            segment.draw(ctx);
        }
    }

    getCollisions(bullets) {
        const collisions = [];
        for (let i = 0; i < this.segments.length; i++) {
            for (let j = 0; j < bullets.length; j++) {
                if (bullets[j].intersects(this.segments[i].pos.x, this.segments[i].pos.y, this.segments[i].size)) {
                    collisions.push({ bulletIndex: j, segmentIndex: i });
                }
            }
        }
        return collisions;
    }
}

class Fungo {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.size = 10;
        this.health = 1;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = `rgba(150, 100, 255, ${this.health * 0.7 + 0.3})`;
        ctx.shadowColor = '#9664ff';
        ctx.shadowBlur = 6;

        // Disegna il fungo a forma circolare
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            const x = this.pos.x + Math.cos(angle) * this.size;
            const y = this.pos.y + Math.sin(angle) * this.size;
            ctx.beginPath();
            ctx.arc(x, y, this.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.player = new Player(this.width / 2, this.height - 40);
        this.bullets = [];
        this.centipedes = [];
        this.funghi = [];
        this.explosions = [];

        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.centipedesEliminated = 0;
        this.paused = false;

        this.keys = {};
        this.gameOver = false;
        this.lastFrameTime = Date.now();

        // Inizializzazione e caricamento suoni
        this.audioInitialized = false;
        this.sounds = {
            sparo: new Audio('assets/sparo.wav'),
            morte: new Audio('assets/morte.wav'),
            cambioLivello: new Audio('assets/cambio livello.wav'),
            punti: new Audio('assets/collecting points.wav'),
            background: new Audio('assets/background sound.wav'),
            snake: new Audio('assets/snake.wav')
        };

        // Configurazione loop e volumi audio
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.4; 
        this.sounds.snake.loop = true;
        this.sounds.snake.volume = 0.3;      

        this.setupEventListeners();
        this.spawnLevel();
    }

    initAudio() {
        if (this.audioInitialized) return;
        this.audioInitialized = true;
        this.sounds.background.play().catch(e => console.log("Riproduzione audio bloccata:", e));
        if (this.centipedes.length > 0 && !this.paused && !this.gameOver) {
            this.sounds.snake.play().catch(e => {});
        }
    }

    playSound(soundKey) {
        const sound = this.sounds[soundKey];
        if (sound) {
            const soundClone = sound.cloneNode();
            soundClone.volume = sound.volume;
            soundClone.play().catch(e => console.log("Errore riproduzione effetto:", e));
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.initAudio();
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            if (key === 'p') {
                this.paused = !this.paused;
                if (this.paused) {
                    this.sounds.background.pause();
                    this.sounds.snake.pause();
                } else {
                    if (this.audioInitialized) {
                        this.sounds.background.play().catch(e => {});
                        if (this.centipedes.length > 0) this.sounds.snake.play().catch(e => {});
                    }
                }
            }

            if (key === ' ') {
                e.preventDefault();
                this.playerFire();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        });

        this.canvas.addEventListener('click', () => {
            this.initAudio();
            this.playerFire();
        });
    }

    spawnLevel() {
        this.centipedes = [];
        this.funghi = [];
        this.bullets = [];
        this.explosions = [];

        for (let i = 0; i < 8 + this.level * 2; i++) {
            const x = Math.random() * (this.width - 40) + 20;
            const y = Math.random() * (this.height - 200) + 100;
            this.funghi.push(new Fungo(x, y));
        }

        const centipedeLength = 6 + this.level;
        const centipedeStart = Math.random() * (this.width - 100) + 50;
        this.centipedes.push(new Centipede(centipedeStart, 30, centipedeLength, this.level));

        if (this.audioInitialized && !this.paused && !this.gameOver) {
            this.sounds.snake.play().catch(e => {});
        }
    }

    playerFire() {
        if (this.gameOver || this.paused) return;

        const now = Date.now();
        if (this.player.canFire(now)) {
            this.bullets.push(new Bullet(this.player.pos.x, this.player.pos.y));
            this.playSound('sparo');
        }
    }

    update() {
        if (this.paused || this.gameOver) return;

        this.player.update(this.keys, this.width, this.height);

        this.bullets = this.bullets.filter((b) => {
            b.update(this.height);
            for (let fungo of this.funghi) {
                if (b.pos.distance(fungo.pos) < b.size + fungo.size) {
                    b.active = false; 
                    break;
                }
            }
            return b.active;
        });

        this.centipedes = this.centipedes.filter((c) => c.update(this.width, this.height, this.funghi));

        if (this.centipedes.length === 0) {
            this.level++;
            this.sounds.snake.pause(); 
            this.playSound('cambioLivello'); 
            this.spawnLevel();
        }

        for (let centipede of this.centipedes) {
            const collisions = centipede.getCollisions(this.bullets);

            for (let collision of collisions) {
                const { bulletIndex, segmentIndex } = collision;

                if (bulletIndex < this.bullets.length) {
                    this.bullets.splice(bulletIndex, 1);
                }

                const segment = centipede.segments[segmentIndex];
                this.createExplosion(segment.pos.x, segment.pos.y);

                centipede.segments.splice(segmentIndex, 1);
                this.score += 100;
                this.playSound('punti'); 

                if (centipede.segments.length === 0) {
                    this.centipedesEliminated++;
                    this.score += 500;
                }
            }
        }

        this.centipedes = this.centipedes.filter((c) => c.segments.length > 0);

        if (this.centipedes.length === 0) {
            this.sounds.snake.pause();
        }

        for (let centipede of this.centipedes) {
            for (let segment of centipede.segments) {
                if (this.player.pos.distance(segment.pos) < this.player.size + segment.size) {
                    this.loseLife();
                    return;
                }
            }
        }

        this.explosions = this.explosions.filter(e => e.life > 0);
        for (let exp of this.explosions) {
            exp.life--;
        }

        this.updateHUD();
    }

    createExplosion(x, y) {
        this.explosions.push({
            pos: new Vector2(x, y),
            life: 10,
            maxLife: 10,
            radius: 20
        });
    }

    loseLife() {
        this.lives--;
        this.playSound('morte'); 

        if (this.lives <= 0) {
            this.endGame();
        } else {
            this.player.pos.x = this.width / 2;
            this.player.pos.y = this.height - 40;
            this.bullets = [];
        }
    }

    endGame() {
        this.gameOver = true;
        this.sounds.background.pause(); 
        this.sounds.snake.pause();      
        
        document.getElementById('gameOver').classList.add('show');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLives').textContent = this.lives;
        document.getElementById('finalCentipedes').textContent = this.centipedesEliminated;
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = Math.max(0, this.lives);
        document.getElementById('level').textContent = this.level;
        document.getElementById('centipedes').textContent = this.centipedesEliminated;
    }

    draw() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.width, i);
            this.ctx.stroke();
        }

        for (let fungo of this.funghi) {
            fungo.draw(this.ctx);
        }

        for (let centipede of this.centipedes) {
            centipede.draw(this.ctx);
        }

        for (let bullet of this.bullets) {
            bullet.draw(this.ctx);
        }

        this.player.draw(this.ctx);

        for (let exp of this.explosions) {
            const alpha = exp.life / exp.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ff6600';
            this.ctx.shadowColor = '#ff6600';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#00ff88';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadow = '0 0 20px #00ff88';
            this.ctx.fillText('PAUSA', this.width / 2, this.height / 2);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.gameLoop();
});
