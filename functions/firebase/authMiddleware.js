const { getAuth } = require("firebase-admin/auth");
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
