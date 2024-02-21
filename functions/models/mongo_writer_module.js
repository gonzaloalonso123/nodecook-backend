const { wordToPascalCase, writeFile, indent } = require("../utils/utils");
const path = require("path");

const writeMongoDatabaseConnection = async (
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
    schema += `${field.name}: "${field.type}", `;
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
${collection.endpoints
  .filter((e) => e.filterBy === "custom")
  .map((e) => createCustomMethod(e))
  .join("\n")}
  
module.exports = {
  getAll,
  getById,
  create,
  update,
  del,
  ${collection.endpoints
    .filter((e) => e.filterBy === "custom")
    .map((e) => `getBy${wordToPascalCase(e.filterByCustom)}`)
    .join(",\n  ")}
};`;

    const fileName = `${collection.name.toLowerCase()}.js`;
    const filePath = path.join(repoDirectory, "daos", fileName);
    await writeFile(filePath, fileContent);
  }
};

const createCustomMethod = (endpoint) => {
  let body = `const getBy${wordToPascalCase(
    endpoint.filterByCustom
  )} = async (data) => {
    return await ${wordToPascalCase(endpoint.collection)}.findOne({ ${
  endpoint.filterByCustom
}: data }).exec();
};`;
  return body;
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
  const fileContent = `FROM node:latest
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

module.exports = {
  writeMongoDatabaseConnection,
  writeDockerCompose,
  writeDockerFile,
};
