<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Pac-Man Custom - GitHub</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #000;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: 'Press Start 2P', cursive;
        }
        .info {
            width: 400px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 12px;
            color: #ffff00;
        }
        canvas {
            border: 4px solid #333;
            box-shadow: 0 0 20px #222;
        }
        #ui-death {
            position: absolute;
            display: none;
            flex-direction: column;
            align-items: center;
            background: rgba(0, 0, 0, 0.9);
            padding: 25px;
            border: 3px solid #f00;
            z-index: 100;
        }
        button {
            background: #f00;
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-family: 'Press Start 2P', cursive;
            cursor: pointer;
            margin-top: 15px;
            font-size: 10px;
        }
        button:hover { background: #b00; }
    </style>
</head>
<body>

    <div class="info">
        <div>LIVELLO: <span id="lvl">1</span></div>
        <div>SCORE: <span id="score">0</span></div>
    </div>

    <div id="ui-death">
        <div style="color: #f00; margin-bottom: 10px;">CATTURATO!</div>
        <button onclick="retryLevel()">RIPROVA LIVELLO</button>
    </div>

    <canvas id="gameCanvas" width="400" height="400"></canvas>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const TILE = 20;

        let score = 0;
        let currentLevel = 0;
        let isPaused = false;
        let isMusicPlaying = false; // Controlla se la musica è già stata avviata

        // ============================================================================
        // GESTORE AUDIO
        // ============================================================================
        const AudioManager = {
            bgMusic: new Audio('assets/music game.mp3'),
            soundDie: new Audio('assets/game die.mp3'),
            soundRetry: new Audio('assets/retry botton.flac'),
            soundEat: new Audio('assets/eat.wav'),
            soundBip: new Audio('assets/bip.wav'),

            init: function() {
                this.bgMusic.loop = true;
                this.bgMusic.volume = 0.4;
            },

            playMusic: function() {
                if (!isMusicPlaying) {
                    this.bgMusic.play()
                        .then(() => { isMusicPlaying = true; })
                        .catch(e => console.log("In attesa di interazione per l'audio"));
                }
            },

            stopMusic: function() {
                this.bgMusic.pause();
                this.bgMusic.currentTime = 0;
                isMusicPlaying = false;
            },

            playSFX: function(audioClip) {
                audioClip.currentTime = 0;
                audioClip.play().catch(e => console.log("Errore SFX:", e));
            }
        };

        // Inizializza l'audio
        AudioManager.init();

        // --- DATABASE DELLE MAPPE ---
        const MAPS = [
            // Livello 1: Semplice e aperto
            [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,0,1],
                [1,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,1],
                [1,0,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,0,1],
                [1,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            // Livello 2: Più corridoi
            [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1],
                [1,0,0,0,1,0,0,0,0,2,2,0,0,0,0,1,0,0,0,1],
                [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,0,1],
                [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ]
        ];

        let grid = [];
        let pacman, ghosts;

        function initLevel() {
            const mapIdx = currentLevel % MAPS.length;
            grid = MAPS[mapIdx].map(row => [...row]);
            
            pacman = {
                x: 1, y: 1,
                dx: 0, dy: 0,
                nextDx: 0, nextDy: 0,
                angle: 0,
                mouth: 0
            };

            // Fantasmi iniziali (più lenti all'inizio)
            ghosts = [
                { x: 9, y: 5, dx: 1, dy: 0, color: 'red', speedCounter: 0 },
                { x: 10, y: 5, dx: -1, dy: 0, color: 'pink', speedCounter: 0 }
            ];

            // Aggiungi un fantasma extra dal livello 2
            if(currentLevel >= 1) {
                ghosts.push({ x: 9, y: 3, dx: 0, dy: 1, color: 'cyan', speedCounter: 0 });
            }

            document.getElementById('lvl').innerText = currentLevel + 1;
            document.getElementById('ui-death').style.display = 'none';
            isPaused = false;
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Disegna Mappa
            for(let y=0; y<grid.length; y++){
                for(let x=0; x<grid[y].length; x++){
                    if(grid[y][x] === 1) {
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                        ctx.strokeStyle = '#33f';
                        ctx.strokeRect(x*TILE+2, y*TILE+2, TILE-4, TILE-4);
                    } else if(grid[y][x] === 0) {
                        ctx.fillStyle = '#ffb8ae';
                        ctx.beginPath();
                        ctx.arc(x*TILE + 10, y*TILE + 10, 2, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            }

            // Disegna Pacman con Rotazione Bocca
            pacman.mouth += 0.25;
            let open = Math.abs(Math.sin(pacman.mouth)) * 0.2;

            ctx.save();
            ctx.translate(pacman.x*TILE + 10, pacman.y*TILE + 10);
            ctx.rotate(pacman.angle);
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.arc(0, 0, 9, open * Math.PI, (2 - open) * Math.PI);
            ctx.fill();
            ctx.restore();

            // Disegna Fantasmi
            ghosts.forEach(g => {
                ctx.fillStyle = g.color;
                ctx.beginPath();
                ctx.arc(g.x*TILE + 10, g.y*TILE + 10, 8, Math.PI, 0);
                ctx.lineTo(g.x*TILE + 18, g.y*TILE + 18);
                ctx.lineTo(g.x*TILE + 2, g.y*TILE + 18);
                ctx.fill();
            });
        }

        function update() {
            if(isPaused) return;

            // Movimento Pacman
            if (grid[pacman.y + pacman.nextDy][pacman.x + pacman.nextDx] !== 1) {
                pacman.dx = pacman.nextDx;
                pacman.dy = pacman.nextDy;
                
                // Rotazione in base alla direzione
                if(pacman.dx === 1) pacman.angle = 0;
                if(pacman.dx === -1) pacman.angle = Math.PI;
                if(pacman.dy === 1) pacman.angle = Math.PI/2;
                if(pacman.dy === -1) pacman.angle = -Math.PI/2;
            }

            if (grid[pacman.y + pacman.dy][pacman.x + pacman.dx] !== 1) {
                pacman.x += pacman.dx;
                pacman.y += pacman.dy;
            }

            // Mangia puntini
            if(grid[pacman.y][pacman.x] === 0) {
                grid[pacman.y][pacman.x] = 2;
                score += 10;
                document.getElementById('score').innerText = score;
                
                // 🔊 Eat quando mangia i pallini
                AudioManager.playSFX(AudioManager.soundEat);
            }

            // Vittoria Livello
            let dots = 0;
            grid.forEach(row => row.forEach(c => { if(c === 0) dots++; }));
            if(dots === 0) {
                currentLevel++;
                initLevel();
            }

            // Movimento Fantasmi (Rallentati)
            ghosts.forEach(g => {
                g.speedCounter++;
                let speedDelay = Math.max(2, 4 - currentLevel); 
                
                if(g.speedCounter >= speedDelay) {
                    g.speedCounter = 0;
                    
                    let dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
                    if(grid[g.y + g.dy][g.x + g.dx] === 1 || Math.random() < 0.3) {
                        let valid = dirs.filter(d => grid[g.y + d.y][g.x + d.x] !== 1);
                        
                        let chanceToChase = currentLevel < 2 ? 0.2 : 0.7;

                        if(Math.random() < chanceToChase) {
                            valid.sort((a,b) => {
                                return Math.hypot(g.x+a.x - pacman.x, g.y+a.y - pacman.y) - 
                                       Math.hypot(g.x+b.x - pacman.x, g.y+b.y - pacman.y);
                            });
                        }
                        
                        let move = valid[0]; 
                        if(Math.random() > 0.8) move = valid[Math.floor(Math.random()*valid.length)];

                        if(move) { g.dx = move.x; g.dy = move.y; }
                    }
                    g.x += g.dx;
                    g.y += g.dy;
                }

                // Collisione (Morte)
                if(g.x === pacman.x && g.y === pacman.y) {
                    isPaused = true;
                    
                    // 🔊 Ferma la musica principale e riproduce "game die" quando muore
                    AudioManager.stopMusic();
                    AudioManager.playSFX(AudioManager.soundDie);

                    // Mostra l'interfaccia "CATTURATO"
                    document.getElementById('ui-death').style.display = 'flex';
                    
                    // 🔊 Retry botton quando esce la scritta "catturato"
                    AudioManager.playSFX(AudioManager.soundRetry);
                }
            });
        }

        function retryLevel() {
            initLevel();
            // Fa ripartire la musica quando si riprova il livello
            AudioManager.playMusic();
        }

        window.addEventListener('keydown', e => {
            // Sblocca e avvia la musica di sottofondo alla prima pressione di un tasto di movimento
            AudioManager.playMusic();

            if(e.key === 'ArrowUp')    { pacman.nextDx = 0; pacman.nextDy = -1; AudioManager.playSFX(AudioManager.soundBip); }
            if(e.key === 'ArrowDown')  { pacman.nextDx = 0; pacman.nextDy = 1;  AudioManager.playSFX(AudioManager.soundBip); }
            if(e.key === 'ArrowLeft')  { pacman.nextDx = -1; pacman.nextDy = 0; AudioManager.playSFX(AudioManager.soundBip); }
            if(e.key === 'ArrowRight') { pacman.nextDx = 1; pacman.nextDy = 0;  AudioManager.playSFX(AudioManager.soundBip); }
        });

        function gameLoop() {
            update();
            draw();
            setTimeout(() => {
                requestAnimationFrame(gameLoop);
            }, 120);
        }

        initLevel();
        gameLoop();
    </script>
</body>
</html>
