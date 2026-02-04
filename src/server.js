// File: src/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const routes = require("./routes");
const { sequelize } = require("./models");

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Logging middleware
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files for uploads
app.use("/uploads", express.static(config.upload.dir));

// Mount routes
app.use("/", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Handle Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Handle Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(config.nodeEnv === "development" && { stack: err.stack }),
  });
});

// Database connection and server startup
const PORT = config.port;

// Required PostgreSQL schemas for the application
const REQUIRED_SCHEMAS = [
  "reference",
  "boundaries",
  "infrastructure",
  "landuse",
  "legislation",
  "users",
];

const createSchemas = async () => {
  for (const schema of REQUIRED_SCHEMAS) {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
  }
  console.log("✓ Database schemas verified/created");
};

const enablePostgis = async () => {
  // Geometry/Geography columns require PostGIS.
  // If the DB user lacks privileges to create extensions, this will throw with a clear error.
  if (sequelize.getDialect?.() !== "postgres") {
    return;
  }

  try {
    await sequelize.query(
      "CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;"
    );
    console.log("✓ PostGIS extension verified/enabled");
  } catch (err) {
    const message = err?.message || String(err);
    console.error(
      "✗ PostGIS extension is required for GEOMETRY columns but could not be enabled."
    );
    console.error("  - Ensure PostGIS is installed on the PostgreSQL server");
    console.error("  - Ensure the DB user can run: CREATE EXTENSION postgis");
    console.error(`  - Underlying error: ${message}`);
    throw err;
  }
};

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✓ Database connection established successfully");

    // Ensure PostGIS is available before syncing models that use GEOMETRY.
    await enablePostgis();

    // Create required schemas before syncing
    await createSchemas();

    // Sync database (in development only, use migrations in production)
    if (config.nodeEnv === "development") {
      const forceSync = process.env.DB_SYNC_FORCE === "true";
      const alterSync = process.env.DB_SYNC_ALTER !== "false";

      // Default is: alter without dropping columns (safer during active dev).
      // Set DB_SYNC_FORCE=true for a full rebuild, DB_SYNC_ALTER=false to skip altering.
      await sequelize.sync({
        alter: alterSync ? { drop: false } : false,
        force: forceSync,
      });
      console.log("✓ Database synchronized");
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT} in ${config.nodeEnv} mode`);
      console.log(`✓ API available at http://localhost:${PORT}/api/v1`);
      console.log(`✓ Health check at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("✗ Unable to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server gracefully...");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server gracefully...");
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
