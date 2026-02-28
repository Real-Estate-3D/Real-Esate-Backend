const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApprovalHistory = sequelize.define(
    'ApprovalHistory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      approval_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      // What action was taken
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['created', 'assigned', 'approved', 'rejected', 'revision_requested', 'commented']],
        },
      },
      // Nullable — system actions have no actor_id
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
      tableName: 'approval_history',
      timestamps: true,
      // History rows are immutable — no need for updated_at
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['approval_id'] },
        { fields: ['action'] },
      ],
    }
  );

  return ApprovalHistory;
};
