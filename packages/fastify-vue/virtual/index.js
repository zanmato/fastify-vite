import { createRoutes } from "@zanmato/fastify-vue/server";

export default {
  routes: createRoutes(import("/:routes.js")),
  create: import("/:create.js"),
  context: import("/:context.js"),
};
