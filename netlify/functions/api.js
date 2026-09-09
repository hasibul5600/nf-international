const serverless = require('serverless-http');
const app = require('../../server/server');
const db = require('../../server/database');

const handler = serverless(app);

exports.handler = async (event, context) => {
  // Reuse Mongoose's existing connection when the Netlify Function stays warm.
  await db.connect();
  const path = event.path.replace(/^\/.netlify\/functions\/api/, '') || '/';
  return handler({ ...event, path }, context);
};
