import chokidar from "chokidar";

const watcher = chokidar.watch("./src/FileSystem/test.txt", {
  ignoreInitial: true,
});

watcher.on("all", (event, path) => {
  console.log(`${event} -> ${path}`);
});

console.log("Watcher running...");

// To run, type "npm run watcher" in terminal
// to stop, enter Ctrl+C into terminal