const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApprovalComment = sequelize.define(
    'ApprovalComment',
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
      // Nullable — can be linked to a real user record if available
      author_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      author_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      author_role: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true },
      },
    },
    {
      tableName: 'approval_comments',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['approval_id'] }],
    }
  );

  return ApprovalComment;
};
