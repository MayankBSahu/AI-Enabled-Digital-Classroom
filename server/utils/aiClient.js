const axios = require("axios");
const env = require("../config/env");

const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: 20000
});

const evaluateAssignment = async (payload) => {
  const { data } = await aiClient.post("/evaluate-assignment", payload);
  return data;
};

const askDoubt = async (payload) => {
  const { data } = await aiClient.post("/ask-doubt-rag", payload);
  return data;
};

const ingestMaterial = async (payload) => {
  const { data } = await aiClient.post("/ingest-material", payload);
  return data;
};

const scoreDoubtQuality = async (payload) => {
  const { data } = await aiClient.post("/score-doubt-quality", payload);
  return data;
};

module.exports = {
  evaluateAssignment,
  ingestMaterial,
  askDoubt,
  scoreDoubtQuality
};
