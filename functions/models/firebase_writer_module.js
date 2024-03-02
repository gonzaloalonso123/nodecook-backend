const { wordToPascalCase, writeFile } = require("../utils/utils");
const path = require("path");

const writeFirebaseDatabaseConnection = async (
  repoDirectory,
  collections,
  user
) => {
  await writeIndex(repoDirectory);
  // await writeFirebaseDatabaseConfig(repoDirectory);
  await writeFirebaseDatabaseDaos(repoDirectory, collections);
  await writeUserModel(repoDirectory, user);
  await writeFirebaseMiddleware(repoDirectory);
};

const writeFirebaseMiddleware = async (repoDirectory) => {
  const middlewareFileContent = `const { getAuth } = require("firebase-admin/auth");
const { createUserIfNotExists } = require("../models/users");

const authMiddleware = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization;
    if (!idToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing authorization header" });
    }

    getAuth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        const uid = decodedToken.uid;
        req.uid = uid;
        createUserIfNotExists(uid, decodedToken.email);
        next();
      })
      .catch((error) => {
        console.error("Error verifying Firebase token:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      });
  } catch (error) {
    console.error("Error in catch block:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = authMiddleware;
`;
  const middlewareFilePath = path.join(
    repoDirectory,
    "middleware",
    "authMiddleware.js"
  );
  await writeFile(middlewareFilePath, middlewareFileContent);
};

const writeIndex = async (repoDirectory) => {
  const indexFileContent = `const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

const serviceAccount = require("../service_account/service_account.json");

admin.initializeApp({
  credential: admin.credential.cert({...serviceAccount, private_key_id : process.env.FIREBASE_PRIVATE_KEY}),
});
const db = getFirestore();

module.exports = { db };
  `;
  const indexFilePath = path.join(repoDirectory, "config", "index.js");
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
const { v4: uuidv4 } = require("uuid");
const { collection } = require("firebase-admin/firestore");
const ${collectionName}Ref = collection(db, "${collection.name}");

const get${collectionName}ById = async (id) => {
  const docRef = ${collectionName}Ref.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data();
  return data;
};

const create${collectionName} = async (data) => {
  const id = uuidv4();
  const docRef = ${collectionName}Ref.doc(id);
  await docRef.set({...data, id});
  const new${collectionName} = await docRef.get();
  return new${collectionName}.data();
};

const update${collectionName} = async (id, data) => {
  const docRef =${collectionName}Ref.doc(id);
  await docRef.update(data);
  const updated${collectionName} = await docRef.get();
  return updated${collectionName}.data();
};

const delete${collectionName} = async (id) => {
  const docRef = ${collectionName}Ref.doc(id);
  await docRef.delete();
};

module.exports = {
  get${collectionName}ById,
  create${collectionName},
  update${collectionName},
  delete${collectionName},
};`;
    const fileName = `${collectionName}.js`;
    const filePath = path.join(repoDirectory, "daos", fileName);
    await writeFile(filePath, fileContent);
  }
};

const writeUserModel = async (repoDirectory, user) => {
  const fileContent = `const { db } = require("../firebase");

const createUserIfNotExists = async (uid, email) => {
  const docRef = db.collection("users").doc(uid);
  docRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        db.collection("users")
          .doc(uid)
          .set(${JSON.stringify(user)});
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
};

const getUserByUid = async (uid) => {
  console.log(uid);
  const docRef = db.collection("users").doc(uid);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
};

module.exports = {
  createUserIfNotExists,
  getUserByUid,
};
`;
  const filePath = path.join(repoDirectory, "models", "users.js");
  await writeFile(filePath, fileContent);
};

module.exports = {
  writeFirebaseDatabaseConnection,
  writeFirebaseDatabaseConfig,
  writeFirebaseDatabaseDaos,
};
