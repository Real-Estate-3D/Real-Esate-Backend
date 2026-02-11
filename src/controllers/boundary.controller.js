const { sequelize, UpperTier, LowerTier, SingleTier, Ward } = require("../models");
const { Op } = require("sequelize");
const {
  validateGeometryWithinJurisdiction,
} = require("../utils/jurisdictionValidation");

const parseCentroid = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed.coordinates)) return null;
    return {
      longitude: Number(parsed.coordinates[0]),
      latitude: Number(parsed.coordinates[1]),
    };
  } catch {
    return null;
  }
};

const normalizeTierType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "all" || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (["upper_tier", "lower_tier", "single_tier"].includes(normalized)) {
    return normalized;
  }
  return null;
};

const getPagination = (query = {}, fallbackLimit = 100) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Math.min(Number(query.limit || fallbackLimit), 500));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const MUNICIPALITY_UNION_SQL = `
  SELECT *
  FROM (
    SELECT
      'upper_tier' AS "tierType",
      upper_tier_id::TEXT AS id,
      admin_name AS name,
      NULL::TEXT AS "parentName",
      COALESCE(province, 'Ontario')::TEXT AS province,
      CASE
        WHEN geom IS NULL THEN FALSE
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN FALSE
        ELSE TRUE
      END AS "hasData",
      CASE
        WHEN geom IS NULL THEN 'coming_soon'
        WHEN COALESCE(metadata->>'status', '') = 'coming_soon' THEN 'coming_soon'
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN 'coming_soon'
        ELSE 'available'
      END AS status,
      ST_AsGeoJSON(ST_Centroid(geom)) AS centroid,
      bbox,
      ST_AsGeoJSON(geom) AS geometry
    FROM boundaries.upper_tier

    UNION ALL

    SELECT
      'lower_tier' AS "tierType",
      lower_tier_id::TEXT AS id,
      admin_name AS name,
      parent_name::TEXT AS "parentName",
      'Ontario'::TEXT AS province,
      CASE
        WHEN geom IS NULL THEN FALSE
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN FALSE
        ELSE TRUE
      END AS "hasData",
      CASE
        WHEN geom IS NULL THEN 'coming_soon'
        WHEN COALESCE(metadata->>'status', '') = 'coming_soon' THEN 'coming_soon'
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN 'coming_soon'
        ELSE 'available'
      END AS status,
      ST_AsGeoJSON(ST_Centroid(geom)) AS centroid,
      bbox,
      ST_AsGeoJSON(geom) AS geometry
    FROM boundaries.lower_tier

    UNION ALL

    SELECT
      'single_tier' AS "tierType",
      single_tier_id::TEXT AS id,
      admin_name AS name,
      NULL::TEXT AS "parentName",
      COALESCE(province, 'Ontario')::TEXT AS province,
      CASE
        WHEN geom IS NULL THEN FALSE
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN FALSE
        ELSE TRUE
      END AS "hasData",
      CASE
        WHEN geom IS NULL THEN 'coming_soon'
        WHEN COALESCE(metadata->>'status', '') = 'coming_soon' THEN 'coming_soon'
        WHEN COALESCE(metadata->>'has_data', 'true') = 'false' THEN 'coming_soon'
        ELSE 'available'
      END AS status,
      ST_AsGeoJSON(ST_Centroid(geom)) AS centroid,
      bbox,
      ST_AsGeoJSON(geom) AS geometry
    FROM boundaries.single_tier
  ) municipalities
`;

const boundaryController = {
  async getMunicipalities(req, res) {
    try {
      const { search = "", tierType } = req.query;
      const { limit, offset, page } = getPagination(req.query, 200);
      const normalizedTierType = normalizeTierType(tierType);
      const normalizedSearch = String(search || "").trim();

      const [rows] = await sequelize.query(
        `${MUNICIPALITY_UNION_SQL}
        WHERE (:tierType::TEXT IS NULL OR "tierType" = :tierType)
          AND (
            :search::TEXT = ''
            OR name ILIKE '%' || :search || '%'
          )
        ORDER BY name ASC
        LIMIT :limit OFFSET :offset;
      `,
        {
          replacements: {
            search: normalizedSearch,
            tierType: normalizedTierType,
            limit,
            offset,
          },
        }
      );

      res.json({
        success: true,
        data: rows.map((item) => ({
          id: item.id,
          name: item.name,
          tierType: item.tierType,
          parentName: item.parentName,
          province: item.province,
          status: item.status,
          hasData: item.hasData,
          centroid: parseCentroid(item.centroid),
          bbox: item.bbox || null,
        })),
        pagination: {
          page,
          limit,
          count: rows.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch municipalities",
        error: error.message,
      });
    }
  },

  async getMunicipalityById(req, res) {
    try {
      const rawId = String(req.params.id || "").trim();
      const municipalityId = String(rawId.includes(":") ? rawId.split(":")[1] : rawId).trim();
      const explicitTierType = normalizeTierType(
        req.query.tierType || (rawId.includes(":") ? rawId.split(":")[0] : null)
      );

      if (!municipalityId) {
        return res.status(400).json({
          success: false,
          message: "Invalid municipality id",
        });
      }

      const [rows] = await sequelize.query(
        `${MUNICIPALITY_UNION_SQL}
        WHERE id = :municipalityId
          AND (:tierType::TEXT IS NULL OR "tierType" = :tierType)
        LIMIT 1;
      `,
        {
          replacements: {
            municipalityId,
            tierType: explicitTierType,
          },
        }
      );

      const municipality = rows?.[0];
      if (!municipality) {
        return res.status(404).json({
          success: false,
          message: "Municipality not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: municipality.id,
          name: municipality.name,
          tierType: municipality.tierType,
          parentName: municipality.parentName,
          province: municipality.province,
          centroid: parseCentroid(municipality.centroid),
          geometry: municipality.geometry ? JSON.parse(municipality.geometry) : null,
          bbox: municipality.bbox || null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch municipality",
        error: error.message,
      });
    }
  },

  async getUpperTiers(req, res) {
    try {
      const data = await UpperTier.findAll({ order: [["admin_name", "ASC"]] });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch upper tiers", error: error.message });
    }
  },

  async getUpperTierById(req, res) {
    try {
      const data = await UpperTier.findByPk(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Upper tier not found" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch upper tier", error: error.message });
    }
  },

  async getLowerTiers(req, res) {
    try {
      const where = req.query.upperTierId ? { upper_tier_id: req.query.upperTierId } : {};
      const data = await LowerTier.findAll({ where, order: [["admin_name", "ASC"]] });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch lower tiers", error: error.message });
    }
  },

  async getLowerTierById(req, res) {
    try {
      const data = await LowerTier.findByPk(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Lower tier not found" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch lower tier", error: error.message });
    }
  },

  async getSingleTiers(req, res) {
    try {
      const data = await SingleTier.findAll({ order: [["admin_name", "ASC"]] });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch single tiers", error: error.message });
    }
  },

  async getSingleTierById(req, res) {
    try {
      const data = await SingleTier.findByPk(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Single tier not found" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch single tier", error: error.message });
    }
  },

  async getWards(req, res) {
    try {
      const where = {};
      if (req.query.lowerTierId) where.lower_tier_id = req.query.lowerTierId;
      if (req.query.singleTierId) where.single_tier_id = req.query.singleTierId;
      const data = await Ward.findAll({ where, order: [["ward_number", "ASC"]] });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch wards", error: error.message });
    }
  },

  async getWardById(req, res) {
    try {
      const data = await Ward.findByPk(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Ward not found" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch ward", error: error.message });
    }
  },

  async getUpperTierChildren(req, res) {
    try {
      const data = await LowerTier.findAll({
        where: { upper_tier_id: req.params.id },
        order: [["admin_name", "ASC"]],
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch upper tier children",
        error: error.message,
      });
    }
  },

  async getMunicipalityWards(req, res) {
    try {
      const municipalityId = Number(req.params.id);
      const where = Number.isFinite(municipalityId)
        ? {
            [Op.or]: [
              { lower_tier_id: municipalityId },
              { single_tier_id: municipalityId },
            ],
          }
        : {};

      const data = await Ward.findAll({
        where,
        order: [["ward_number", "ASC"]],
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch municipality wards",
        error: error.message,
      });
    }
  },

  async findByPoint(req, res) {
    try {
      const latitude = Number(req.body.latitude ?? req.body.lat);
      const longitude = Number(req.body.longitude ?? req.body.lon ?? req.body.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({
          success: false,
          message: "latitude and longitude are required",
        });
      }

      const [rows] = await sequelize.query(
        `
        SELECT tier_type AS "tierType", municipality_id::TEXT AS id, admin_name AS name, parent_name AS "parentName", province
        FROM boundaries.all_municipalities
        WHERE ST_Contains(geom, ST_SetSRID(ST_Point(:longitude, :latitude), 4326))
        ORDER BY CASE tier_type
          WHEN 'lower_tier' THEN 1
          WHEN 'single_tier' THEN 2
          ELSE 3
        END
        LIMIT 1;
      `,
        { replacements: { longitude, latitude } }
      );

      res.json({
        success: true,
        data: rows?.[0] || null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Point query failed", error: error.message });
    }
  },

  async findByBbox(req, res) {
    try {
      const bbox = Array.isArray(req.body.bbox)
        ? req.body.bbox.map(Number)
        : [req.body.minX, req.body.minY, req.body.maxX, req.body.maxY].map(Number);

      const [minX, minY, maxX, maxY] = bbox;
      if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
        return res.status(400).json({
          success: false,
          message: "bbox is required as [minX, minY, maxX, maxY]",
        });
      }

      const [rows] = await sequelize.query(
        `
        SELECT tier_type AS "tierType", municipality_id::TEXT AS id, admin_name AS name, parent_name AS "parentName", province
        FROM boundaries.all_municipalities
        WHERE ST_Intersects(
          geom,
          ST_MakeEnvelope(:minX, :minY, :maxX, :maxY, 4326)
        )
        ORDER BY name ASC
        LIMIT 500;
      `,
        { replacements: { minX, minY, maxX, maxY } }
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: "BBox query failed", error: error.message });
    }
  },

  async search(req, res) {
    try {
      const q = String(req.query.q || "").trim();
      const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 200));
      if (!q) {
        return res.json({ success: true, data: [] });
      }

      const [rows] = await sequelize.query(
        `
        SELECT tier_type AS "tierType", municipality_id::TEXT AS id, admin_name AS name, parent_name AS "parentName", province
        FROM boundaries.all_municipalities
        WHERE admin_name ILIKE '%' || :query || '%'
        ORDER BY admin_name ASC
        LIMIT :limit;
      `,
        {
          replacements: {
            query: q,
            limit,
          },
        }
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: "Search failed", error: error.message });
    }
  },

  async validatePolygon(req, res) {
    try {
      const result = await validateGeometryWithinJurisdiction({
        geometry: req.body?.geometry,
        jurisdictionName: req.body?.jurisdictionName || req.user?.jurisdiction,
        jurisdictionGeometry: req.body?.jurisdictionGeometry,
      });

      if (!result.valid) {
        return res.status(422).json({
          success: false,
          data: result,
          message: result.reason,
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Polygon validation failed",
        error: error.message,
      });
    }
  },
};

module.exports = boundaryController;
