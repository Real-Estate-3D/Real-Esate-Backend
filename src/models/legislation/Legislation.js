// Legislation Model - Processes/Legislation records
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Legislation = sequelize.define('Legislation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    process: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Process steps description e.g., "Submission, Review, Approval"'
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'awaiting-approval', 'rejected', 'cancelled', 'draft', 'completed'),
      defaultValue: 'draft',
      allowNull: false
    },
    legislation_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Type of legislation: Zoning By-law, Site-Specific Zoning, Official Plan, etc.'
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    municipality: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    full_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Full text content of the legislation'
    },
    workflow_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'legislations',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['legislation_type'] },
      { fields: ['jurisdiction'] },
      { fields: ['municipality'] },
      { fields: ['effective_from'] }
    ]
  });

  return Legislation;
};
