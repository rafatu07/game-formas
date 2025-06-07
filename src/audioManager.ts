/**
 * Gerenciador de áudio para Phaser com Parcel
 * 
 * Esta classe lida com a inicialização e reprodução de áudio,
 * gerenciando as restrições dos navegadores modernos.
 */

import { Scene } from 'phaser';

// Importação do arquivo de áudio
// @ts-ignore - Ignora erro de tipagem do TypeScript
import musicFile from './assets/musica.mp3';

export class AudioManager {
    private scene: Scene;
    private music: Phaser.Sound.BaseSound | null = null;
    private isReady: boolean = false;
    private isPlaying: boolean = false;
    private autoplayAttempted: boolean = false;
    private volume: number = 0.5;
    private key: string = 'backgroundMusic';

    constructor(scene: Scene) {
        this.scene = scene;
        this.preloadAudio();
    }

    preloadAudio(): void {
        try {
            console.log('Carregando áudio:', musicFile);
            this.scene.load.audio(this.key, musicFile);

            // Quando o carregamento for concluído
            this.scene.load.once('complete', () => {
                this.initializeAudio();
            });
        } catch (error) {
            console.error('Erro ao carregar áudio:', error);
        }
    }

    initializeAudio(): void {
        if (this.isReady) return;

        try {
            // Verifica se o áudio foi carregado
            if (this.scene.cache.audio.exists(this.key)) {
                // Cria a instância de som
                this.music = this.scene.sound.add(this.key, {
                    volume: this.volume,
                    loop: true
                });

                this.isReady = true;
                console.log('Áudio inicializado com sucesso');

                // Tenta iniciar a reprodução automaticamente
                if (!this.autoplayAttempted) {
                    this.attemptAutoplay();
                }
            } else {
                console.error('Arquivo de áudio não encontrado no cache');
            }
        } catch (error) {
            console.error('Erro ao inicializar áudio:', error);
        }
    }

    attemptAutoplay(): void {
        this.autoplayAttempted = true;

        // Primeiro verifica se o áudio está bloqueado
        if (this.scene.sound.locked) {
            // Configura um listener para quando o áudio for desbloqueado
            this.scene.sound.once('unlocked', () => {
                console.log('Áudio desbloqueado, tentando reproduzir');
                this.play();
            });

            // Tenta desbloquear o áudio
            this.scene.sound.unlock();
        } else {
            // Se não estiver bloqueado, tenta reproduzir diretamente
            this.play();
        }
    }

    play(): void {
        if (!this.isReady || !this.music || this.isPlaying) return;

        try {
            this.music.play();
            this.isPlaying = true;
            console.log('Música iniciada com sucesso');
        } catch (error) {
            console.error('Erro ao reproduzir música:', error);
            
            // Se falhar, tenta novamente após um curto período
            setTimeout(() => {
                if (this.music && !this.isPlaying) {
                    try {
                        this.music.play();
                        this.isPlaying = true;
                    } catch (e) {
                        console.error('Falha na segunda tentativa de reprodução:', e);
                    }
                }
            }, 1000);
        }
    }

    pause(): void {
        if (this.music && this.isPlaying) {
            this.music.pause();
            this.isPlaying = false;
        }
    }

    resume(): void {
        if (this.music && !this.isPlaying) {
            this.music.resume();
            this.isPlaying = true;
        }
    }

    stop(): void {
        if (this.music) {
            this.music.stop();
            this.isPlaying = false;
        }
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.setVolume(this.volume);
        }
    }

    // Método para verificar se a música está tocando
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    // Método para configurar manipuladores de eventos para desbloquear o áudio
    setupUnlockListeners(): void {
        const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
        
        const unlockAudio = () => {
            if (this.scene.sound.locked) {
                this.scene.sound.unlock();
                
                // Após o desbloqueio, remove os eventos
                events.forEach(event => {
                    document.removeEventListener(event, unlockAudio);
                });
                
                // Tenta reproduzir após o desbloqueio
                this.play();
            }
        };
        
        // Adiciona os eventos ao documento
        events.forEach(event => {
            document.addEventListener(event, unlockAudio);
        });
    }
} 