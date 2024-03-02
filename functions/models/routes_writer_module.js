const { wordToPascalCase, writeFile, indent } = require("../utils/utils");
const path = require("path");

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
  let body = "\ntry {\n";
  switch (endpoint.method) {
    case "GET":
      body += indent(createGetBody(endpoint));
      break;
    case "POST":
      body += indent(createPostBody(endpoint));
      break;
    case "PATCH":
      body += indent(createPatchBody(endpoint));
      break;
    case "DELETE":
      body += indent(createDeleteBody(endpoint));
      break;
  }

  body += "\n";
  body += indent("res.status(200).json(item);");
  body += "\n}";
  body += "\ncatch (error) {\n";
  body += indent("res.status(500).json({ error: error.message });");
  body += "\n}";

  return indent(body);
};

const createGetBody = (endpoint) => {
  console.log(endpoint);
  let body = "";
  switch (endpoint.filterBy) {
    case "all":
      body += `const item = await ${endpoint.collection}.getAll();`;
      break;
    case "id":
      body += `const item = await ${endpoint.collection}.getById(req.params.id);`;
      break;
    case "custom":
      body += `const item = await ${
        endpoint.collection
      }.getBy${wordToPascalCase(endpoint.filterByCustom)}(req.params.value);`;
      break;
  }
  return body;
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

module.exports = {
  writeRoutes,
};
