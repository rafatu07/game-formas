import 'phaser';

class MainScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private playerSpeed: number = 400;
    private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private playerTrail!: Phaser.GameObjects.Particles.ParticleEmitter;
    private obstaclePatterns: ((x: number, y: number) => void)[] = [];
    private music!: HTMLAudioElement;
    private beatTime: number = 461; // Tempo aproximado entre batidas em milissegundos
    private musicStarted: boolean = false;
    private statusText!: Phaser.GameObjects.Text;
    private audioInitialized: boolean = false;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Carregar textura para partículas
        this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
    }

    initAudio() {
        if (this.audioInitialized) return;

        // Criar elemento de áudio com múltiplas fontes
        this.music = document.createElement('audio');
        
        // Adicionar múltiplas fontes em diferentes formatos
        const sources = [
            { src: './assets/musica.mp3', type: 'audio/mpeg' },
            { src: './assets/musica-um.mp3', type: 'audio/mpeg' }
        ];

        sources.forEach(source => {
            const sourceElement = document.createElement('source');
            sourceElement.src = source.src;
            sourceElement.type = source.type;
            this.music.appendChild(sourceElement);
        });

        // Configurar propriedades do áudio
        this.music.volume = 0.5;
        this.music.loop = true;

        // Adicionar ao DOM (necessário para alguns navegadores)
        document.body.appendChild(this.music);

        // Monitorar eventos
        this.music.addEventListener('canplaythrough', () => {
            console.log('Áudio carregado e pronto para reprodução');
            this.statusText.setText('Status: Áudio pronto');
        });

        this.music.addEventListener('error', (e: ErrorEvent) => {
            console.error('Erro ao carregar áudio:', e);
            const error = this.music.error;
            if (error) {
                console.error('Código do erro:', error.code);
                console.error('Mensagem do erro:', error.message);
            }
            this.statusText.setText('Status: Erro ao carregar áudio');
        });

        this.music.addEventListener('play', () => {
            console.log('Áudio iniciou a reprodução');
            this.statusText.setText('Status: Música tocando');
        });

        this.music.addEventListener('pause', () => {
            console.log('Áudio pausado');
            this.statusText.setText('Status: Música pausada');
        });

        this.audioInitialized = true;
    }

    create() {
        if (!this.input?.keyboard) {
            console.error('Keyboard not available');
            return;
        }

        // Criar o jogador (um círculo azul)
        this.player = this.add.circle(400, 300, 15, 0x00ffff);
        
        // Adicionar física ao jogador
        this.physics.add.existing(this.player, false);
        
        // Configurar as teclas de movimento
        this.cursors = this.input.keyboard.createCursorKeys();

        // Configurar colisões com as bordas
        if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
            this.player.body.setCollideWorldBounds(true);
        }

        // Configurar rastro de partículas do jogador
        this.add.particles(0, 0, 'flares', {
            frame: 'blue',
            speed: 100,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 200,
            tint: 0x00ffff,
            follow: this.player
        });

        // Definir padrões de obstáculos
        this.setupObstaclePatterns();

        // Adicionar texto de status
        this.statusText = this.add.text(10, 10, 'Status: Aguardando início', {
            fontSize: '16px',
            color: '#ffffff'
        });

        // Adicionar texto de instrução
        const startText = this.add.text(400, 200, 'Clique para inicializar o áudio\nDepois:\nESPAÇO para iniciar\nM para mutar\nR para reiniciar', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        });
        startText.setOrigin(0.5);

        // Inicializar áudio após interação do usuário
        this.input.on('pointerdown', () => {
            if (!this.audioInitialized) {
                console.log('Inicializando áudio após interação do usuário');
                this.initAudio();
                startText.setText('Pressione ESPAÇO para iniciar\nM para mutar\nR para reiniciar');
            }
        });

        // Iniciar música com a tecla espaço
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.audioInitialized) {
                console.log('Áudio ainda não inicializado');
                return;
            }

            if (!this.musicStarted) {
                console.log('Tentando iniciar música...');
                this.music.play().catch(error => {
                    console.error('Erro ao iniciar música:', error);
                    this.statusText.setText('Status: Erro ao iniciar música');
                });
                this.musicStarted = true;
                startText.destroy();

                // Iniciar geração de obstáculos
                this.time.addEvent({
                    delay: this.beatTime,
                    callback: this.spawnRandomPattern,
                    callbackScope: this,
                    loop: true
                });
            }
        });

        // Adicionar tecla M para mutar/desmutar
        this.input.keyboard.on('keydown-M', () => {
            if (!this.audioInitialized) return;

            if (!this.music.paused) {
                this.music.pause();
            } else if (this.musicStarted) {
                this.music.play().catch(error => {
                    console.error('Erro ao retomar música:', error);
                });
            }
        });

        // Adicionar tecla R para reiniciar a música
        this.input.keyboard.on('keydown-R', () => {
            if (!this.audioInitialized) return;

            this.music.currentTime = 0;
            if (!this.music.paused) {
                this.music.play().catch(error => {
                    console.error('Erro ao reiniciar música:', error);
                });
            }
        });
    }

    setupObstaclePatterns() {
        // Padrão 1: Linha de obstáculos
        this.obstaclePatterns.push((x, y) => {
            for (let i = 0; i < 5; i++) {
                this.createObstacle(x + i * 50, y, 20, 20);
            }
        });

        // Padrão 2: Círculo de obstáculos
        this.obstaclePatterns.push((x, y) => {
            const radius = 100;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const obstacleX = x + Math.cos(angle) * radius;
                const obstacleY = y + Math.sin(angle) * radius;
                this.createObstacle(obstacleX, obstacleY, 20, 20);
            }
        });

        // Padrão 3: Zig-zag
        this.obstaclePatterns.push((x, y) => {
            for (let i = 0; i < 5; i++) {
                this.createObstacle(
                    x + i * 60,
                    y + (i % 2 === 0 ? 50 : -50),
                    20, 20
                );
            }
        });

        // Padrão 4: Espiral
        this.obstaclePatterns.push((x, y) => {
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 4;
                const radius = i * 20;
                const obstacleX = x + Math.cos(angle) * radius;
                const obstacleY = y + Math.sin(angle) * radius;
                this.createObstacle(obstacleX, obstacleY, 15, 15);
            }
        });
    }

    spawnRandomPattern() {
        // Só gera padrões se a música estiver tocando
        if (this.musicStarted && !this.music.paused) {
            const pattern = Phaser.Math.RND.pick(this.obstaclePatterns);
            pattern(800, Phaser.Math.Between(100, 500));
        }
    }

    createObstacle(x: number, y: number, width: number, height: number) {
        const obstacle = this.add.rectangle(x, y, width, height, 0xff0000);
        this.physics.add.existing(obstacle, false);
        
        // Adicionar partículas ao obstáculo
        const particles = this.add.particles(x, y, 'flares', {
            frame: 'red',
            speed: 50,
            scale: { start: 0.1, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: 0xff0000,
            quantity: 1,
            follow: obstacle
        });
        
        // Movimento do obstáculo sincronizado com a batida
        this.tweens.add({
            targets: obstacle,
            x: -100,
            duration: this.beatTime * 2, // Duração baseada no tempo da batida
            ease: 'Linear',
            onComplete: () => {
                obstacle.destroy();
                particles.destroy();
            }
        });

        // Adicionar colisão
        this.physics.add.overlap(this.player, obstacle, () => this.handleCollision(), undefined, this);
    }

    handleCollision() {
        // Efeito de explosão na colisão
        const explosion = this.add.particles(this.player.x, this.player.y, 'flares', {
            frame: 'red',
            speed: { min: -200, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 20,
            tint: 0xff0000
        });
        
        // Flash do jogador
        if (this.player instanceof Phaser.GameObjects.Arc) {
            this.player.setFillStyle(0xff0000);
            this.time.delayedCall(100, () => {
                this.player.setFillStyle(0x00ffff);
                explosion.destroy();
            });
        }
    }

    update() {
        if (!this.cursors) return;
        
        if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
            // Resetar a velocidade
            this.player.body.setVelocity(0);

            // Movimento horizontal
            if (this.cursors.left.isDown) {
                this.player.body.setVelocityX(-this.playerSpeed);
            } else if (this.cursors.right.isDown) {
                this.player.body.setVelocityX(this.playerSpeed);
            }

            // Movimento vertical
            if (this.cursors.up.isDown) {
                this.player.body.setVelocityY(-this.playerSpeed);
            } else if (this.cursors.down.isDown) {
                this.player.body.setVelocityY(this.playerSpeed);
            }
        }
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    audio: {
        disableWebAudio: false,
        noAudio: false
    },
    scene: MainScene
};

new Phaser.Game(config); 