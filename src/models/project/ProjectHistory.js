const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectHistory = sequelize.define(
    'ProjectHistory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['created', 'updated', 'approved', 'rejected', 'revision_requested', 'commented']],
        },
      },
      actor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actor_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'project_history',
      timestamps: true,
      // History rows are immutable — no updated_at needed
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['project_id'] },
        { fields: ['action'] },
      ],
    }
  );

  return ProjectHistory;
};
