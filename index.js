const express = require("express");
const app = express();
const cors = require("cors");
const GitHub = require("./routes/github");
const Projects = require("./routes/projects");
const authMiddleware = require("./firebase/authMiddleware");
const { logRequest } = require("./middleware/middleware");
const Settings = require("./routes/settings");
const Writer = require("./routes/writer");

app.use(express.json());
app.use(
  cors({
    "Access-Control-Allow-Origin": "*",
  })
);

app.use(logRequest);
app.use(authMiddleware);

app.use("/github", GitHub);
app.use("/projects", Projects);
app.use("/settings", Settings);
app.use("/writer", Writer);

const port = 1998;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
