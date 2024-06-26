const DB = require("../DB");
const FF = require("./FF");
const util = require("./util");

class Queue {
  constructor() {
    this.jobs = [];
    this.currentJob = null;
    DB.update();
    DB.videos.forEach((video) => {
      Object.keys(video.resizes).forEach((key) => {
        if (video.resizes[key].processing === true) {
          const [width, height] = key.split("x");
          this.enqueue({
            type: "resize",
            videoId: video.videoId,
            width,
            height,
          });
        }
      });
    });
  }

  enqueue(job) {
    this.jobs.push(job);
    this.executeNext();
  }

  dequeue() {
    return this.jobs.shift();
  }

  executeNext() {
    if (this.currentJob) return;
    this.currentJob = this.dequeue();
    if (!this.currentJob) return;
    this.execute(this.currentJob);
  }

  async execute(job) {
    if (job.type === "resize") {
      const { videoId, width, height } = job;
      DB.update();
      const video = DB.videos.find((video) => video.videoId === videoId);

      const originalVideoPath = `./storage/${videoId}/original.${video.extension}`;
      const targetVideoPath = `./storage/${videoId}/${width}x${height}.${video.extension}`;

      try {
        await FF.resize(originalVideoPath, targetVideoPath, width, height);
        DB.update();
        const video = DB.videos.find((video) => video.videoId === videoId);
        video.resizes[`${width}x${height}`] = { processing: false };
        DB.save();
        console.log("Done resizing, jobs remaining:", this.jobs.length);
      } catch (e) {
        util.deleteFile(targetVideoPath);
      }
    }
    this.currentJob = null;
    this.executeNext();
  }
}

module.exports = Queue;
