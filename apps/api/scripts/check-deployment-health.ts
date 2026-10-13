import { verifyDeploymentHealth } from "./lib/deployment-health.js";

try {
  await verifyDeploymentHealth(process.env.VITE_SERVER_URL);
  console.log("Production health matches deployment.json");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production health check failed");
  process.exitCode = 1;
}
