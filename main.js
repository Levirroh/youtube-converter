const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const ytdl = require("@distube/ytdl-core");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

// Corrige o path do ffmpeg para rodar fora do asar
const fixedFfmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

// Evento de download de MP3
ipcMain.handle("download-mp3", async (event, videoUrl) => {
  try {
    if (!ytdl.validateURL(videoUrl)) {
      throw new Error("URL inválida!");
    }

    // Escolher diretório e nome do arquivo
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Salvar MP3",
      defaultPath: "musica.mp3",
      filters: [{ name: "Áudio MP3", extensions: ["mp3"] }],
    });

    if (canceled || !filePath) {
      return { success: false, message: "Download cancelado pelo usuário" };
    }

    const tempFile = path.join(app.getPath("temp"), "temp_audio.mp4");

    // Baixa o áudio em .mp4 temporário
    const stream = ytdl(videoUrl, { filter: "audioonly" });
    const writeStream = fs.createWriteStream(tempFile);

    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    // Converte para MP3 com ffmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(fixedFfmpegPath, [
        "-i",
        tempFile,
        "-vn",
        "-ab",
        "192k",
        "-ar",
        "44100",
        "-y",
        filePath,
      ]);

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(tempFile); // remove o arquivo temporário
        if (code === 0) resolve();
        else reject(new Error("Falha ao converter para MP3"));
      });

      ffmpeg.on("error", (err) => reject(err));
    });

    return { success: true, message: "Download concluído com sucesso!" };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

app.whenReady().then(createWindow);
