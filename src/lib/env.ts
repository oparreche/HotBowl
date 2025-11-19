export const env = {
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_PORT: Number(process.env.DB_PORT || 3333),
  DB_USER: process.env.DB_USER || "hotbowl",
  DB_PASS: process.env.DB_PASS || "hotbowl",
  DB_NAME: process.env.DB_NAME || "hotbowl",
  APP_URL: process.env.APP_URL || "http://localhost:3000",
};
