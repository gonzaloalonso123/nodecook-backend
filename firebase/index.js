const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

const serviceAccount = require("./service_acc_nc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

module.exports = { db };
