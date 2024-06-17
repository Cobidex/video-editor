const path = require("path");
const crypto = require("node:crypto");
const cluster = require("node:cluster");
const fs = require("node:fs/promises");
const { pipeline } = require("stream/promises");
const util = require("../lib/util");
const FF = require("../lib/FF");
const DB = require("../DB");
const Queue = require("../lib/JobQueue");

const getVideos = (req, res, handleErr) => {
  const videos = DB.videos.filter((video) => {
    return video.userId === req.userId;
  });

  res.status(200).json(videos);
};

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");
  const DB = require("../DB");

  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/original.${extension}`;
    const file = await fs.open(fullPath, "w");
    const stream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;
    await pipeline(req, stream);
    file.close();
    await FF.makeThumbnail(fullPath, thumbnailPath);
    const dimensions = await FF.getDimensions(fullPath);
    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      dimensions,
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });

    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully",
    });
  } catch (e) {
    util.deleteFolder(`./storage/${videoId}`);
    if (e.code !== "ECONNRESET") return handleErr(e);
  }
};

const getVideoAssets = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");
  const type = req.params.get("type");

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({ status: 404, message: "video not found!" });
  }

  let file;
  let mimeType;
  let filename;

  switch (type) {
    case "thumbnail":
      file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
      mimeType = "image/jpeg";
      break;

    case "audio":
      file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
      mimeType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;

    case "resize":
      const dimensions = req.params.get("dimensions");
      file = await fs.open(
        `./storage/${videoId}/${dimensions}.${video.extension}`,
        "r"
      );
      mimeType = "video.mp4";
      filename = `${video.name}-${dimensions}.${video.extension}`;
      break;

    case "original":
      file = await fs.open(
        `./storage/${videoId}/original.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4";
      filename = `${video.name}.${video.extension}`;
      break;
  }

  const stat = await file.stat();

  const fileStream = file.createReadStream();

  if (type !== "thumbnail") {
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", stat.size);
  res.status(200);
  await pipeline(fileStream, res);
  file.close();
};

const extractAudio = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");
  const type = req.params.get("type");

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (video.extractedAudio) {
    return handleErr({
      status: 400,
      message: "the audio has been extracted for this video!",
    });
  }

  try {
    const originalVideoPath = `./storage/${videoId}/original.${video.extension}`;
    const targetAudioPath = `./storage/${videoId}/audio.aac`;
    await FF.extractAudio(originalVideoPath, targetAudioPath);

    video.extractedAudio = true;
    DB.save();

    res.status(200).json({
      status: "success",
      message: "The audio was extracted successfully!",
    });
  } catch (e) {}
};

const resize = async (req, res, handleErr) => {
  const { videoId, width, height } = req.body;

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  video.resizes[`${width}x${height}`] = { processing: true };
  DB.save();

  if (cluster.isPrimary) {
    const jobs = new Queue();

    jobs.enqueue({
      type: "resize",
      videoId,
      width,
      height,
    });
  } else {
    process.send({
      messageType: "new-resize",
      data: {
        videoId,
        width,
        height,
      },
    });
  }

  res.status(200).json({
    status: "success",
    message: "The video is now being processed!",
  });
};

const controller = {
  extractAudio,
  getVideoAssets,
  getVideos,
  uploadVideo,
  resize,
};

module.exports = controller;
