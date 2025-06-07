import 'phaser';
import { musicList, MusicInfo } from './assets/musicInfo';
import { AudioManager } from './audioManager';

// Cena do jogo principal (antiga MainScene)
class GameScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private playerSpeed: number = 400;
    private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private playerTrail!: Phaser.GameObjects.Particles.ParticleEmitter;
    private obstaclePatterns: ((x: number, y: number) => void)[] = [];
    private audioManager!: AudioManager;
    private beatTime: number = 461; // Tempo aproximado entre batidas em milissegundos
    private musicStarted: boolean = false;
    private statusText!: Phaser.GameObjects.Text;
    private levelData: MusicInfo | null = null;
    private levelTitle!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private score: number = 0;
    private lives: number = 3;
    private livesIcons: Phaser.GameObjects.Arc[] = [];
    private gameOver: boolean = false;
    private pauseButton!: Phaser.GameObjects.Container;
    private isPaused: boolean = false;
    private pauseMenu!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { levelData: MusicInfo }) {
        // Receber dados do nível selecionado
        this.levelData = data.levelData;
        
        // Calcular o tempo entre batidas com base no BPM
        if (this.levelData) {
            this.beatTime = 60000 / this.levelData.bpm;
        }
        
        // Resetar variáveis de estado
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.isPaused = false;
        this.musicStarted = false;
    }

    preload() {
        // Carregar textura para partículas
        this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
        
        // Inicializar o gerenciador de áudio (ele carrega a música)
        this.audioManager = new AudioManager(this);
    }

    create() {
        if (!this.input?.keyboard) {
            console.error('Keyboard not available');
            return;
        }

        // Adicionar interface de jogo
        this.createUI();

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

        // Adicionar texto de instrução
        const startText = this.add.text(400, 200, 'Pressione ESPAÇO para iniciar\nESC para pausar\nR para reiniciar', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        });
        startText.setOrigin(0.5);

        // Configurar listeners para desbloquear o áudio
        this.audioManager.setupUnlockListeners();

        // Iniciar música com a tecla espaço
        this.input.keyboard.on('keydown-SPACE', () => {
            this.playMusic();
        });

        // Reiniciar o jogo com a tecla R
        this.input.keyboard.on('keydown-R', () => {
            if (!this.gameOver) {
                this.scene.restart({ levelData: this.levelData });
            }
        });

        // Pausar o jogo com a tecla ESC
        this.input.keyboard.on('keydown-ESC', () => {
            this.togglePause();
        });
    }

    createUI() {
        // Painel superior com informações do nível
        const topPanel = this.add.rectangle(400, 30, 800, 60, 0x000000, 0.5);
        
        // Título do nível
        if (this.levelData) {
            this.levelTitle = this.add.text(400, 30, `${this.levelData.title} - ${this.levelData.songTitle}`, {
                fontSize: '20px',
                color: '#ffffff'
            });
            this.levelTitle.setOrigin(0.5);
        }
        
        // Texto de status (para debug)
        this.statusText = this.add.text(10, 570, 'Status: Iniciando...', {
            fontSize: '16px',
            color: '#ffffff'
        });
        
        // Pontuação
        this.scoreText = this.add.text(700, 30, 'Pontos: 0', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.scoreText.setOrigin(1, 0.5);
        
        // Criar ícones de vidas
        this.createLivesIcons();
        
        // Criar botão de pausa
        this.createPauseButton();
        
        // Criar menu de pausa (inicialmente invisível)
        this.createPauseMenu();
        
        // Criar botão de controle de música
        this.createMusicButton();
    }

    createLivesIcons() {
        // Limpar ícones existentes
        this.livesIcons.forEach(icon => icon.destroy());
        this.livesIcons = [];
        
        // Texto de vidas
        this.add.text(20, 20, 'Vidas:', {
            fontSize: '18px',
            color: '#ffffff'
        });
        
        // Criar ícones de vida
        for (let i = 0; i < this.lives; i++) {
            const lifeIcon = this.add.circle(90 + i * 25, 30, 10, 0x00ffff);
            this.livesIcons.push(lifeIcon);
        }
    }

    createPauseButton() {
        // Container para o botão de pausa
        this.pauseButton = this.add.container(30, 570);
        
        // Fundo do botão
        const pauseBg = this.add.circle(0, 0, 15, 0x000000);
        pauseBg.setStrokeStyle(2, 0xffffff);
        pauseBg.setInteractive();
        
        // Símbolos de pausa
        const pauseSymbol1 = this.add.rectangle(-4, 0, 3, 10, 0xffffff);
        const pauseSymbol2 = this.add.rectangle(4, 0, 3, 10, 0xffffff);
        
        // Adicionar ao container
        this.pauseButton.add([pauseBg, pauseSymbol1, pauseSymbol2]);
        
        // Evento de clique
        pauseBg.on('pointerdown', () => {
            this.togglePause();
        });
    }

    createPauseMenu() {
        // Container para o menu de pausa
        this.pauseMenu = this.add.container(400, 300);
        this.pauseMenu.setVisible(false);
        
        // Background semi-transparente
        const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.7);
        
        // Título do menu
        const title = this.add.text(0, -100, 'PAUSADO', {
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Botões do menu
        const resumeButton = this.createMenuButton(0, -20, 'CONTINUAR', () => {
            this.togglePause();
        });
        
        const restartButton = this.createMenuButton(0, 40, 'REINICIAR', () => {
            this.scene.restart({ levelData: this.levelData });
        });
        
        const mapButton = this.createMenuButton(0, 100, 'VOLTAR AO MAPA', () => {
            this.returnToMap();
        });
        
        // Adicionar ao container
        this.pauseMenu.add([bg, title, resumeButton, mapButton, restartButton]);
    }

    createMenuButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
        // Container para o botão
        const button = this.add.container(x, y);
        
        // Fundo do botão
        const buttonBg = this.add.rectangle(0, 0, 200, 40, 0x000000);
        buttonBg.setStrokeStyle(2, 0x00ffff);
        buttonBg.setInteractive();
        
        // Texto do botão
        const buttonText = this.add.text(0, 0, text, {
            fontSize: '20px',
            color: '#00ffff'
        }).setOrigin(0.5);
        
        // Adicionar ao container
        button.add([buttonBg, buttonText]);
        
        // Eventos
        buttonBg.on('pointerover', () => {
            buttonBg.setStrokeStyle(3, 0x88ffff);
            buttonText.setScale(1.1);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setStrokeStyle(2, 0x00ffff);
            buttonText.setScale(1);
        });
        
        buttonBg.on('pointerdown', () => {
            callback();
        });
        
        return button;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Pausar o jogo
            this.physics.pause();
            
            // Pausar a música
            if (this.musicStarted) {
                this.audioManager.pause();
            }
            
            this.pauseMenu.setVisible(true);
        } else {
            // Continuar o jogo
            this.physics.resume();
            
            // Retomar a música
            if (this.musicStarted && !this.gameOver) {
                this.audioManager.resume();
            }
            
            this.pauseMenu.setVisible(false);
        }
    }

    returnToMap() {
        // Parar a música
        if (this.musicStarted) {
            this.audioManager.stop();
        }
        
        // Efeito de transição
        this.cameras.main.fade(500, 0, 0, 0);
        
        // Retornar ao mapa
        this.time.delayedCall(500, () => {
            this.scene.start('MapScene');
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
        
        // Adicionar mais padrões baseados na dificuldade
        if (this.levelData) {
            if (this.levelData.difficulty === 'Médio' || this.levelData.difficulty === 'Difícil' || this.levelData.difficulty === 'Extremo') {
                // Padrão 5: Onda
                this.obstaclePatterns.push((x, y) => {
                    for (let i = 0; i < 10; i++) {
                        this.createObstacle(
                            x + i * 40,
                            y + Math.sin(i * 0.5) * 100,
                            20, 20
                        );
                    }
                });
            }
            
            if (this.levelData.difficulty === 'Difícil' || this.levelData.difficulty === 'Extremo') {
                // Padrão 6: Grade
                this.obstaclePatterns.push((x, y) => {
                    for (let i = 0; i < 4; i++) {
                        for (let j = 0; j < 4; j++) {
                            // Deixar alguns espaços vazios para o jogador passar
                            if (!(i === 1 && j === 1) && !(i === 2 && j === 2)) {
                                this.createObstacle(
                                    x + i * 60, 
                                    y - 100 + j * 60,
                                    20, 20
                                );
                            }
                        }
                    }
                });
            }
            
            if (this.levelData.difficulty === 'Extremo') {
                // Padrão 7: Parede com apenas uma abertura
                this.obstaclePatterns.push((x, y) => {
                    const gap = Phaser.Math.Between(1, 6);
                    for (let i = 0; i < 8; i++) {
                        if (i !== gap) {
                            this.createObstacle(
                                x, 
                                y - 200 + i * 50,
                                30, 30
                            );
                        }
                    }
                });
            }
        }
    }

    spawnRandomPattern() {
        // Só gerar obstáculos se a música estiver tocando e o jogo não estiver pausado
        if (this.musicStarted && !this.isPaused && !this.gameOver) {
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
        // Ignorar colisões se o jogo já acabou
        if (this.gameOver) return;
        
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
        
        // Diminuir vidas
        this.lives--;
        
        // Atualizar ícones de vida
        if (this.lives >= 0 && this.livesIcons.length > this.lives) {
            const iconToRemove = this.livesIcons.pop();
            if (iconToRemove) {
                // Efeito de explosão no ícone
                this.add.particles(iconToRemove.x, iconToRemove.y, 'flares', {
                    frame: 'blue',
                    speed: { min: -100, max: 100 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    quantity: 10,
                    tint: 0x00ffff
                });
                
                iconToRemove.destroy();
            }
        }
        
        // Verificar game over
        if (this.lives <= 0) {
            this.gameOver = true;
            this.showGameOver();
        } else {
            // Efeito de shake na câmera
            this.cameras.main.shake(200, 0.01);
        }
    }

    showGameOver() {
        // Game over já está sendo mostrado
        if (this.gameOver) return;
        
        this.gameOver = true;
        
        // Parar a música
        if (this.musicStarted) {
            this.audioManager.pause();
        }
        
        // Efeito de flash
        this.cameras.main.flash(1000, 255, 0, 0);
        
        // Criar tela de game over
        const gameOverContainer = this.add.container(400, 300);
        
        // Background semi-transparente
        const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.8);
        bg.setStrokeStyle(3, 0xff0000);
        
        // Texto de game over
        const gameOverText = this.add.text(0, -100, 'GAME OVER', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ff0000'
        }).setOrigin(0.5);
        
        // Pontuação final
        const finalScoreText = this.add.text(0, -30, `Pontuação: ${this.score}`, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Botões
        const restartButton = this.createMenuButton(0, 30, 'TENTAR NOVAMENTE', () => {
            this.scene.restart({ levelData: this.levelData });
        });
        
        const mapButton = this.createMenuButton(0, 90, 'VOLTAR AO MAPA', () => {
            this.returnToMap();
        });
        
        // Adicionar ao container
        gameOverContainer.add([bg, gameOverText, finalScoreText, restartButton, mapButton]);
        
        // Efeito de aparecimento
        gameOverContainer.setScale(0.5);
        gameOverContainer.setAlpha(0);
        
        this.tweens.add({
            targets: gameOverContainer,
            scale: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.out'
        });
    }

    updateScore(points: number) {
        this.score += points;
        this.scoreText.setText(`Pontos: ${this.score}`);
    }

    update() {
        if (this.isPaused || this.gameOver) return;
        
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

    playMusic() {
        if (!this.musicStarted && !this.gameOver) {
            console.log('Tentando iniciar música...');
            
            try {
                this.audioManager.play();
                this.musicStarted = true;
                this.statusText.setText('Status: Música tocando');

                // Iniciar geração de obstáculos
                this.time.addEvent({
                    delay: this.beatTime,
                    callback: this.spawnRandomPattern,
                    callbackScope: this,
                    loop: true
                });
            } catch (error: any) {
                console.error('Erro ao iniciar música:', error);
                const errorMessage = error.message || 'Erro desconhecido';
                this.statusText.setText('Status: Erro ao iniciar música - ' + errorMessage);
            }
        }
    }

    // Novo método para criar botão de controle de música
    createMusicButton() {
        // Criar container para o botão
        const musicButton = this.add.container(100, 30);
        
        // Fundo do botão
        const buttonBg = this.add.rectangle(0, 0, 40, 40, 0x000000, 0.6);
        buttonBg.setStrokeStyle(2, 0x00ffff);
        
        // Ícone de música (nota musical)
        const icon = this.add.text(0, 0, '♪', {
            fontSize: '24px',
            color: '#00ffff'
        });
        icon.setOrigin(0.5);
        
        // Adicionar elementos ao container
        musicButton.add([buttonBg, icon]);
        
        // Tornar o botão interativo
        buttonBg.setInteractive();
        
        // Evento de clique
        buttonBg.on('pointerdown', () => {
            if (this.musicStarted) {
                // Se a música já está tocando, pausar/retomar
                if (this.audioManager.getIsPlaying()) {
                    this.audioManager.pause();
                    icon.setText('♪̸'); // Nota musical com um traço
                    this.statusText.setText('Status: Música pausada');
                } else {
                    this.audioManager.resume();
                    icon.setText('♪');
                    this.statusText.setText('Status: Música tocando');
                }
            } else {
                // Se a música ainda não começou, iniciar
                this.playMusic();
                icon.setText('♪');
            }
        });
        
        // Efeitos de hover
        buttonBg.on('pointerover', () => {
            buttonBg.setStrokeStyle(3, 0x00ffff);
            icon.setScale(1.1);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setStrokeStyle(2, 0x00ffff);
            icon.setScale(1);
        });
    }
}

// Nova cena de seleção de níveis (mapa)
class MapScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Arc;
    private path: Phaser.Curves.Path | null = null;
    private levelPoints: Phaser.GameObjects.Container[] = [];
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private backgroundGraphics!: Phaser.GameObjects.Graphics;
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private currentPathPosition: number = 0;
    private playerTween: Phaser.Tweens.Tween | null = null;
    private levelData: MusicInfo[] = musicList;
    private infoPanel!: Phaser.GameObjects.Container;
    private mapContainer!: Phaser.GameObjects.Container;
    private mapBounds = { x: 100, y: 100, width: 600, height: 340 };
    private decorativeParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private moveToPointEnabled: boolean = true;

    constructor() {
        super({ key: 'MapScene' });
    }

    preload() {
        // Carregar assets para a cena do mapa
        this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
    }

    create() {
        // Criar container para todos os elementos do mapa
        this.mapContainer = this.add.container(0, 0);
        
        // Adicionar efeitos de fundo
        this.createBackground();
        
        // Adicionar título
        const title = this.add.text(400, 50, 'SELECIONE UMA FASE', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Adicionar efeito de brilho ao título
        this.add.particles(400, 50, 'flares', {
            frame: 'blue',
            speed: { min: 10, max: 30 },
            scale: { start: 0.05, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            quantity: 1,
            frequency: 500
        });
        
        // Criar grid de fundo e efeitos visuais
        this.createBackgroundEffects();

        // Criar o caminho pontilhado
        this.createPath();
        
        // Criar os pontos de nível ao longo do caminho
        this.createLevelPoints();
        
        // Criar o personagem que vai percorrer o caminho
        this.player = this.add.circle(this.getLevelX(0), this.getLevelY(0), 15, 0x00ffff);
        
        // Adicionar rastro de partículas ao jogador
        this.add.particles(0, 0, 'flares', {
            frame: 'blue',
            speed: 50,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 200,
            tint: 0x00ffff,
            quantity: 3,
            follow: this.player
        });
        
        // Adicionar glow ao redor do jogador
        const playerGlow = this.add.circle(this.getLevelX(0), this.getLevelY(0), 20, 0x00ffff, 0.3);
        this.tweens.add({
            targets: playerGlow,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Fazer o glow seguir o jogador
        this.time.addEvent({
            delay: 16,
            callback: () => {
                playerGlow.setPosition(this.player.x, this.player.y);
            },
            loop: true
        });

        // Botão para voltar ao nível anterior
        const prevButton = this.add.rectangle(100, 550, 120, 40, 0x000000);
        prevButton.setStrokeStyle(2, 0x4488ff);
        prevButton.setInteractive();
        
        const prevText = this.add.text(100, 550, '< Anterior', {
            fontSize: '18px',
            color: '#4488ff'
        }).setOrigin(0.5);
        
        prevButton.on('pointerdown', () => {
            this.movePlayerToPreviousLevel();
        });

        prevButton.on('pointerover', () => {
            prevButton.setStrokeStyle(3, 0x88ccff);
            prevText.setScale(1.1);
        });
        
        prevButton.on('pointerout', () => {
            prevButton.setStrokeStyle(2, 0x4488ff);
            prevText.setScale(1);
        });

        // Botão para avançar ao próximo nível
        const nextButton = this.add.rectangle(700, 550, 120, 40, 0x000000);
        nextButton.setStrokeStyle(2, 0x4488ff);
        nextButton.setInteractive();
        
        const nextText = this.add.text(700, 550, 'Próximo >', {
            fontSize: '18px',
            color: '#4488ff'
        }).setOrigin(0.5);
        
        nextButton.on('pointerdown', () => {
            this.movePlayerToNextLevel();
        });

        nextButton.on('pointerover', () => {
            nextButton.setStrokeStyle(3, 0x88ccff);
            nextText.setScale(1.1);
        });
        
        nextButton.on('pointerout', () => {
            nextButton.setStrokeStyle(2, 0x4488ff);
            nextText.setScale(1);
        });
        
        // Botão para voltar ao menu
        const menuButton = this.add.rectangle(400, 550, 120, 40, 0x000000);
        menuButton.setStrokeStyle(2, 0x00ffff);
        menuButton.setInteractive();
        
        const menuText = this.add.text(400, 550, 'Menu', {
            fontSize: '18px',
            color: '#00ffff'
        }).setOrigin(0.5);
        
        menuButton.on('pointerdown', () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('MenuScene');
            });
        });
        
        menuButton.on('pointerover', () => {
            menuButton.setStrokeStyle(3, 0x88ffff);
            menuText.setScale(1.1);
        });
        
        menuButton.on('pointerout', () => {
            menuButton.setStrokeStyle(2, 0x00ffff);
            menuText.setScale(1);
        });

        // Criar painel de informações
        this.createInfoPanel();
        
        // Inicializar com o primeiro nível
        this.updateInfoPanel(0);
        this.highlightCurrentLevel();
        
        // Adicionar entrada de clique para mover o jogador diretamente para um ponto
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Verificar se o clique está dentro da área do mapa
            if (this.isPointInsideMapBounds(pointer.x, pointer.y) && this.moveToPointEnabled) {
                // Encontrar o nível mais próximo do clique
                const closestLevelIndex = this.findClosestLevelIndex(pointer.x, pointer.y);
                if (closestLevelIndex !== -1) {
                    this.movePlayerToLevel(closestLevelIndex);
                }
            }
        });
        
        // Efeito de entrada
        this.cameras.main.fadeIn(500);
    }
    
    createBackground() {
        // Fundo estilizado com grid e efeitos
        this.backgroundGraphics = this.add.graphics();
        
        // Adicionar retângulo de fundo para a área do mapa
        this.backgroundGraphics.fillStyle(0x000022, 0.3);
        this.backgroundGraphics.fillRect(
            this.mapBounds.x - 10, 
            this.mapBounds.y - 10, 
            this.mapBounds.width + 20, 
            this.mapBounds.height + 20
        );
        
        // Borda do mapa
        this.backgroundGraphics.lineStyle(2, 0x4488ff, 0.5);
        this.backgroundGraphics.strokeRect(
            this.mapBounds.x - 10, 
            this.mapBounds.y - 10, 
            this.mapBounds.width + 20, 
            this.mapBounds.height + 20
        );
    }
    
    createBackgroundEffects() {
        // Grid de fundo
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x4488ff, 0.1);
        
        // Linhas horizontais
        for (let y = this.mapBounds.y; y <= this.mapBounds.y + this.mapBounds.height; y += 20) {
            this.gridGraphics.lineBetween(
                this.mapBounds.x, 
                y, 
                this.mapBounds.x + this.mapBounds.width, 
                y
            );
        }
        
        // Linhas verticais
        for (let x = this.mapBounds.x; x <= this.mapBounds.x + this.mapBounds.width; x += 20) {
            this.gridGraphics.lineBetween(
                x, 
                this.mapBounds.y, 
                x, 
                this.mapBounds.y + this.mapBounds.height
            );
        }
        
        // Partículas decorativas aleatórias
        this.decorativeParticles = this.add.particles(0, 0, 'flares', {
            frame: 'blue',
            x: { min: this.mapBounds.x, max: this.mapBounds.x + this.mapBounds.width },
            y: { min: this.mapBounds.y, max: this.mapBounds.y + this.mapBounds.height },
            speed: { min: 5, max: 15 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.05, end: 0 },
            blendMode: 'ADD',
            lifespan: 3000,
            quantity: 1,
            frequency: 500
        });
    }

    createPath() {
        // Criar um objeto de gráficos para desenhar o caminho
        this.pathGraphics = this.add.graphics();
        
        // Estilo do caminho principal
        this.pathGraphics.lineStyle(3, 0x4488ff, 0.8);
        
        // Pontos de nível ordenados
        const levelPoints = [];
        for (let i = 0; i < this.levelData.length; i++) {
            levelPoints.push({
                x: this.getLevelX(i),
                y: this.getLevelY(i)
            });
        }
        
        // Criar o objeto Path começando do primeiro ponto
        this.path = new Phaser.Curves.Path(levelPoints[0].x, levelPoints[0].y);
        
        // Adicionar linhas retas entre os pontos
        for (let i = 1; i < levelPoints.length; i++) {
            this.path.lineTo(levelPoints[i].x, levelPoints[i].y);
        }
        
        // Desenhar o caminho
        this.path.draw(this.pathGraphics);
        
        // Adicionar efeito de brilho ao caminho
        const pathGlow = this.add.graphics();
        pathGlow.lineStyle(6, 0x4488ff, 0.2);
        this.path.draw(pathGlow);
        
        // Desenhar pontos ao longo do caminho
        this.pathGraphics.fillStyle(0x88ccff, 1);
        const points = this.path.getPoints(100);
        points.forEach((point, index) => {
            // Pular alguns pontos para criar efeito pontilhado
            if (index % 4 === 0) {
                this.pathGraphics.fillCircle(point.x, point.y, 2);
            }
        });
        
        // Animação de pulso para os pontos do caminho
        this.tweens.add({
            targets: this.pathGraphics,
            alpha: 0.6,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }

    createLevelPoints() {
        // Criar pontos de nível ao longo do caminho
        this.levelData.forEach((levelInfo, index) => {
            // Criar um container para o ponto de nível
            const levelPoint = this.add.container(this.getLevelX(index), this.getLevelY(index));
            
            // Círculo de fundo exterior (decorativo)
            const outerCircle = this.add.circle(0, 0, 30, 0x4488ff, 0.2);
            
            // Círculo de fundo
            const circle = this.add.circle(0, 0, 25, 0x000000, 0.8);
            circle.setStrokeStyle(3, 0x4488ff);
            
            // Texto do nível
            const levelText = this.add.text(0, 0, levelInfo.level.toString(), {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Adicionar ao container
            levelPoint.add([outerCircle, circle, levelText]);
            
            // Adicionar animação pulsante ao círculo exterior
            this.tweens.add({
                targets: outerCircle,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.1,
                duration: 1500,
                yoyo: true,
                repeat: -1
            });
            
            // Tornar interativo
            circle.setInteractive(
                new Phaser.Geom.Circle(0, 0, 25),
                Phaser.Geom.Circle.Contains
            );
            
            // Evento de clique
            circle.on('pointerdown', () => {
                this.selectLevel(index);
            });
            
            // Evento de hover
            circle.on('pointerover', () => {
                circle.setStrokeStyle(4, 0x88ccff);
                levelText.setScale(1.2);
                
                // Mostrar o nome da fase
                const titleBg = this.add.rectangle(0, -45, levelInfo.title.length * 10 + 20, 30, 0x000000, 0.7);
                titleBg.setStrokeStyle(1, 0x4488ff);
                
                const titleText = this.add.text(0, -45, levelInfo.title, {
                    fontSize: '16px',
                    color: '#ffffff'
                }).setOrigin(0.5);
                
                levelPoint.add([titleBg, titleText]);
                
                // Guardar referências para remover depois
                levelPoint.setData('titleBg', titleBg);
                levelPoint.setData('titleText', titleText);
                
                // Atualizar o painel de informações
                this.updateInfoPanel(index);
                
                // Adicionar efeito de destaque temporário
                const highlightFlash = this.add.circle(0, 0, 35, 0x88ccff, 0.5);
                levelPoint.add(highlightFlash);
                
                this.tweens.add({
                    targets: highlightFlash,
                    alpha: 0,
                    scale: 1.5,
                    duration: 500,
                    onComplete: () => {
                        highlightFlash.destroy();
                    }
                });
            });
            
            circle.on('pointerout', () => {
                circle.setStrokeStyle(3, 0x4488ff);
                levelText.setScale(1);
                
                // Remover título ao sair
                const titleBg = levelPoint.getData('titleBg');
                const titleText = levelPoint.getData('titleText');
                
                if (titleBg) titleBg.destroy();
                if (titleText) titleText.destroy();
            });
            
            // Adicionar à lista de pontos
            this.levelPoints.push(levelPoint);
        });
    }

    createInfoPanel() {
        // Criar container para o painel
        this.infoPanel = this.add.container(400, 420);
        
        // Background do painel
        const bg = this.add.rectangle(0, 0, 500, 160, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x4488ff);
        
        // Adicionar efeito de brilho pulsante à borda
        const glowEffect = this.add.rectangle(0, 0, 500, 160, 0x000000, 0);
        glowEffect.setStrokeStyle(5, 0x4488ff, 0.3);
        
        this.tweens.add({
            targets: glowEffect,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
        
        // Adicionar ao container
        this.infoPanel.add([bg, glowEffect]);
    }

    updateInfoPanel(levelIndex: number) {
        // Limpar informações anteriores
        while (this.infoPanel.length > 2) {
            const item = this.infoPanel.getAt(2);
            if (item) item.destroy();
            this.infoPanel.remove(item);
        }
        
        // Obter informações do nível
        const levelInfo = this.levelData[levelIndex];
        
        // Título da música
        const songTitle = this.add.text(-220, -60, `${levelInfo.songTitle}`, {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        });
        
        // Artista
        const artist = this.add.text(-220, -30, `Artista: ${levelInfo.artist}`, {
            fontSize: '16px',
            color: '#aaaaaa'
        });
        
        // Dificuldade
        const difficultyColor = {
            'Fácil': '#00ff00',
            'Médio': '#ffff00',
            'Difícil': '#ff9900',
            'Extremo': '#ff0000'
        }[levelInfo.difficulty];
        
        const difficulty = this.add.text(220, -60, `${levelInfo.difficulty}`, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: difficultyColor
        }).setOrigin(1, 0);
        
        // Descrição
        const description = this.add.text(-220, 10, levelInfo.description, {
            fontSize: '16px',
            color: '#ffffff',
            wordWrap: { width: 440 }
        });
        
        // Botão de jogar
        const playButton = this.add.rectangle(0, 60, 150, 40, 0x000000);
        playButton.setStrokeStyle(2, 0x00ffff);
        playButton.setInteractive();
        
        const playText = this.add.text(0, 60, 'JOGAR', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#00ffff'
        }).setOrigin(0.5);
        
        // Adicionar efeito de brilho ao botão
        const playButtonGlow = this.add.rectangle(0, 60, 150, 40, 0x000000, 0);
        playButtonGlow.setStrokeStyle(6, 0x00ffff, 0.3);
        
        this.tweens.add({
            targets: playButtonGlow,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Evento de hover
        playButton.on('pointerover', () => {
            playButton.setStrokeStyle(3, 0x88ffff);
            playText.setScale(1.1);
            
            // Efeito de partículas no botão
            const particles = this.add.particles(0, 60, 'flares', {
                frame: 'blue',
                speed: 50,
                scale: { start: 0.1, end: 0 },
                blendMode: 'ADD',
                lifespan: 300,
                quantity: 1,
                frequency: 50
            });
            
            this.time.delayedCall(300, () => {
                particles.destroy();
            });
        });
        
        playButton.on('pointerout', () => {
            playButton.setStrokeStyle(2, 0x00ffff);
            playText.setScale(1);
        });
        
        // Evento de clique
        playButton.on('pointerdown', () => {
            this.selectLevel(levelIndex);
        });
        
        // Adicionar ao container
        this.infoPanel.add([songTitle, artist, difficulty, description, playButton, playText, playButtonGlow]);
    }

    // Métodos auxiliares para obter coordenadas dos níveis
    getLevelX(index: number): number {
        // Posições fixas para cada nível para garantir posicionamento correto
        const positions = [
            this.mapBounds.x + 120,                    // Nível 1 (esquerda)
            this.mapBounds.x + this.mapBounds.width / 2 - 100, // Nível 2 (centro-esquerda)
            this.mapBounds.x + this.mapBounds.width / 2 + 30,  // Nível 3 (centro)
            this.mapBounds.x + this.mapBounds.width - 220,     // Nível 4 (centro-direita)
            this.mapBounds.x + this.mapBounds.width - 100      // Nível 5 (direita)
        ];
        
        // Retornar a posição para o índice, ou a última posição se o índice for inválido
        return positions[index] || positions[positions.length - 1];
    }
    
    getLevelY(index: number): number {
        // Posições fixas para cada nível para garantir posicionamento correto
        const positions = [
            this.mapBounds.y + this.mapBounds.height / 2,      // Nível 1 (centro)
            this.mapBounds.y + this.mapBounds.height - 120,    // Nível 2 (abaixo)
            this.mapBounds.y + this.mapBounds.height / 2 - 20, // Nível 3 (centro)
            this.mapBounds.y + 120,                           // Nível 4 (acima)
            this.mapBounds.y + this.mapBounds.height / 2 + 30  // Nível 5 (centro)
        ];
        
        // Retornar a posição para o índice, ou a última posição se o índice for inválido
        return positions[index] || positions[positions.length - 1];
    }
    
    isPointInsideMapBounds(x: number, y: number): boolean {
        return (
            x >= this.mapBounds.x &&
            x <= this.mapBounds.x + this.mapBounds.width &&
            y >= this.mapBounds.y &&
            y <= this.mapBounds.y + this.mapBounds.height
        );
    }
    
    findClosestLevelIndex(x: number, y: number): number {
        let closestDistance = Number.MAX_VALUE;
        let closestIndex = -1;
        
        this.levelData.forEach((_, index) => {
            const levelX = this.getLevelX(index);
            const levelY = this.getLevelY(index);
            
            const distance = Phaser.Math.Distance.Between(x, y, levelX, levelY);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        
        // Somente considerar se estiver a uma distância razoável
        return closestDistance < 100 ? closestIndex : -1;
    }

    movePlayerToLevel(levelIndex: number) {
        // Cancelar qualquer tween anterior
        if (this.playerTween) {
            this.playerTween.stop();
        }
        
        if (!this.path) return;
        
        const targetX = this.getLevelX(levelIndex);
        const targetY = this.getLevelY(levelIndex);
        
        // Armazenar a posição atual
        const currentPosition = this.currentPathPosition;
        this.currentPathPosition = levelIndex;
        
        // Desabilitar a movimentação durante a animação
        this.moveToPointEnabled = false;
        
        // Adicionar efeito de flash no ponto de destino
        const flash = this.add.circle(targetX, targetY, 40, 0x00ffff, 0.7);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 500,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Usar um único tween para mover o personagem diretamente para o destino
        this.playerTween = this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Destacar o nível atual
                this.highlightCurrentLevel();
                
                // Reabilitar a movimentação
                this.moveToPointEnabled = true;
                
                // Efeito de chegada
                this.add.particles(targetX, targetY, 'flares', {
                    frame: 'blue',
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 400,
                    quantity: 15
                }).explode();
            }
        });
        
        // Atualizar o painel de informações
        this.updateInfoPanel(levelIndex);
    }

    movePlayerToNextLevel() {
        const nextLevel = Math.min(this.currentPathPosition + 1, this.levelData.length - 1);
        if (nextLevel !== this.currentPathPosition) {
            this.movePlayerToLevel(nextLevel);
        }
    }

    movePlayerToPreviousLevel() {
        const prevLevel = Math.max(this.currentPathPosition - 1, 0);
        if (prevLevel !== this.currentPathPosition) {
            this.movePlayerToLevel(prevLevel);
        }
    }

    highlightCurrentLevel() {
        // Destacar o nível atual
        this.levelPoints.forEach((point, index) => {
            const circle = point.getAt(1) as Phaser.GameObjects.Shape;
            const levelText = point.getAt(2) as Phaser.GameObjects.Text;
            
            if (index === this.currentPathPosition) {
                // Destacar o nível atual
                circle.setStrokeStyle(4, 0xffcc00);
                levelText.setColor('#ffcc00');
                
                // Adicionar efeito de destaque
                if (!point.getData('isHighlighted')) {
                    point.setData('isHighlighted', true);
                    
                    // Adicionar efeito de pulsação
                    this.tweens.add({
                        targets: circle,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        duration: 500,
                        yoyo: true,
                        repeat: -1
                    });
                }
            } else {
                // Remover destaque dos outros níveis
                circle.setStrokeStyle(3, 0x4488ff);
                levelText.setColor('#ffffff');
                
                // Remover efeitos de pulsação
                if (point.getData('isHighlighted')) {
                    point.setData('isHighlighted', false);
                    this.tweens.killTweensOf(circle);
                    circle.setScale(1);
                }
            }
        });
    }

    selectLevel(levelIndex: number) {
        // Primeiro, move o jogador para o nível selecionado se não estiver lá
        if (this.currentPathPosition !== levelIndex) {
            this.movePlayerToLevel(levelIndex);
            
            // Esperar o movimento completar antes de iniciar a fase
            this.time.delayedCall(600, () => {
                this.startLevel(levelIndex);
            });
        } else {
            // Se já estiver no nível, iniciar imediatamente
            this.startLevel(levelIndex);
        }
    }
    
    startLevel(levelIndex: number) {
        // Efeito de flash antes de iniciar a fase
        this.cameras.main.flash(500, 0, 0, 0);
        
        // Iniciar a fase do jogo com os dados do nível
        this.time.delayedCall(500, () => {
            this.scene.start('GameScene', { levelData: this.levelData[levelIndex] });
        });
    }
}

// Cena de menu inicial
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Carregar assets para o menu
        this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
    }

    create() {
        // Título do jogo
        const title = this.add.text(400, 150, 'FORMAS & RITMOS', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Efeito de brilho no título
        this.add.particles(400, 150, 'flares', {
            frame: 'white',
            speed: 20,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            quantity: 1,
            frequency: 100
        });
        
        // Botão de iniciar
        const startButton = this.add.rectangle(400, 300, 200, 50, 0x000000);
        startButton.setStrokeStyle(2, 0x00ffff);
        startButton.setInteractive();
        
        const startText = this.add.text(400, 300, 'INICIAR', {
            fontSize: '24px',
            color: '#00ffff'
        }).setOrigin(0.5);
        
        // Efeito de hover
        startButton.on('pointerover', () => {
            startButton.setStrokeStyle(3, 0x88ffff);
            startText.setScale(1.1);
        });
        
        startButton.on('pointerout', () => {
            startButton.setStrokeStyle(2, 0x00ffff);
            startText.setScale(1);
        });
        
        // Evento de clique
        startButton.on('pointerdown', () => {
            // Efeito de flash
            this.cameras.main.flash(500, 0, 0, 0);
            
            // Iniciar o mapa de níveis
            this.time.delayedCall(500, () => {
                this.scene.start('MapScene');
            });
        });
        
        // Créditos
        this.add.text(400, 500, 'Inspirado no Jogo Favorito de Miguel Pavanetti', {
            fontSize: '16px',
            color: '#888888'
        }).setOrigin(0.5);
    }
}

// Configuração do jogo
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
    scene: [MenuScene, MapScene, GameScene]
};

new Phaser.Game(config); 