const { db } = require("../firebase");
const path = require("path");
const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);
const fs = require("fs");

const getUserProfile = async (uid) => {
  const docRef = db.collection("users").doc(uid);
  const doc = await docRef.get();
  if (doc.exists) {
    return doc.data().settings.github_profile;
  }
  return null;
};
const addUserProfile = async (uid, username, access_token) => {
  try {
    const docRef = db.collection("users").doc(uid);
    const doc = await docRef.get();

    if (doc.exists) {
      const user = doc.data();
      user.settings.github_profile = {
        username,
        access_token,
      };
      console.log(user);
      await docRef.update(user);
    }

    return { username, access_token };
  } catch (error) {}
};

const deleteUserProfile = async (uid) => {
  try {
    const docRef = db.collection("users").doc(uid);
    const doc = await docRef.get();
    if (doc.exists) {
      const user = doc.data();
      delete user.settings.github_profile;
      await docRef.update(user);
    }
  } catch (error) {}
};

const cloneRepository = async (username, repositoryName, token) => {
  const repoDirectory = path.join(__dirname, "..", "repos", repositoryName);
  const url = `https://${
    token ? token : process.env.GITHUB_ACCESS_TOKEN
  }@github.com/${username}/${repositoryName}.git`;

  if (fs.existsSync(repoDirectory)) {
    fs.rmdirSync(repoDirectory, { recursive: true });
  }
  try {
    await simpleGit().clone(url, repoDirectory);
  } catch (error) {
    console.error("Error cloning repository:", error.message);
  }
};

const pushRepository = async (username, repositoryName, token) => {
  const repoDirectory = path.join(__dirname, "..", "repos", repositoryName);
  const url = `https://${
    token ? token : process.env.GITHUB_ACCESS_TOKEN
  }@github.com/${username}/${repositoryName}.git`;
  try {
    const git = simpleGit(repoDirectory);
    const branchSummary = await git.branch();
    if (!branchSummary.branches.main) {
      await git.checkoutLocalBranch("main");
    } else {
      await git.checkout("main");
    }
    await git.add(".");
    await git.commit("Nodecook API: Pushing changes.");
    const pushed = await git.push(url, "main");
    console.log(pushed);
  } catch (error) {
    console.error("Error pushing repository:", error.message);
  }
};

module.exports = {
  getUserProfile,
  addUserProfile,
  deleteUserProfile,
  cloneRepository,
  pushRepository,
};

// const { Octokit } = require("octokit");
// const fs = require("fs").promises;
// const path = require("path");
// const simpleGit = require("simple-git");

// // Replace 'your-personal-access-token' with your actual token
// const octokit = new Octokit({
//   auth: "your-personal-access-token",
// });

// const owner = "your-username";
// const repo = "your-repo";

// const repoDirectory = path.join(__dirname, repo);
// const userConfigFilePath = "./userConfigurations.json";

// let userConfigurations = {};
// if (fs.existsSync(userConfigFilePath)) {
//   const fileContent = fs.readFileSync(userConfigFilePath, "utf-8");
//   userConfigurations = JSON.parse(fileContent);
// }

// const saveUserConfigurationsToFile  = () => {
//   const jsonData = JSON.stringify(userConfigurations, null, 2);
//   fs.writeFileSync(userConfigFilePath, jsonData, "utf-8");
// }

// const updateKey = async (userId, key) => {
//   try {
//     userConfigurations[userId] = userConfigurations[userId] || {};
//     userConfigurations[userId].githubAccessToken = key;
//     saveUserConfigurationsToFile();
//   } catch (error) {
//     console.error(error);
//   }
// };

// const getKey = async (userId) => {
//   try {
//     if (userConfigurations[userId]) {
//       const key = userConfigurations[userId].githubAccessToken;
//       res.json({ success: true, key });
//     } else {
//       res.status(404).json({ success: false, error: "User not found." });
//     }
//   } catch (error) {
//     console.error("Error getting key:", error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// const cloneRepository = async () => {
//   try {
//     await simpleGit().clone(
//       `https://github.com/${owner}/${repo}`,
//       repoDirectory
//     );
//   } catch (error) {}
// };

// const pullRepository = async () => {
//   try {
//     await simpleGit(repoDirectory).pull();
//   } catch (error) {}
// };

// const pushRepository = async () => {
//   try {
//     await simpleGit(repoDirectory).push();
//   } catch (error) {
//     console.error("Error pushing repository:", error.message);
//   }
// };

// module.exports = {
//   cloneRepository,
//   pullRepository,
//   pushRepository,
//   updateKey,
//   getKey,
// };

// // async function main() {
// //   await cloneRepository();
// //   const newFilePath = path.join(repoDirectory, 'new-file.txt');
// //   await fs.writeFile(newFilePath, 'Hello, GitHub API!\n');
// //   await simpleGit(repoDirectory).add('.');
// //   await simpleGit(repoDirectory).commit('Add new file via GitHub API');
// //   await pushRepository();
// //   await pullRepository();
// // }

// // main();
