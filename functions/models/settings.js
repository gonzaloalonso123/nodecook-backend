const { db } = require("../firebase");

const get = async (uid) => {
  const docRef = db.collection("users").doc(uid);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  return doc.data().settings;
};

const put = async (uid, settings) => {
  const docRef = db.collection("users").doc(uid);
  await docRef.update({
    settings,
  });
  return settings;
};

module.exports = {
  get,
  put,
};
