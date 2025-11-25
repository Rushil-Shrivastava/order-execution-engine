import { buildApp } from "./app";
import { logger } from "./utils/logger";
import './workers/order.worker';

const PORT = Number(process.env.PORT || 3000);

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    logger.info(`Server listening on port ${PORT}`);
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

start();