/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // IMPORTANT:
  // Do NOT use `output: "export"` for this app.
  // This app uses auth, dynamic routes, and runtime API calls.
  // Static export causes prerender failures and blocks deployment.
};

module.exports = nextConfig;
