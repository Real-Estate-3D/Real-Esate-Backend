// File: src/models/user/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
    },
    last_name: {
      type: DataTypes.STRING(100),
    },
    display_name: {
      type: DataTypes.STRING(200),
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    avatar_url: {
      type: DataTypes.STRING(500),
    },
    department: {
      type: DataTypes.STRING(100),
    },
    title: {
      type: DataTypes.STRING(100),
    },
    organization: {
      type: DataTypes.STRING(200),
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_login: {
      type: DataTypes.DATE,
    },
    login_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    password_changed_at: {
      type: DataTypes.DATE,
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
    },
    reset_password_expires: {
      type: DataTypes.DATE,
    },
    verification_token: {
      type: DataTypes.STRING(255),
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'users',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
        if (!user.display_name && (user.first_name || user.last_name)) {
          user.display_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
          user.password_changed_at = new Date();
        }
      },
    },
  });

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    delete values.reset_password_token;
    delete values.reset_password_expires;
    delete values.verification_token;
    return values;
  };

  return User;
};
