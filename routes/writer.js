const express = require("express");
const router = express.Router();
const { getUserByUid } = require("../models/users");
const projects = require("../models/projects");
const codeWriter = require("../models/code_writer");

router.post("/write-backend", async (req, res) => {
  const userId = req.uid;
  const { projectId } = req.body;
  const project = await projects.getProjectById(userId, projectId);
  const user = await getUserByUid(userId);
  const userName = user.settings.github.username;
  const token = user.settings.github.access_token;
  codeWriter
    .writeBackend(
      userName,
      project.github.repository_name,
      token,
      project.collections
    )
    .then(() => {
      res.status(200).send("ok");
    });
});

module.exports = router;
