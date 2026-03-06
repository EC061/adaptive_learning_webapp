/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server for Docker deployment
  output: "standalone",
  // Trust X-Forwarded-* headers from Cloudflare Tunnel proxy
  // Cloudflare terminates TLS; requests arrive over HTTP to cloudflared -> localhost
  // trustHost is handled by NextAuth's trustHost: true in auth config
};

export default nextConfig;
