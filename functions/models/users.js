const { db } = require("../firebase");

const createUserIfNotExists = async (uid, email) => {
  const docRef = db.collection("users").doc(uid);
  docRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        db.collection("users")
          .doc(uid)
          .set({
            projects: [],
            settings: {
              theme: "light",
              github_profile: {
                username: "",
                token: "",
              },
              firebase_profile: {
                projects: [],
              },
            },
            email,
          });
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
