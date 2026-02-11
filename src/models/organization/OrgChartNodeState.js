const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgChartNodeState = sequelize.define(
    'OrgChartNodeState',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      organization_member_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      collapsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position_x: DataTypes.DECIMAL(12, 3),
      position_y: DataTypes.DECIMAL(12, 3),
    },
    {
      tableName: 'org_chart_node_state',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return OrgChartNodeState;
};

