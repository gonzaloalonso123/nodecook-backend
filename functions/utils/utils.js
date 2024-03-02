const fsPromises = require("fs").promises;
const fs = require("fs");

const wordToPascalCase = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const writeFile = async (filePath, fileContent) => {
  await fsPromises.writeFile(filePath, fileContent);
};

const createFolder = async (folderPath) => {
  if (fs.existsSync(folderPath)) return;
  await fsPromises.mkdir(folderPath);
};

const indent = (body) => {
  return body
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
};

module.exports = {
  wordToPascalCase,
  writeFile,
  createFolder,
  indent,
};
