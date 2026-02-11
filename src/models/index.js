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

// Organization models
db.Organization = require("./organization/Organization")(sequelize);
db.OrganizationMember = require("./organization/OrganizationMember")(sequelize);
db.Department = require("./organization/Department")(sequelize);
db.Team = require("./organization/Team")(sequelize);
db.TeamMember = require("./organization/TeamMember")(sequelize);
db.Position = require("./organization/Position")(sequelize);
db.OrgRole = require("./organization/OrgRole")(sequelize);
db.Invitation = require("./organization/Invitation")(sequelize);
db.OrgChartNodeState = require("./organization/OrgChartNodeState")(sequelize);
db.OrgAuditLog = require("./organization/OrgAuditLog")(sequelize);
db.ImportJob = require("./organization/ImportJob")(sequelize);

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

// Organization associations
db.Organization.hasMany(db.OrganizationMember, {
  foreignKey: "organization_id",
  as: "members",
});
db.OrganizationMember.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.Department, {
  foreignKey: "organization_id",
  as: "departments",
});
db.Department.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.Team, { foreignKey: "organization_id", as: "teams" });
db.Team.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.Position, {
  foreignKey: "organization_id",
  as: "positions",
});
db.Position.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.OrgRole, {
  foreignKey: "organization_id",
  as: "orgRoles",
});
db.OrgRole.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.Invitation, {
  foreignKey: "organization_id",
  as: "invitations",
});
db.Invitation.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.OrgAuditLog, {
  foreignKey: "organization_id",
  as: "auditLogs",
});
db.OrgAuditLog.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.ImportJob, {
  foreignKey: "organization_id",
  as: "importJobs",
});
db.ImportJob.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.Organization.hasMany(db.OrgChartNodeState, {
  foreignKey: "organization_id",
  as: "nodeStates",
});
db.OrgChartNodeState.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});

db.User.hasMany(db.OrganizationMember, {
  foreignKey: "user_id",
  as: "organizationMemberships",
});
db.OrganizationMember.belongsTo(db.User, {
  foreignKey: "user_id",
  as: "user",
});

db.Department.hasMany(db.OrganizationMember, {
  foreignKey: "department_id",
  as: "members",
});
db.OrganizationMember.belongsTo(db.Department, {
  foreignKey: "department_id",
  as: "department",
});

db.Team.hasMany(db.OrganizationMember, {
  foreignKey: "team_id",
  as: "members",
});
db.OrganizationMember.belongsTo(db.Team, {
  foreignKey: "team_id",
  as: "team",
});

db.Position.hasMany(db.OrganizationMember, {
  foreignKey: "position_id",
  as: "members",
});
db.OrganizationMember.belongsTo(db.Position, {
  foreignKey: "position_id",
  as: "position",
});

db.OrgRole.hasMany(db.OrganizationMember, {
  foreignKey: "org_role_id",
  as: "members",
});
db.OrganizationMember.belongsTo(db.OrgRole, {
  foreignKey: "org_role_id",
  as: "orgRole",
});

db.Department.belongsTo(db.OrganizationMember, {
  foreignKey: "head_member_id",
  as: "headMember",
});
db.OrganizationMember.hasMany(db.Department, {
  foreignKey: "head_member_id",
  as: "headedDepartments",
});

db.Team.belongsTo(db.OrganizationMember, {
  foreignKey: "lead_member_id",
  as: "leadMember",
});
db.OrganizationMember.hasMany(db.Team, {
  foreignKey: "lead_member_id",
  as: "ledTeams",
});

db.Department.belongsTo(db.Department, {
  foreignKey: "parent_department_id",
  as: "parentDepartment",
});
db.Department.hasMany(db.Department, {
  foreignKey: "parent_department_id",
  as: "childDepartments",
});

db.Team.belongsTo(db.Department, {
  foreignKey: "department_id",
  as: "department",
});
db.Department.hasMany(db.Team, {
  foreignKey: "department_id",
  as: "teams",
});

db.OrganizationMember.belongsTo(db.OrganizationMember, {
  foreignKey: "reports_to_member_id",
  as: "manager",
});
db.OrganizationMember.hasMany(db.OrganizationMember, {
  foreignKey: "reports_to_member_id",
  as: "directReports",
});

db.Team.belongsToMany(db.OrganizationMember, {
  through: db.TeamMember,
  foreignKey: "team_id",
  otherKey: "organization_member_id",
  as: "teamMembers",
});
db.OrganizationMember.belongsToMany(db.Team, {
  through: db.TeamMember,
  foreignKey: "organization_member_id",
  otherKey: "team_id",
  as: "memberTeams",
});

db.TeamMember.belongsTo(db.Organization, {
  foreignKey: "organization_id",
  as: "organization",
});
db.TeamMember.belongsTo(db.Team, {
  foreignKey: "team_id",
  as: "team",
});
db.TeamMember.belongsTo(db.OrganizationMember, {
  foreignKey: "organization_member_id",
  as: "organizationMember",
});

db.OrgChartNodeState.belongsTo(db.OrganizationMember, {
  foreignKey: "organization_member_id",
  as: "member",
});
db.OrganizationMember.hasOne(db.OrgChartNodeState, {
  foreignKey: "organization_member_id",
  as: "nodeState",
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
