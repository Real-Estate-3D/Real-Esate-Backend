const { OrganizationMember, User, Position, OrgChartNodeState } = require('../../models');
const { logOrgAudit } = require('../../utils/orgAudit');

const buildTree = (members) => {
  const map = new Map();
  members.forEach((member) => {
    map.set(member.id, {
      id: member.id,
      parentId: member.reports_to_member_id || null,
      name:
        member.user?.display_name ||
        `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() ||
        member.user?.email ||
        'Unknown',
      title: member.position?.name || '',
      initials: `${member.user?.first_name?.[0] || ''}${member.user?.last_name?.[0] || ''}`.toUpperCase(),
      collapsed: member.nodeState?.collapsed || false,
      positionX: member.nodeState?.position_x || null,
      positionY: member.nodeState?.position_y || null,
      children: [],
    });
  });

  const roots = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
};

const orgChartController = {
  async getOrgChart(req, res) {
    try {
      const members = await OrganizationMember.findAll({
        where: { organization_id: req.organizationId },
        include: [
          { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] },
          { model: Position, as: 'position', attributes: ['id', 'name'] },
          { model: OrgChartNodeState, as: 'nodeState' },
        ],
        order: [['created_at', 'ASC']],
      });

      const tree = buildTree(members);

      res.json({
        success: true,
        data: {
          tree,
          nodes: members,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch org chart',
        error: error.message,
      });
    }
  },

  async addChild(req, res) {
    try {
      const parentMemberId = req.params.memberId;
      const childMemberId = req.body.childMemberId;
      if (!childMemberId) {
        return res.status(400).json({ success: false, message: 'childMemberId is required' });
      }

      const parent = await OrganizationMember.findOne({
        where: { id: parentMemberId, organization_id: req.organizationId },
      });
      const child = await OrganizationMember.findOne({
        where: { id: childMemberId, organization_id: req.organizationId },
      });
      if (!parent || !child) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const previous = child.toJSON();
      await child.update({ reports_to_member_id: parent.id });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'org_chart',
        entityId: child.id,
        departmentId: child.department_id,
        action: 'child_link_added',
        message: `Org chart link added: ${child.id} -> ${parent.id}`,
        previousValues: previous,
        newValues: child.toJSON(),
      });

      res.status(201).json({
        success: true,
        data: child,
        message: 'Child link added successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to add child link',
        error: error.message,
      });
    }
  },

  async removeNode(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const previous = member.toJSON();
      await member.update({ reports_to_member_id: null });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'org_chart',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'child_link_removed',
        message: `Org chart parent link removed for ${member.id}`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: 'Node detached successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to detach node',
        error: error.message,
      });
    }
  },

  async updateCollapsedState(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const collapsed = !!req.body.collapsed;
      const positionX = req.body.positionX ?? null;
      const positionY = req.body.positionY ?? null;

      const [nodeState, created] = await OrgChartNodeState.findOrCreate({
        where: {
          organization_id: req.organizationId,
          organization_member_id: member.id,
        },
        defaults: {
          organization_id: req.organizationId,
          organization_member_id: member.id,
          collapsed,
          position_x: positionX,
          position_y: positionY,
        },
      });

      if (!created) {
        await nodeState.update({
          collapsed,
          position_x: positionX,
          position_y: positionY,
        });
      }

      res.json({
        success: true,
        data: nodeState,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update node state',
        error: error.message,
      });
    }
  },
};

module.exports = orgChartController;

