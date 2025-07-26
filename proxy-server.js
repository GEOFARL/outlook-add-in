const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");
const https = require("https");
const path = require("path");

const app = express();

app.use(cors());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("Request Headers:", JSON.stringify(req.headers, null, 2));
  next();
});

app.use(
  "/dev-api",
  createProxyMiddleware({
    target: "https://mlredactapidev-aafrfrbxetdmc9f5.southafricanorth-01.azurewebsites.net",
    changeOrigin: true,
    secure: false,
    pathRewrite: { "^/dev-api": "" },
    logLevel: "debug",
    proxyTimeout: 30000, // 30 seconds
    timeout: 30000, // 30 seconds
    onError: (err, req, res) => {
      console.error("Proxy Error:", err.message);
      res.status(500).send("Proxy error: " + err.message);
    },
    onProxyRes: (proxyRes) => {
      let responseData = [];
      proxyRes.on("data", (chunk) => responseData.push(chunk));
      proxyRes.on("end", () => {
        console.log(`Response ${proxyRes.statusCode}:`, Buffer.concat(responseData).toString());
      });
    },
  })
);

const certPath = path.join(process.env.HOME, ".office-addin-dev-certs", "localhost.crt");
const keyPath = path.join(process.env.HOME, ".office-addin-dev-certs", "localhost.key");

const PORT = 4000;
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`Secure local proxy running at https://localhost:${PORT}`);
});
