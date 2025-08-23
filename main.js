const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// Configura o caminho do ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// 🔹 IPC: Download de MP3 com escolha de local e nome
ipcMain.handle("download-mp3", async (event, url) => {
  try {
    // Abrir janela para salvar o arquivo
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Salvar MP3",
      defaultPath: "musica.mp3",
      filters: [{ name: "Arquivos de Áudio", extensions: ["mp3"] }],
    });

    if (canceled || !filePath) {
      throw new Error("Download cancelado pelo usuário");
    }

    return new Promise((resolve, reject) => {
      const stream = ytdl(url, { quality: "highestaudio" });

      ffmpeg(stream)
        .audioBitrate(128)
        .save(filePath)
        .on("end", () => resolve(filePath))
        .on("error", (err) => reject(err));
    });
  } catch (err) {
    throw err;
  }
});
