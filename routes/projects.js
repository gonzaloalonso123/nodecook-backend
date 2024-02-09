const express = require("express");
const router = express.Router();
const projects = require("../models/projects");

router.post("/", (req, res) => {
  const project = req.body;
  const userId = req.uid;
  projects.createProject(userId, project).then((data) => {
    res.status(200).send({
      project: data,
    });
  });
});

router.get("/", (req, res) => {
  const userId = req.uid;
  projects.getProjectsByUser(userId).then((data) => {
    res.status(200).send({
      projects: data,
    });
  });
});

router.get("/:id", (req, res) => {
  const projectId = req.params.id;
  const userId = req.uid;
  projects.getProjectById(userId, projectId).then((data) => {
    res.status(200).send({
      project: data,
    });
  });
});

router.post("/:id/collections", async (req, res) => {
  const projectId = req.params.id;
  const collection = req.body;
  projects.newCollection(projectId, collection).then((data) => {
    res.status(200).send({
      collection: data,
    });
  });
});

router.delete("/:id/collections/:collectionId", (req, res) => {
  const projectId = req.params.id;
  const collectionId = req.params.collectionId;
  projects.removeCollection(projectId, collectionId).then((data) => {
    res.status(200).send({
      collection: data,
    });
  });
});

router.post("/:id/collections/:collectionId/endpoints", (req, res) => {
  const projectId = req.params.id;
  const collectionId = req.params.collectionId;
  const endpoint = req.body;
  projects.newEndpoint(projectId, collectionId, endpoint).then((data) => {
    res.status(200).send({
      endpoint: data,
    });
  });
});

router.delete(
  "/:id/collections/:collectionId/endpoints/:endpointId",
  (req, res) => {
    const projectId = req.params.id;
    const collectionId = req.params.collectionId;
    const endpointId = req.params.endpointId;
    projects
      .removeEndpoint(projectId, collectionId, endpointId)
      .then((data) => {
        res.status(200).send({
          endpoint: data,
        });
      });
  }
);

router.post("/:id/collections/:collectionId/bundle-endpoints", (req, res) => {
  const projectId = req.params.id;
  const collectionId = req.params.collectionId;
  const endpoints = req.body;
  projects
    .newBundleOfEndpoints(projectId, collectionId, endpoints)
    .then((data) => {
      res.status(200).send({
        endpoints: data,
      });
    });
});

router.post("/:id/repository", (req, res) => {
  const projectId = req.params.id;
  const repository_name = req.body.repositoryName;
  projects.addRepository(projectId, { repository_name }).then((data) => {
    res.status(200).send({
      repository: data,
    });
  });
});

router.delete("/:id/repository", (req, res) => {
  const projectId = req.params.id;
  projects.removeRepository(projectId).then((data) => {
    res.status(200).send({
      repository: data,
    });
  });
});

module.exports = router;
