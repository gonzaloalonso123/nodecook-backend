const { db } = require("../firebase");
const { v4: uuidv4 } = require("uuid");
var admin = require("firebase-admin");

const createProject = async (uid, project) => {
  const id = uuidv4();

  const currentDate = new Date().toISOString();
  addProjectToUser(uid, { id, name: project.name });
  await db
    .collection("projects")
    .doc(id)
    .set({
      ...project,
      id,
      owner: uid,
      status: "off",
      created: currentDate,
      updated: currentDate,
      endpoints_count: 0,
      collections_count: 0,
      node_version: "18.18.0",
      github: {
        enabled: false,
      },
      collections: [],
      endpoints: [],
    });
};

const addProjectToUser = async (uid, project) => {
  const docRef = db.collection("users").doc(uid);
  docRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        const projects = doc.data().projects;
        projects.push(project);
        docRef.update({
          projects,
        });
      }
    })
    .catch((error) => {});
};

const getProjectsByUser = async (uid) => {
  const docRef = db.collection("users").doc(uid);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  return doc.data().projects;
};

const getProjectById = async (uid, projectId) => {
  const docRef = db.collection("projects").doc(projectId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  const project = doc.data();
  if (project.owner !== uid) {
    return null;
  }
  return project;
};

const newCollection = async (projectId, collection) => {
  const id = uuidv4();
  const currentDate = new Date().toISOString();
  await db
    .collection("projects")
    .doc(projectId)
    .update({
      collections: admin.firestore.FieldValue.arrayUnion({
        id,
        name: collection.name,
        description: collection.description,
        created: currentDate,
        updated: currentDate,
        endpoints: [],
      }),
    });
  updateModified(projectId);

  return {
    id,
    name: collection.name,
    description: collection.description,
    created: currentDate,
    updated: currentDate,
    endpoints: [],
  };
};

const removeCollection = async (projectId, collectionId) => {
  console.log("here", projectId, collectionId);
  const projectDoc = await db.collection("projects").doc(projectId).get();
  const collectionToRemove = projectDoc
    .data()
    .collections.find((collection) => collection.id === collectionId);
  if (collectionToRemove) {
    await db
      .collection("projects")
      .doc(projectId)
      .update({
        collections: admin.firestore.FieldValue.arrayRemove(collectionToRemove),
      });
  }
  updateModified(projectId);
};

const newEndpoint = async (projectId, collectionId, endpoint) => {
  const id = uuidv4();
  const currentDate = new Date().toISOString();
  const projectRef = db.collection("projects").doc(projectId);
  const project = await projectRef.get();
  const collections = project.data().collections;
  const index = collections.findIndex((c) => c.id === collectionId);
  const newEndpoint = {
    id,
    ...endpoint,
    created: currentDate,
    updated: currentDate,
    collection: collections[index].name,
  };
  collections[index].endpoints.push(newEndpoint);

  await db.collection("projects").doc(projectId).update({
    collections: collections,
  });
  updateModified(projectId);

  return newEndpoint;
};

const newBundleOfEndpoints = async (projectId, collectionId, endpoints) => {
  const currentDate = new Date().toISOString();
  const projectRef = db.collection("projects").doc(projectId);
  const project = await projectRef.get();
  const collections = project.data().collections;
  const index = collections.findIndex((c) => c.id === collectionId);
  const newEndpoints = endpoints.map((endpoint) => {
    return {
      id: uuidv4(),
      ...endpoint,
      created: currentDate,
      updated: currentDate,
      collection: collections[index].name,
    };
  });
  collections[index].endpoints =
    collections[index].endpoints.concat(newEndpoints);
  await db.collection("projects").doc(projectId).update({
    collections: collections,
  });
  updateModified(projectId);
  return newEndpoints;
};

const updateModified = async (projectId) => {
  const currentDate = new Date().toISOString();
  await db.collection("projects").doc(projectId).update({
    updated: currentDate,
  });
};

const addRepository = async (projectId, repository) => {
  const newRepository = {
    ...repository,
    enabled: true,
    branch: "main",
  };
  await db.collection("projects").doc(projectId).update({
    github: newRepository,
  });
  return newRepository;
};

const removeRepository = async (projectId) => {
  await db
    .collection("projects")
    .doc(projectId)
    .update({
      github: {
        enabled: false,
      },
    });
};

const removeEndpoint = async (projectId, collectionId, endpointId) => {
  const projectRef = db.collection("projects").doc(projectId);
  const project = await projectRef.get();
  const collections = project.data().collections;
  const index = collections.findIndex((c) => c.id === collectionId);
  const endpointIndex = collections[index].endpoints.findIndex(
    (e) => e.id === endpointId
  );
  collections[index].endpoints.splice(endpointIndex, 1);
  await db.collection("projects").doc(projectId).update({
    collections: collections,
  });
  updateModified(projectId);
};

module.exports = {
  createProject,
  getProjectsByUser,
  getProjectById,
  newCollection,
  newEndpoint,
  newBundleOfEndpoints,
  addRepository,
  removeRepository,
  removeCollection,
  removeEndpoint
};
