import { serve } from "bun";
import { file } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve static assets from public directory
    "/assets/*": async (req) => {
      const url = new URL(req.url);
      const filePath = `./public${url.pathname}`;
      const assetFile = file(filePath);
      
      if (await assetFile.exists()) {
        return new Response(assetFile);
      }
      
      return new Response("Not Found", { status: 404 });
    },

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
