const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");

const bootstrap = async () => {
  await connectDb();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on port ${env.port}`);
  });
};

bootstrap();
