const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'src', 'assets', 'musica-um.mp3');
const outputFile = path.join(__dirname, 'src', 'assets', 'musica.mp3');

// Configurações de áudio recomendadas para web
const ffmpegCommand = `ffmpeg -i "${inputFile}" -ar 44100 -ac 2 -ab 192k -f mp3 -y "${outputFile}"`;

console.log('Convertendo arquivo de áudio...');
exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
        console.error('Erro ao converter arquivo:', error);
        return;
    }
    
    if (stderr) {
        console.log('Informações do ffmpeg:', stderr);
    }
    
    console.log('Arquivo convertido com sucesso!');
    
    // Criar versão OGG como backup
    const outputFileOgg = path.join(__dirname, 'src', 'assets', 'musica.ogg');
    const ffmpegCommandOgg = `ffmpeg -i "${outputFile}" -c:a libvorbis -q:a 4 -y "${outputFileOgg}"`;
    
    console.log('Criando versão OGG...');
    exec(ffmpegCommandOgg, (error, stdout, stderr) => {
        if (error) {
            console.error('Erro ao criar versão OGG:', error);
            return;
        }
        
        if (stderr) {
            console.log('Informações do ffmpeg (OGG):', stderr);
        }
        
        console.log('Versão OGG criada com sucesso!');
    });
}); 