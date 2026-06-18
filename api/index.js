// Vercel serverless entry point.
// Vercel's @vercel/node runtime detects the exported Express app and wraps it
// as a serverless function. All /api/* requests are routed here via vercel.json.
import app from '../server.js';
export default app;
