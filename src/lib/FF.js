const { spawn } = require("node:child_process");

const makeThumbnail = (fullPath, thumbnailPath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      fullPath,
      "-ss",
      "5",
      "-vframes",
      "1",
      thumbnailPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`ffmpeg exited with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      console.log(e);
      reject(err);
    });
  });
};

const getDimensions = (fullPath) => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      fullPath,
    ]);

    let dimensions = "";
    ffprobe.stdout.on("data", (data) => {
      dimensions += data.toString("utf8");
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const [width, height] = dimensions.split(",");
        resolve({
          width: Number(width),
          height: Number(height),
        });
      } else {
        reject(`ffprobe exited with error: ${e}`);
      }
    });
  });
};

const extractAudio = (originalVideoPath, targetAudioPath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      originalVideoPath,
      "-vn",
      "-c:a",
      "copy",
      targetAudioPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`ffmpeg exited with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      console.log(e);
      reject(err);
    });
  });
};

const resize = (originalVideoPath, targetVideoPath, width, height) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      originalVideoPath,
      "-vf",
      `scale=${width}:${height}`,
      "-c:a",
      "copy",
      "-threads",
      "2",
      "-y",
      targetVideoPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`ffmpeg exited with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      console.log(e);
      reject(err);
    });
  });
};

module.exports = {
  makeThumbnail,
  getDimensions,
  extractAudio,
  resize,
};
