const cluster = require("node:cluster");
const Queue = require("./lib/JobQueue");

if (cluster.isPrimary) {
  const jobs = new Queue();
  const coreCount = require("node:os").availableParallelism();

  for (let i = 0; i < coreCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message) => {
    if (message.messageType === "new-resize") {
      const { videoId, width, height } = message.data;
      jobs.enqueue({
        type: "resize",
        videoId,
        width,
        height,
      });
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died ${signal} | ${code}. Restarting...`
    );
    cluster.fork();
  });
} else {
  require("./index");
}
