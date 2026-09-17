import serverless from 'serverless-http';
import app from '../../server/server';
import db from '../../server/database';

const handler = serverless(app);

export const handlerFunction = async (event: any, context: any) => {
  // Reuse Mongoose's existing connection when the Netlify Function stays warm.
  await db.connect();
  const path = event.path.replace(/^\/.netlify\/functions\/api/, '') || '/';
  return handler({ ...event, path }, context);
};

export { handlerFunction as handler };
