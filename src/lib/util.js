const fs = require("node:fs/promises");

const util = {};

util.deleteFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch (e) {
    // do nothing
  }
};

util.deleteFolder = async (path) => {
  try {
    await fs.rm(path, { recursive: true });
  } catch (e) {
    // do nothing
  }
};

module.exports = util;