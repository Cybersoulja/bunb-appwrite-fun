# Bun HTTP Function Starter

A simple starter template for building HTTP functions with Bun. This example provides basic routing and JSON responses. 🚀

## 🧰 Usage

### Installation

```bash
bun install

Running Locally
bun run src/main.ts  # Or the command to start your server (e.g., bun dev)

Endpoints
GET /
 * Returns a "Hello, World!" message.
Response
Hello, World!

POST, PUT, PATCH, DELETE /
 * Returns a "Learn More" JSON response.
Response
{
  "motto": "Build like a team of hundreds_",
  "learn": "[https://appwrite.io/docs](https://appwrite.io/docs)",
  "connect": "[https://appwrite.io/discord](https://appwrite.io/discord)",
  "getInspired": "[https://builtwith.appwrite.io](https://builtwith.appwrite.io)"
}

⚙️ Configuration
| Setting | Value |
|---|---|
| Runtime | Bun (1.0) |
| Entrypoint | src/main.ts |
| Build Commands | bun install |
| Timeout (Seconds) | 15 |
🔒 Environment Variables
None required for this basic example.  Add documentation here if your function uses environment variables.
Example src/main.ts
import { serve } from "bun";

serve({
  fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response("Hello, World!");
    } else {
      return new Response(JSON.stringify({
        motto: "Build like a team of hundreds_",
        learn: "[https://appwrite.io/docs](https://appwrite.io/docs)",
        connect": "[https://appwrite.io/discord](https://appwrite.io/discord)",
        getInspired": "[https://builtwith.appwrite.io](https://builtwith.appwrite.io)"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
});

Deployment (Example for Appwrite Cloud Functions)
 * Create a new Cloud Function in your Appwrite console.
 * Choose the "Bun" runtime.
 * Copy the contents of this repository (including src/main.ts, bun.lockb, and package.json) into the function's code editor.
 * Set the entrypoint to src/main.ts.
 * Set the build command to bun install.
 * Deploy the function.
Adapt these instructions for your specific deployment platform.
Contributing
Contributions are welcome!  Please see the CONTRIBUTING.md file for guidelines.
License
This project is licensed under the MIT License - see the LICENSE file for details.

