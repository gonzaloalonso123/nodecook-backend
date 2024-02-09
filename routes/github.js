const express = require("express");
const router = express.Router();
const github = require("../models/github");
const { getUserByUid } = require("../models/users");
const projects = require("../models/projects");
const codeWriter = require("../models/code_writer");

router.get("/check_repository_status", (req, res) => {
  const url = req.query.url;
  github.check_repository_status(url).then((data) => {
    res.status(200).send({
      github_status: data,
    });
  });
});

router.post("/update-key", (req, res) => {
  const { userId, key } = req.body;
  updateKey(userId, key);
  res.send("ok");
});

router.get("/profile", (req, res) => {
  const userId = req.uid;
  github.getUserProfile(userId).then((data) => {
    res.status(200).send({
      profile: data,
    });
  });
});

router.post("/profile", (req, res) => {
  const userId = req.uid;
  const { username, access_token } = req.body;
  github.addUserProfile(userId, username, access_token).then((data) => {
    res.status(200).send({
      profile: data,
    });
  });
});

router.delete("/profile", (req, res) => {
  const userId = req.uid;
  github.deleteUserProfile(userId).then(() => {
    res.status(200).send("ok");
  });
});

module.exports = router;
