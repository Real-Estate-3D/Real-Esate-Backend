const { sequelize } = require("../models");

const extractGeometry = (input) => {
  if (!input || typeof input !== "object") return null;

  if (input.type === "Feature") {
    return input.geometry || null;
  }
  if (input.type === "FeatureCollection") {
    return input.features?.[0]?.geometry || null;
  }
  if (input.type && input.coordinates) {
    return input;
  }
  if (input.geometry && input.geometry.type) {
    return input.geometry;
  }
  return null;
};

const runDirectGeometryValidation = async ({
  geometryText,
  jurisdictionGeometryText,
  jurisdictionLabel,
}) => {
  const [rows] = await sequelize.query(
    `
    SELECT
      :jurisdictionLabel::TEXT AS jurisdiction,
      ST_CoveredBy(
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geometryText), 4326)),
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:jurisdictionGeometryText), 4326))
      ) AS valid;
  `,
    {
      replacements: {
        geometryText,
        jurisdictionGeometryText,
        jurisdictionLabel,
      },
    }
  );

  return rows?.[0] || null;
};

const runNamedJurisdictionValidation = async ({
  geometryText,
  jurisdictionName,
  source = "base_tables",
}) => {
  const sourceSql =
    source === "all_municipalities"
      ? `SELECT admin_name, geom FROM boundaries.all_municipalities`
      : `
        SELECT admin_name, geom FROM boundaries.upper_tier
        UNION ALL
        SELECT admin_name, geom FROM boundaries.lower_tier
        UNION ALL
        SELECT admin_name, geom FROM boundaries.single_tier
      `;

  const [rows] = await sequelize.query(
    `
    WITH municipality_union AS (
      ${sourceSql}
    ),
    jurisdiction_match AS (
      SELECT admin_name, geom
      FROM municipality_union
      WHERE LOWER(admin_name) = LOWER(:jurisdictionName)
      LIMIT 1
    )
    SELECT
      COALESCE((SELECT admin_name FROM jurisdiction_match), NULL) AS jurisdiction,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM jurisdiction_match) THEN FALSE
        ELSE (
          SELECT ST_CoveredBy(
            ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geometryText), 4326)),
            ST_MakeValid(geom)
          )
          FROM jurisdiction_match
          LIMIT 1
        )
      END AS valid;
  `,
    {
      replacements: {
        jurisdictionName,
        geometryText,
      },
    }
  );

  return rows?.[0] || null;
};

const validateGeometryWithinJurisdiction = async ({
  geometry,
  jurisdictionName,
  jurisdictionGeometry,
}) => {
  const normalizedJurisdiction = String(jurisdictionName || "").trim();
  const normalizedGeometry = extractGeometry(geometry);
  if (!normalizedGeometry) {
    return {
      valid: false,
      reason: "Invalid or missing polygon geometry",
      jurisdiction: normalizedJurisdiction || null,
    };
  }

  const geometryText = JSON.stringify(normalizedGeometry);
  const normalizedJurisdictionGeometry = extractGeometry(jurisdictionGeometry);

  if (normalizedJurisdictionGeometry) {
    try {
      const directResult = await runDirectGeometryValidation({
        geometryText,
        jurisdictionGeometryText: JSON.stringify(normalizedJurisdictionGeometry),
        jurisdictionLabel: normalizedJurisdiction || "selected_jurisdiction",
      });

      if (directResult && directResult.valid) {
        return {
          valid: true,
          jurisdiction: directResult.jurisdiction || normalizedJurisdiction || null,
        };
      }

      if (directResult && directResult.valid === false) {
        return {
          valid: false,
          reason: "Polygon is outside the selected jurisdiction boundary",
          jurisdiction: directResult.jurisdiction || normalizedJurisdiction || null,
        };
      }
    } catch (error) {
      console.warn("Direct jurisdiction geometry validation failed:", error.message);
    }
  }

  if (!normalizedJurisdiction) {
    return {
      valid: false,
      reason: "Missing assigned jurisdiction for current user",
      jurisdiction: null,
    };
  }

  const sources = ["base_tables", "all_municipalities"];
  let result = null;
  let lastError = null;

  for (const source of sources) {
    try {
      result = await runNamedJurisdictionValidation({
        geometryText,
        jurisdictionName: normalizedJurisdiction,
        source,
      });
      if (result) break;
    } catch (error) {
      lastError = error;
      console.warn(`Jurisdiction validation failed using ${source}:`, error.message);
    }
  }

  if (!result) {
    return {
      valid: false,
      reason:
        "Unable to validate polygon against jurisdiction boundary data at this time",
      jurisdiction: normalizedJurisdiction,
      error: lastError?.message,
    };
  }

  if (!result.jurisdiction) {
    return {
      valid: false,
      reason: `Assigned jurisdiction "${normalizedJurisdiction}" was not found in boundary data`,
      jurisdiction: normalizedJurisdiction,
    };
  }

  if (!result.valid) {
    return {
      valid: false,
      reason: "Polygon is outside the assigned jurisdiction",
      jurisdiction: result.jurisdiction,
    };
  }

  return {
    valid: true,
    jurisdiction: result.jurisdiction,
  };
};

module.exports = {
  extractGeometry,
  validateGeometryWithinJurisdiction,
};
