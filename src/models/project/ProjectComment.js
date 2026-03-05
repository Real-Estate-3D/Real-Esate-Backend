const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectComment = sequelize.define(
    'ProjectComment',
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
      tableName: 'project_comments',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['project_id'] }],
    }
  );

  return ProjectComment;
};
