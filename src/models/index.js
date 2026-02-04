// File: src/models/index.js
// Sequelize models initialization and associations

const { Sequelize } = require("sequelize");
const config = require("../config/database");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

console.log("dbConfig:", dbConfig);
// Initialize Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions,
  }
);

// Import models
const db = {};

// Reference schema models
db.BoundaryTierType = require("./reference/BoundaryTierType")(sequelize);
db.FeatureType = require("./reference/FeatureType")(sequelize);

// Boundary schema models
db.UpperTier = require("./boundaries/UpperTier")(sequelize);
db.LowerTier = require("./boundaries/LowerTier")(sequelize);
db.SingleTier = require("./boundaries/SingleTier")(sequelize);
db.Ward = require("./boundaries/Ward")(sequelize);

// Infrastructure schema models
db.Building = require("./infrastructure/Building")(sequelize);
db.AddressPoint = require("./infrastructure/AddressPoint")(sequelize);
db.Road = require("./infrastructure/Road")(sequelize);
db.Trail = require("./infrastructure/Trail")(sequelize);
db.Parking = require("./infrastructure/Parking")(sequelize);

// Land use schema models
db.Park = require("./landuse/Park")(sequelize);
db.LandUse = require("./landuse/LandUse")(sequelize);
db.Zoning = require("./landuse/Zoning")(sequelize);
db.Parcel = require("./landuse/Parcel")(sequelize);

// Legislation models
db.Legislation = require("./legislation/Legislation")(sequelize);
db.LegislationVersion = require("./legislation/LegislationVersion")(sequelize);
db.LegislationBranch = require("./legislation/LegislationBranch")(sequelize);
db.ZoningLaw = require("./legislation/ZoningLaw")(sequelize);
db.Policy = require("./legislation/Policy")(sequelize);
db.GISLayer = require("./legislation/GISLayer")(sequelize);
db.GISSchedule = require("./legislation/GISSchedule")(sequelize);
db.Workflow = require("./legislation/Workflow")(sequelize);
db.WorkflowStep = require("./legislation/WorkflowStep")(sequelize);

// User models
db.User = require("./user/User")(sequelize);
db.Role = require("./user/Role")(sequelize);
db.UserRole = require("./user/UserRole")(sequelize);

db.ChangeHistory = require("./legislation/ChangeHistory")(sequelize);

// Define associations
// Boundary Tier Types
db.UpperTier.belongsTo(db.BoundaryTierType, { foreignKey: "tier_type_id" });
db.LowerTier.belongsTo(db.BoundaryTierType, { foreignKey: "tier_type_id" });
db.SingleTier.belongsTo(db.BoundaryTierType, { foreignKey: "tier_type_id" });

// Boundary Hierarchies
db.LowerTier.belongsTo(db.UpperTier, {
  foreignKey: "upper_tier_id",
  as: "upperTier",
});
db.UpperTier.hasMany(db.LowerTier, {
  foreignKey: "upper_tier_id",
  as: "lowerTiers",
});

db.Ward.belongsTo(db.LowerTier, {
  foreignKey: "lower_tier_id",
  as: "lowerTier",
});
db.Ward.belongsTo(db.SingleTier, {
  foreignKey: "single_tier_id",
  as: "singleTier",
});
db.LowerTier.hasMany(db.Ward, { foreignKey: "lower_tier_id", as: "wards" });
db.SingleTier.hasMany(db.Ward, { foreignKey: "single_tier_id", as: "wards" });

// Infrastructure to Boundaries
db.Building.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Building.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });
db.Building.belongsTo(db.Ward, { foreignKey: "ward_id" });

db.AddressPoint.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.AddressPoint.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });
db.AddressPoint.belongsTo(db.Ward, { foreignKey: "ward_id" });

db.Road.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Road.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

db.Trail.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Trail.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

db.Parking.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Parking.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

// Land Use to Boundaries
db.Park.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Park.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

db.LandUse.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.LandUse.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

db.Zoning.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Zoning.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

db.Parcel.belongsTo(db.LowerTier, { foreignKey: "lower_tier_id" });
db.Parcel.belongsTo(db.SingleTier, { foreignKey: "single_tier_id" });

// Legislation associations
db.Legislation.hasMany(db.LegislationVersion, {
  foreignKey: "legislation_id",
  as: "versions",
});
db.LegislationVersion.belongsTo(db.Legislation, {
  foreignKey: "legislation_id",
});

db.Legislation.hasMany(db.LegislationBranch, {
  foreignKey: "legislation_id",
  as: "branches",
});
db.LegislationBranch.belongsTo(db.Legislation, {
  foreignKey: "legislation_id",
});

db.LegislationBranch.belongsTo(db.LegislationBranch, {
  foreignKey: "parent_branch_id",
  as: "parentBranch",
});
db.LegislationBranch.hasMany(db.LegislationBranch, {
  foreignKey: "parent_branch_id",
  as: "childBranches",
});

db.Legislation.hasMany(db.ZoningLaw, {
  foreignKey: "legislation_id",
  as: "zoningLaws",
});
db.ZoningLaw.belongsTo(db.Legislation, { foreignKey: "legislation_id" });

db.Legislation.hasMany(db.Policy, {
  foreignKey: "legislation_id",
  as: "policies",
});
db.Policy.belongsTo(db.Legislation, { foreignKey: "legislation_id" });

db.Legislation.hasMany(db.GISSchedule, {
  foreignKey: "legislation_id",
  as: "gisSchedules",
});
db.GISSchedule.belongsTo(db.Legislation, { foreignKey: "legislation_id" });

db.GISSchedule.belongsTo(db.GISLayer, {
  foreignKey: "gis_layer_id",
  as: "layer",
});
db.GISLayer.hasMany(db.GISSchedule, {
  foreignKey: "gis_layer_id",
  as: "schedules",
});

// A legislation references a workflow template via workflow_id
db.Legislation.belongsTo(db.Workflow, {
  foreignKey: "workflow_id",
  as: "workflow",
});
db.Workflow.hasMany(db.Legislation, {
  foreignKey: "workflow_id",
  as: "legislations",
});

db.Workflow.hasMany(db.WorkflowStep, {
  foreignKey: "workflow_id",
  as: "steps",
});
db.WorkflowStep.belongsTo(db.Workflow, { foreignKey: "workflow_id" });

// User associations
db.User.belongsToMany(db.Role, {
  through: db.UserRole,
  foreignKey: "user_id",
  as: "roles",
});
db.Role.belongsToMany(db.User, {
  through: db.UserRole,
  foreignKey: "role_id",
  as: "users",
});

// Legislation user associations
db.Legislation.belongsTo(db.User, { foreignKey: "created_by", as: "creator" });
db.Legislation.belongsTo(db.User, { foreignKey: "updated_by", as: "updater" });

db.LegislationVersion.belongsTo(db.User, {
  foreignKey: "created_by",
  as: "creator",
});
db.LegislationBranch.belongsTo(db.User, {
  foreignKey: "created_by",
  as: "creator",
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
