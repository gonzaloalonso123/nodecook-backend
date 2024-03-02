const github = require("./github");
const path = require("path");
const fs = require("fs");
const { writeRoutes } = require("./routes_writer_module");
const {
  writeMongoDatabaseConnection,
  writeDockerCompose,
  writeDockerFile,
} = require("./mongo_writer_module");
const { wordToPascalCase, writeFile, createFolder } = require("../utils/utils");
const { writeFirebaseDatabaseConnection } = require("./firebase_writer_module");
const fsPromises = require("fs").promises;

const defaultPackageJsonMongo = (repository_name, username) => ({
  name: repository_name,
  version: "1.0.0",
  description: "",
  main: "index.js",
  scripts: {
    test: 'echo "Error: no test specified" && exit 1',
  },
  author: username,
  license: "ISC",
  dependencies: {
    axios: "^1.6.7",
    cors: "^2.8.5",
    express: "^4.18.2",
    nodemon: "^3.0.3",
    uuid: "^9.0.1",
    mongoose: "^8.1.1",
  },
});

const defaultPackageJsonFirebase = (repository_name, username) => ({
  name: repository_name,
  version: "1.0.0",
  description: "",
  main: "index.js",
  scripts: {
    test: 'echo "Error: no test specified" && exit 1',
  },
  author: username,
  license: "ISC",
  dependencies: {
    cors: "^2.8.5",
    express: "^4.18.2",
    "firebase-admin": "^12.0.0",
    firestore: "^1.1.6",
    "firebase-functions": "^4.3.1",
    uuid: "^9.0.1",
    nodemon: "^3.0.3",
  },
});

const writeBackend = async (
  userName,
  repositoryName,
  token,
  collections,
  options,
  applicationUser
) => {
  await github.cloneRepository(userName, repositoryName, token);
  const repoDirectory = path.join(__dirname, "..", "repos", repositoryName);
  if (options.wipe) {
    await wipeRepositoryData(repoDirectory, userName, repositoryName, token);
  }
  console.log(options);
  await createFolderEstructure(repoDirectory, options.database);
  const appDirectory = path.join(repoDirectory, "app");
  await writeExpressBasicServer(appDirectory, collections, options);
  await initNodeAndAddDependencies(
    repoDirectory,
    repositoryName,
    userName,
    options.database
  );
  await writeCustomFile(appDirectory);
  await writeRoutes(appDirectory, collections);
  switch (options.database) {
    case "mongodb":
      await writeMongoDatabaseConnection(
        path.join(appDirectory, "database"),
        collections,
        repositoryName
      );
      await writeDockerCompose(repoDirectory, repositoryName, options);
      await writeDockerFile(repoDirectory, options);
      break;
    case "firebase":
      await writeFirebaseDatabaseConnection(
        path.join(appDirectory, "database"),
        collections,
        options,
        applicationUser || { name: "", email: "" }
      );
      break;
  }

  await github.pushRepository(userName, repositoryName, token);
};

const writeExpressBasicServer = async (repoDirectory, collections, options) => {
  let fileContent = `const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./database/config/db.js");
${
  options.database === "firebase"
    ? `const functions = require("firebase-functions");
const authMiddleware = require("./middleware/authMiddleware");`
    : ""
}
const custom = require("./custom");
${collections
  .map(
    (c) =>
      `const ${wordToPascalCase(
        c.name
      )} = require("./routes/${c.name.toLowerCase()}");`
  )
  .join("\n")}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }
  next();
});
${options.database === "firebase" ? "app.use(authMiddleware);" : ""}

app.use("/custom", custom);

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

${collections
  .map((c) => {
    return `app.use("/${c.name.toLowerCase()}", ${wordToPascalCase(c.name)});`;
  })
  .join("\n")}

${
  options.database === "mongodb"
    ? `app.listen(${options.port}, () => {\n  console.log("Server is running on port ${options.port}");\n});\n`
    : "exports.app = functions.https.onRequest(app);"
}`;

  const fileName = "index.js";
  const filePath = path.join(repoDirectory, fileName);
  await writeFile(filePath, fileContent);
};

const writeCustomFile = async (repoDirectory) => {
  const fileContent =
    'const express = require("express");\nconst router = express.Router();\n\n\n\n\n\n\nmodule.exports = router;';
  const fileName = "custom.js";
  const filePath = path.join(repoDirectory, fileName);
  if (fs.existsSync(filePath)) return;
  await writeFile(filePath, fileContent);
};

const initNodeAndAddDependencies = async (
  repoDirectory,
  repository_name,
  username,
  databaseType
) => {
  const packageJson =
    databaseType === "mongodb"
      ? defaultPackageJsonMongo(repository_name, username)
      : defaultPackageJsonFirebase(repository_name, username);
  const packageJsonPath = path.join(repoDirectory, "package.json");
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
};

const createFolderEstructure = async (repoDirectory, databaseType) => {
  await createFolder(path.join(repoDirectory, "app"));
  const folders = ["routes", "models", "middleware", "database"];
  for (const folder of folders) {
    const folderPath = path.join(repoDirectory, "app", folder);
    await createFolder(folderPath);
  }
  const databaseFolders = ["config", "models", "daos", "middleware"];
  for (const folder of databaseFolders) {
    const folderPath = path.join(repoDirectory, "app", "database", folder);
    await createFolder(folderPath);
  }
  if (databaseType === "firebase") {
    const firebaseFolder = path.join(
      repoDirectory,
      "app",
      "database",
      "service_account"
    );
    await createFolder(firebaseFolder);
  }
};

const wipeRepositoryData = async (
  repoDirectory,
  userName,
  repositoryName,
  token
) => {
  try {
    await fsPromises.rm(path.join(repoDirectory, "app"), { recursive: true });
    await fsPromises.rm(path.join(repoDirectory, "Dockerfile"));
    await fsPromises.rm(path.join(repoDirectory, "docker-compose.yml"));
    await fsPromises.rm(path.join(repoDirectory, "package.json"));
  } catch (error) {
    console.error("Error wiping repository data:", error.message);
  }
  await github.pushRepository(userName, repositoryName, token);
};

module.exports = {
  writeBackend,
};
