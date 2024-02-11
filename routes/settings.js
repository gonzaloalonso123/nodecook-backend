const express = require("express");
const router = express.Router();
const settings = require("../models/settings");

router.get("/", (req, res) => {
  const userId = req.uid;
  settings.get(userId).then((data) => {
    res.status(200).send({
      settings: data,
    });
  });
});

router.patch("/", (req, res) => {
  const userId = req.uid;
  const newSettings = req.body;
  settings.put(userId, newSettings).then((data) => {
    res.status(200).send({ settings: data });
  });
});

module.exports = router;
