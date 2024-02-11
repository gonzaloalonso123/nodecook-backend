const github = require("./github");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

const defaultPackageJson = (repository_name, username) => ({
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

const writeBackend = async (
  userName,
  repositoryName,
  token,
  collections,
  options
) => {
  await github.cloneRepository(userName, repositoryName, token);
  const repoDirectory = path.join(__dirname, "..", "repos", repositoryName);
  if (options.wipe) {
    await wipeRepositoryData(repoDirectory, userName, repositoryName, token);
  }
  await createFolderEstructure(repoDirectory);
  const appDirectory = path.join(repoDirectory, "app");
  await writeExpressBasicServer(appDirectory, collections, options);
  await initNodeAndAddDependencies(repoDirectory, repositoryName, userName);
  await writeCustomFile(appDirectory);
  await writeRoutes(appDirectory, collections);
  await writeDatabaseConnection(
    path.join(appDirectory, "database"),
    collections,
    repositoryName
  );
  await writeDockerCompose(repoDirectory, repositoryName, options);
  await writeDockerFile(repoDirectory, options);
  await github.pushRepository(userName, repositoryName, token);
};

const writeFile = async (filePath, fileContent) => {
  await fsPromises.writeFile(filePath, fileContent);
};

const writeExpressBasicServer = async (repoDirectory, collections, options) => {
  let fileContent = `const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./database/config/db.js");
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

app.use("/custom", custom);

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

${collections.map((c) => {
  return `\napp.use("/${c.name.toLowerCase()}", ${wordToPascalCase(c.name)});`;
})}

app.listen(${options.port}, () => {\n  console.log("Server is running on port ${
    options.port
  }");\n});\n`;
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
  username
) => {
  const packageJson = defaultPackageJson(repository_name, username);
  const packageJsonPath = path.join(repoDirectory, "package.json");
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
};

const createFolder = async (folderPath) => {
  if (fs.existsSync(folderPath)) return;
  await fsPromises.mkdir(folderPath);
};

const createFolderEstructure = async (repoDirectory) => {
  await createFolder(path.join(repoDirectory, "app"));
  const folders = ["routes", "models", "middleware", "database"];
  for (const folder of folders) {
    const folderPath = path.join(repoDirectory, "app", folder);
    await createFolder(folderPath);
  }
  const databaseFolders = ["config", "models", "daos"];
  for (const folder of databaseFolders) {
    const folderPath = path.join(repoDirectory, "app", "database", folder);
    await createFolder(folderPath);
  }
};

const writeRoutes = async (repoDirectory, collections) => {
  for (const collection of collections) {
    let fileContent =
      'const express = require("express");\nconst router = express.Router();\n';
    fileContent += `const ${
      collection.name
    } = require("../database/daos/${collection.name.toLowerCase()}");\n\n`;
    for (const endpoint of collection.endpoints) {
      fileContent += createEndpoint(endpoint);
    }
    fileContent += `\nmodule.exports = router;`;
    const fileName = `${collection.name.toLowerCase()}.js`;
    const filePath = path.join(repoDirectory, "routes", fileName);
    await writeFile(filePath, fileContent);
  }
};

const createEndpoint = (endpoint) => {
  let fileContent = `\nrouter.${endpoint.method.toLowerCase()}("${
    endpoint.url
  }", async (req, res) => {`;
  fileContent += createEndpointBody(endpoint);
  fileContent += "\n});\n";
  return fileContent;
};

const createEndpointBody = (endpoint) => {
  let body = "\n";
  switch (endpoint.method) {
    case "GET":
      body += createGetBody(endpoint);
      break;
    case "POST":
      body += createPostBody(endpoint);
      break;
    case "PATCH":
      body += createPatchBody(endpoint);
      break;
    case "DELETE":
      body += createDeleteBody(endpoint);
      break;
  }

  body += "\n";
  body += "res.status(200).json(item);";
  return indent(body);
};

const createGetBody = (endpoint) => {
  let body = "";
  switch (endpoint.filterBy) {
    case "all":
      body += `const item = await ${endpoint.collection}.getAll();`;
      break;
    case "id":
      body += `const item = await ${endpoint.collection}.getById(req.params.id);`;
      break;
    case "custom":
      body += `const item = await ${endpoint.collection}.getByCustom(${endpoint.getByCustom},req.params);`;
      break;
  }
  return body;
};

const indent = (body) => {
  return body
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
};

const createPostBody = (endpoint) => {
  let body = `const item = await ${endpoint.collection}.create(req.body);`;
  return body;
};

const createPatchBody = (endpoint) => {
  let body = `const item = await ${endpoint.collection}.update(req.params.id, req.body);`;
  return body;
};

const createDeleteBody = (endpoint) => {
  let body = `const item = await ${endpoint.collection}.del(req.params.id);`;
  return body;
};

const wordToPascalCase = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const writeDatabaseConnection = async (
  repoDirectory,
  collections,
  repositoryName
) => {
  await writeDatabaseSetup(repoDirectory, repositoryName);
  await writeDatabaseModels(repoDirectory, collections);
  await writeDatabaseDaos(repoDirectory, collections);
};

const writeDatabaseSetup = async (repoDirectory, repositoryName) => {
  const fileContent = `const mongoose = require("mongoose");\n
mongoose.connect("mongodb://mongodb:27017/${repositoryName}", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to database");
});\n
module.exports = db;`;

  const fileName = "db.js";
  const filePath = path.join(repoDirectory, "config", fileName);
  await writeFile(filePath, fileContent);
};

const writeDatabaseModels = async (repoDirectory, collections) => {
  for (const collection of collections) {
    if (collection.fields.length > 0) {
      await writeTypedModel(repoDirectory, collection);
    } else {
      await writeUntypedModel(repoDirectory, collection);
    }
  }
};

const writeTypedModel = async (repoDirectory, collection) => {
  const collectionName = wordToPascalCase(collection.name);
  let fileContent = `const mongoose = require("mongoose");\n
const ${collectionName}Schema = new mongoose.Schema(
  ${createSchema(collection)}
);\n
const ${collectionName} = mongoose.model("${collectionName}", ${collectionName}Schema);\n
module.exports = ${collectionName};`;

  const fileName = `${collection.name.toLowerCase()}.js`;
  const filePath = path.join(repoDirectory, "models", fileName);
  await writeFile(filePath, fileContent);
};

const writeUntypedModel = async (repoDirectory, collection) => {
  const collectionName = wordToPascalCase(collection.name);
  let fileContent = `const mongoose = require("mongoose");\n
const ${collectionName}Schema = new mongoose.Schema({ any: {} });\n
const ${collectionName} = mongoose.model("${collectionName}", ${collectionName}Schema);\n
module.exports = ${collectionName};`;

  const fileName = `${collection.name.toLowerCase()}.js`;
  const filePath = path.join(repoDirectory, "models", fileName);
  await writeFile(filePath, fileContent);
};

const createSchema = (collection) => {
  console.log(collection.fields);
  let schema = "{";
  for (const field of collection.fields) {
    schema += `${field.name}: "${field.type}",`;
  }
  schema += "}";
  return indent(schema);
};

const writeDatabaseDaos = async (repoDirectory, collections) => {
  for (const collection of collections) {
    const collectionName = wordToPascalCase(collection.name);
    let fileContent = `const ${collectionName} = require("../models/${collection.name.toLowerCase()}");\n
const getAll = async () => {
  return await ${collectionName}.find();
};\n
const getById = async (id) => {
  return await ${collectionName}.findById(id);
};\n
const create = async (data) => {
  return await ${collectionName}.create(data);
};\n
const update = async (id, data) => {
  return await ${collectionName}.findByIdAndUpdate(id, data, {new: true});
};\n
const del = async (id) => {
  return await ${collectionName}.findByIdAndDelete(id);
};\n
const getByCustom = async (custom, params) => {
  return await ${collectionName}.find(custom);
};\n

module.exports = {
  getAll,
  getById,
  create,
  update,
  del,
  getByCustom,
};`;

    const fileName = `${collection.name.toLowerCase()}.js`;
    const filePath = path.join(repoDirectory, "daos", fileName);
    await writeFile(filePath, fileContent);
  }
};

const writeDockerCompose = async (repoDirectory, repositoryName, options) => {
  const fileContent = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "${options.port + ":" + options.port}"
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://mongodb:27017/${repositoryName}

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
`;
  const fileName = "docker-compose.yml";
  const filePath = path.join(repoDirectory, fileName);
  await writeFile(filePath, fileContent);
};

const writeDockerFile = async (repoDirectory, options) => {
  const fileContent = `
FROM node:latest
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY /app .
EXPOSE ${options.port}
CMD ["node", "index.js"]
  `;
  const fileName = "Dockerfile";
  const filePath = path.join(repoDirectory, fileName);
  await writeFile(filePath, fileContent);
};

const wipeRepositoryData = async (
  repoDirectory,
  userName,
  repositoryName,
  token
) => {
  fsPromises.rm(path.join(repoDirectory, "app"), { recursive: true });
  fsPromises.rm(path.join(repoDirectory, "Dockerfile"));
  fsPromises.rm(path.join(repoDirectory, "docker-compose.yml"));
  fsPromises.rm(path.join(repoDirectory, "package.json"));
  await github.pushRepository(userName, repositoryName, token);
};

module.exports = {
  writeBackend,
};
