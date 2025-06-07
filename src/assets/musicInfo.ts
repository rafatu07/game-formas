// Informações das músicas para cada fase
export interface MusicInfo {
    level: number;
    title: string;
    songTitle: string;
    artist: string;
    difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Extremo';
    description: string;
    filePath: string;
    bpm: number;  // Batidas por minuto
}

// Caminho para o arquivo de música (importado em game.ts)
const musicPath = 'musica.mp3';

// Lista de músicas/fases disponíveis
export const musicList: MusicInfo[] = [
    {
        level: 1,
        title: "Primeira Fase",
        songTitle: "Iniciação Rítmica",
        artist: "Compositor Digital",
        difficulty: "Fácil",
        description: "Uma introdução suave ao ritmo. Siga os padrões básicos de obstáculos.",
        filePath: musicPath,
        bpm: 130
    },
    {
        level: 2,
        title: "Desafio Geométrico",
        songTitle: "Formas em Movimento",
        artist: "Compositor Digital",
        difficulty: "Médio",
        description: "Os padrões se tornam mais complexos. Mantenha o foco e siga o ritmo.",
        filePath: musicPath,
        bpm: 130
    },
    {
        level: 3,
        title: "Vórtice de Ritmos",
        songTitle: "Batidas Intensas",
        artist: "Compositor Digital",
        difficulty: "Médio",
        description: "Os obstáculos começam a girar e se mover em padrões complexos.",
        filePath: musicPath,
        bpm: 130
    },
    {
        level: 4,
        title: "Labirinto Sonoro",
        songTitle: "Melodia Quebrada",
        artist: "Compositor Digital",
        difficulty: "Difícil",
        description: "Navegue por corredores estreitos enquanto os obstáculos tentam te bloquear.",
        filePath: musicPath,
        bpm: 130
    },
    {
        level: 5,
        title: "Sinfonia Final",
        songTitle: "Apoteose Geométrica",
        artist: "Compositor Digital",
        difficulty: "Extremo",
        description: "A fase final combina todos os elementos anteriores em uma dança frenética de formas e ritmos.",
        filePath: musicPath,
        bpm: 130
    }
]; 