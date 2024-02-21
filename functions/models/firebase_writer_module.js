const { wordToPascalCase, writeFile } = require("../utils/utils");
const path = require("path");


const writeFirebaseDatabaseConnection = async (repoDirectory) => {
    const indexFileContent = `const { getFirestore } = require("firebase-admin/firestore");
    const admin = require("firebase-admin");
    
    const serviceAccount = require("./service_account.json");
    
    admin.initializeApp({
      credential: admin.credential.cert({...serviceAccount, private_key_id : process.env.FIREBASE_PRIVATE_KEY}),
    });
    const db = getFirestore();
    
    module.exports = { db };
    `;
    const indexFilePath = path.join(repoDirectory, "index.js");
    await writeFile(indexFilePath, indexFileContent);
  };
  
  const writeFirebaseDatabaseConfig = async (repoDirectory, config) => {
    const fileContent = config;
    const filePath = path.join(repoDirectory, "service_account.js");
    await writeFile(filePath, fileContent);
  };
  
  const writeFirebaseDatabaseDaos = async (repoDirectory, collections) => {
    for (const collection of collections) {
      const collectionName = wordToPascalCase(collection.name);
      let fileContent = `const { db } = require("../index");
const { collection } = require("firebase-admin/firestore");
const ${collectionName}Ref = collection(db, "${collection.name}");

const get${collectionName}ById = async (id) => {
  const docRef = db.collection(${collection.name}).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data();
  return data;
};

const create${collectionName} = async (data) => {
  const docRef = db.collection(${collection.name}).doc();
  await docRef.set(data);
  const new${collectionName} = await docRef.get();
  return new${collectionName}.data();
};

const update${collectionName} = async (id, data) => {
  const docRef = db.collection(${collection.name}).doc(id);
  await docRef.update(data);
  const updated${collectionName} = await docRef.get();
  return updated${collectionName}.data();
};

const delete${collectionName} = async (id) => {
  const docRef = db.collection(${collection.name}).doc(id);
  await docRef.delete();
};

module.exports = {
  get${collectionName}ById,
  create${collectionName},
  update${collectionName},
  delete${collectionName},
};`;
      const fileName = `${collectionName}.js`;
      const filePath = path.join(repoDirectory, fileName);
      await writeFile(filePath, fileContent);
    }
  };

  module.exports = {
    writeFirebaseDatabaseConnection,
    writeFirebaseDatabaseConfig,
    writeFirebaseDatabaseDaos,
  };