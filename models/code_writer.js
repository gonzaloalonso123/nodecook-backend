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
  },
});

const writeBackend = async (userName, repositoryName, token, collections) => {
  await github.cloneRepository(userName, repositoryName, token);
  const repoDirectory = path.join(__dirname, "..", "repos", repositoryName);
  await writeExpressBasicServer(repoDirectory, collections);
  await initNodeAndAddDependencies(repoDirectory, repositoryName, userName);
  await createFolderEstructure(repoDirectory);
  await writeRoutes(repoDirectory, collections);
  await writeModels(repoDirectory, collections);
  await github.pushRepository(userName, repositoryName, token);
};

const writeFile = async (filePath, fileContent) => {
  await fsPromises.writeFile(filePath, fileContent);
};

const writeExpressBasicServer = async (repoDirectory, collections) => {
  let fileContent = `const express = require("express");\nconst app = express();\n
${collections.map((c) => {
  return `const ${wordToPascalCase(
    c.name
  )} = require("./routes/${c.name.toLowerCase()}");\n`;
})}
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


${collections.map((c) => {
  return `app.use("/${c.name.toLowerCase()}", ${wordToPascalCase(c.name)});\n`;
})}

app.listen(3000, () => {\n  console.log("Server is running on port 3000");\n});\n`;
  const fileName = "index.js";
  const filePath = path.join(repoDirectory, fileName);
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
  const folders = ["routes", "models", "middleware"];
  for (const folder of folders) {
    const folderPath = path.join(repoDirectory, folder);
    await createFolder(folderPath);
  }
};

const writeRoutes = async (repoDirectory, collections) => {
  for (const collection of collections) {
    let fileContent =
      'const express = require("express");\nconst router = express.Router();\n';
    fileContent += `const ${
      collection.name
    } = require("../models/${collection.name.toLowerCase()}");\n\n`;
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
  }", (req, res) => {`;
  fileContent += createEndpointBody(endpoint);
  console.log(createEndpointBody(endpoint));
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
    case "PUT":
      body += createPutBody(endpoint);
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

const createPutBody = (endpoint) => {
  let body = `const item = await ${endpoint.collection}.update(req.params.id,req.body);`;
  return body;
};

const createDeleteBody = (endpoint) => {
  let body = `const item = await ${endpoint.collection}.delete(req.params.id);`;
  return body;
};

const writeModels = async (repoDirectory, collections) => {
  for (const collection of collections) {
    const collectionName = wordToPascalCase(collection.name);
    let fileContent = `const db = require("../db");\n`;
    fileContent += `const ${collectionName} = db.collection("${collectionName}");\n`;
    fileContent += `module.exports = ${collectionName};`;
    const fileName = `${collection.name.toLowerCase()}.js`;
    const filePath = path.join(repoDirectory, "models", fileName);
    await writeFile(filePath, fileContent);
  }
};

const wordToPascalCase = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

module.exports = {
  writeBackend,
};
