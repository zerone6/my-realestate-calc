package com.realestate.calc.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.realestate.calc.mlit.MlitPriceIngestService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/mlit/prices")
public class MlitPriceSearchController {
    private final JdbcTemplate jdbc;
    private final MlitPriceIngestService ingestService;
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String JOIN_QUERY_LOG = " JOIN mlit_price_query_log q ON r.query_id=q.id";

    public MlitPriceSearchController(JdbcTemplate jdbc, MlitPriceIngestService ingestService) {
        this.jdbc = jdbc;
        this.ingestService = ingestService;
    }

    @GetMapping(value = "/list", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> list(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String station,
            @RequestParam(required = false, name = "prefecture") String prefecture,
            @RequestParam(required = false, name = "municipality") String municipality,
            @RequestParam(required = false, name = "districtName") String districtName,
            @RequestParam(required = false, name = "startYear") String startYear,
            @RequestParam(required = false, name = "endYear") String endYear,
            @RequestParam(required = false, name = "priceClassification") String priceClassification,
            @RequestParam(required = false, name = "quarter") String quarter,
            // additional filters for table alignment
            @RequestParam(required = false, name = "type") String type,
            @RequestParam(required = false, name = "floorPlan") String floorPlan,
            @RequestParam(required = false, name = "buildingYear") String buildingYear,
            @RequestParam(required = false, name = "structure") String structure,
            @RequestParam(required = false, name = "minTradePrice") String minTradePrice,
            @RequestParam(required = false, name = "maxTradePrice") String maxTradePrice,
            @RequestParam(required = false, name = "minLandArea") String minLandArea,
            @RequestParam(required = false, name = "minExclusiveArea") String minExclusiveArea,
            @RequestParam(required = false, name = "mode") String mode,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        int pageSize = normalizeSize(size);
        int offset = Math.max(page, 0) * pageSize;

        Filters f = new Filters();
        f.area = area;
        f.city = city;
        f.station = station;
        f.prefecture = prefecture;
        f.municipality = municipality;
        f.districtName = districtName;
        f.startYear = startYear;
        f.endYear = endYear;
        f.priceClassification = priceClassification;
        f.quarter = quarter;
        f.type = type;
        f.floorPlan = floorPlan;
        f.buildingYear = buildingYear;
        f.structure = structure;
        f.minTradePrice = minTradePrice;
        f.maxTradePrice = maxTradePrice;
        f.minLandArea = minLandArea;
        f.minExclusiveArea = minExclusiveArea;
        String m = (mode == null || mode.isBlank()) ? "SERVICE" : mode.trim().toUpperCase();

        // DB-only path
        if ("DB".equals(m)) {
            WhereArgs where = buildWhere(f);
            int total = countTotal(where);
            List<Object[]> rows = fetchRows(where, pageSize, offset);
            String response = buildListResponse(rows, total, page, pageSize, "DB");
            return ResponseEntity.ok(response);
        }

        // MLIT: always fetch from MLIT for the given scope/year(s), then read from DB
        if ("MLIT".equals(m)) {
            ingestForFilters(f);
            WhereArgs where = buildWhere(f);
            int total = countTotal(where);
            List<Object[]> rows = fetchRows(where, pageSize, offset);
            String response = buildListResponse(rows, total, page, pageSize, "MLIT");
            return ResponseEntity.ok(response);
        }

        // SERVICE: DB-first; if empty, backfill from MLIT, then return with appropriate
        // source
        WhereArgs where = buildWhere(f);
        int total = countTotal(where);
        if (total > 0) {
            List<Object[]> rows = fetchRows(where, pageSize, offset);
            String response = buildListResponse(rows, total, page, pageSize, "SERVICE=DB");
            return ResponseEntity.ok(response);
        }
        // No data in DB for this scope; attempt backfill via MLIT
        ingestForFilters(f);
        where = buildWhere(f);
        total = countTotal(where);
        List<Object[]> rows = fetchRows(where, pageSize, offset);
        String response = buildListResponse(rows, total, page, pageSize, "SERVICE=MLIT");
        return ResponseEntity.ok(response);
    }

    private int countTotal(WhereArgs built) {
        String sql = "SELECT COUNT(*) FROM mlit_price_record r" + JOIN_QUERY_LOG
                + built.where;
        Integer total = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            for (int i = 0; i < built.args.size(); i++)
                ps.setObject(i + 1, built.args.get(i));
            return ps;
        }, rs -> rs.next() ? rs.getInt(1) : 0);
        return total == null ? 0 : total;
    }

    private List<Object[]> fetchRows(WhereArgs built, int pageSize, int offset) {
        String selectSql = "SELECT r.id, q.year, q.quarter, " +
                "COALESCE(LPAD(q.price_classification, 2, '0'), CASE WHEN r.price_category LIKE '%成約%' THEN '02' WHEN r.price_category LIKE '%取引%' THEN '01' ELSE NULL END) AS price_classification, "
                +
                "CASE WHEN COALESCE(LPAD(q.price_classification, 2, '0'), CASE WHEN r.price_category LIKE '%成約%' THEN '02' WHEN r.price_category LIKE '%取引%' THEN '01' ELSE NULL END) = '02' THEN '成約価格' "
                +
                "     WHEN COALESCE(LPAD(q.price_classification, 2, '0'), CASE WHEN r.price_category LIKE '%成約%' THEN '02' WHEN r.price_category LIKE '%取引%' THEN '01' ELSE NULL END) = '01' THEN '取引価格' "
                +
                "     ELSE NULL END AS price_classification_label, " +
                "r.prefecture, r.municipality, r.district_name, r.period, " +
                // additional columns for new table (structure included; drop
                // coverage/floor_area ratios for list)
                "r.type, r.trade_price_int, r.floor_plan, r.area_num, r.total_floor_area_num, r.building_year, r.structure "
                +
                "FROM mlit_price_record r" + JOIN_QUERY_LOG + built.where +
                " ORDER BY q.year::int DESC NULLS LAST, " +
                "COALESCE(q.quarter::int, NULLIF((regexp_match(r.period, '第([0-9])四半期'))[1], '')::int) DESC NULLS LAST, "
                +
                "r.id DESC LIMIT ? OFFSET ?";
        return jdbc.query(con -> {
            var ps = con.prepareStatement(selectSql);
            int idx = 1;
            for (Object a : built.args)
                ps.setObject(idx++, a);
            ps.setInt(idx++, pageSize);
            ps.setInt(idx, offset);
            return ps;
        }, rs -> {
            var list = new ArrayList<Object[]>();
            while (rs.next()) {
                list.add(new Object[] { rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9),
                        rs.getString(10), rs.getObject(11), rs.getString(12), rs.getObject(13), rs.getObject(14),
                        rs.getString(15), rs.getString(16) });
            }
            return list;
        });
    }

    private String buildListResponse(List<Object[]> rows, int total, int page, int pageSize, String source) {
        ObjectNode root = mapper.createObjectNode();
        root.put("status", "OK");
        root.put("source", source);
        root.put("page", Math.max(page, 0));
        root.put("size", pageSize);
        root.put("total", total);
        ArrayNode items = mapper.createArrayNode();
        if (rows == null)
            rows = java.util.List.of();
        for (Object[] r : rows) {
            ObjectNode n = mapper.createObjectNode();
            n.put("id", (Long) r[0]);
            n.put("year", (String) r[1]);
            String qv = deriveQuarter((String) r[2], (String) r[8]);
            if (qv == null)
                n.putNull("quarter");
            else
                n.put("quarter", qv);
            n.put("priceClassification", (String) r[3]);
            if (r[4] != null)
                n.put("priceClassificationLabel", (String) r[4]);
            else
                n.putNull("priceClassificationLabel");
            n.put("prefecture", (String) r[5]);
            n.put("municipality", (String) r[6]);
            n.put("districtName", (String) r[7]);
            // additional fields for table
            n.put("type", (String) r[9]);
            putNumAsString(n, "tradePrice", r[10]);
            n.put("floorPlan", (String) r[11]);
            putNumAsString(n, "landArea", r[12]);
            putNumAsString(n, "exclusiveArea", r[13]);
            n.put("buildingYear", (String) r[14]);
            n.put("structure", (String) r[15]);
            items.add(n);
        }
        root.set("items", items);
        return root.toString();
    }

    private String deriveQuarter(String qv, String period) {
        if (qv != null && !qv.isBlank())
            return qv;
        if (period == null || period.isBlank())
            return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("第(\\d+)四半期").matcher(period);
        if (m.find())
            return m.group(1);
        return null;
    }

    private static class WhereArgs {
        final StringBuilder where;
        final List<Object> args;

        private WhereArgs(StringBuilder where, List<Object> args) {
            this.where = where;
            this.args = args;
        }
    }

    private static class Filters {
        String area;
        String city;
        String station;
        String prefecture;
        String municipality;
        String districtName;
        String startYear;
        String endYear;
        String priceClassification;
        String quarter;
        String type;
        String floorPlan;
        String buildingYear;
        String structure;
        String minTradePrice;
        String maxTradePrice;
        String minLandArea;
        String minExclusiveArea;
    }

    private void ingestForFilters(Filters f) {
        int[] yr = normalizeYearRange(f.startYear, f.endYear);
        if (yr.length == 0)
            return;
        java.util.List<String> classes = resolveClasses(f.priceClassification);
        for (int y = yr[0]; y <= yr[1]; y++)
            ingestForYearAndClasses(f, y, classes);
    }

    private void ingestForYearAndClasses(Filters f, int year, java.util.List<String> classes) {
        for (String pc : classes) {
            java.util.Map<String, String> params = new java.util.HashMap<>();
            putIfNotBlank(params, "area", f.area);
            putIfNotBlank(params, "city", f.city);
            putIfNotBlank(params, "station", f.station);
            params.put("year", String.valueOf(year));
            params.put("priceClassification", pc);
            try {
                ingestService.ingest(params);
            } catch (Exception ignored) {
                // best-effort
            }
        }
    }

    private static void putIfNotBlank(java.util.Map<String, String> m, String k, String v) {
        if (notBlank(v))
            m.put(k, v);
    }

    private static java.util.List<String> resolveClasses(String priceClassification) {
        java.util.List<String> classes = new java.util.ArrayList<>();
        if (notBlank(priceClassification))
            classes.add(priceClassification);
        else {
            classes.add("01");
            classes.add("02");
        }
        return classes;
    }

    private static int[] normalizeYearRange(String startYear, String endYear) {
        int sy = parseIntSafe(startYear);
        int ey = parseIntSafe(endYear);
        if (sy <= 0 && ey <= 0)
            return new int[0];
        if (sy <= 0)
            sy = ey;
        if (ey <= 0)
            ey = sy;
        int start = Math.min(sy, ey);
        int end = Math.max(sy, ey);
        return new int[] { start, end };
    }

    private static int parseIntSafe(String s) {
        try {
            return (s == null || s.isBlank()) ? 0 : Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static WhereArgs buildWhere(Filters f) {
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        addLocationFilters(where, args, f);
        addYearFilters(where, args, f);
        addClassificationFilters(where, args, f);
        addExtraFilters(where, args, f);
        return new WhereArgs(where, args);
    }

    private static void addLocationFilters(StringBuilder where, List<Object> args, Filters f) {
        if (notBlank(f.city)) {
            where.append(" AND r.municipality_code = ?");
            args.add(f.city);
        }
        if (notBlank(f.area)) {
            where.append(" AND (q.area = ? OR r.municipality_code LIKE ?)");
            args.add(f.area);
            args.add(f.area + "%");
        }
        if (notBlank(f.station)) {
            where.append(" AND q.station = ?");
            args.add(f.station);
        }
        if (notBlank(f.prefecture)) {
            where.append(" AND r.prefecture = ?");
            args.add(f.prefecture);
        }
        if (notBlank(f.municipality)) {
            where.append(" AND r.municipality = ?");
            args.add(f.municipality);
        }
        if (notBlank(f.districtName)) {
            where.append(" AND r.district_name = ?");
            args.add(f.districtName);
        }
    }

    private static void addYearFilters(StringBuilder where, List<Object> args, Filters f) {
        if (notBlank(f.startYear)) {
            where.append(" AND q.year::int >= ?");
            args.add(Integer.parseInt(f.startYear));
        }
        if (notBlank(f.endYear)) {
            where.append(" AND q.year::int <= ?");
            args.add(Integer.parseInt(f.endYear));
        }
    }

    private static void addClassificationFilters(StringBuilder where, List<Object> args, Filters f) {
        if (notBlank(f.priceClassification)) {
            where.append(" AND q.price_classification = ?");
            args.add(f.priceClassification);
        }
        if (notBlank(f.quarter)) {
            where.append(" AND q.quarter = ?");
            args.add(f.quarter);
        }
    }

    private static void addExtraFilters(StringBuilder where, List<Object> args, Filters f) {
        if (notBlank(f.type)) {
            where.append(" AND r.type = ?");
            args.add(f.type);
        }
        if (notBlank(f.floorPlan)) {
            where.append(" AND r.floor_plan = ?");
            args.add(f.floorPlan);
        }
        if (notBlank(f.buildingYear)) {
            where.append(" AND r.building_year = ?");
            args.add(f.buildingYear);
        }
        if (notBlank(f.structure)) {
            where.append(" AND r.structure = ?");
            args.add(f.structure);
        }
        int minPrice = parseIntSafe(f.minTradePrice);
        if (minPrice > 0) {
            where.append(" AND COALESCE(r.trade_price_int, 0) >= ?");
            args.add(minPrice);
        }
        int maxPrice = parseIntSafe(f.maxTradePrice);
        if (maxPrice > 0) {
            where.append(" AND COALESCE(r.trade_price_int, 0) <= ?");
            args.add(maxPrice);
        }
        int minLand = parseIntSafe(f.minLandArea);
        if (minLand > 0) {
            where.append(" AND COALESCE(r.area_num, 0) >= ?");
            args.add(minLand);
        }
        int minEx = parseIntSafe(f.minExclusiveArea);
        if (minEx > 0) {
            where.append(" AND COALESCE(r.total_floor_area_num, 0) >= ?");
            args.add(minEx);
        }
    }

    @GetMapping(value = "/detail/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> detail(@PathVariable("id") long id) {
        String sql = "SELECT r.price_category, r.type, r.region, r.municipality_code, r.prefecture, r.municipality, r.district_name, "
                +
                "r.trade_price_int, r.price_per_unit_int, r.floor_plan, r.area_num, r.unit_price_int, r.land_shape, r.frontage, "
                +
                "r.total_floor_area_num, r.building_year, r.structure, r.use, r.purpose, r.direction, r.classification, r.breadth, "
                +
                "r.city_planning, r.coverage_ratio, r.floor_area_ratio, r.period, r.renovation, r.remarks " +
                "FROM mlit_price_record r WHERE r.id = ?";

        Object[] row = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            ps.setLong(1, id);
            return ps;
        }, rs -> rs.next() ? new Object[] {
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
                rs.getString(7),
                rs.getObject(8), rs.getObject(9), rs.getString(10), rs.getObject(11), rs.getObject(12),
                rs.getString(13), rs.getString(14),
                rs.getObject(15), rs.getString(16), rs.getString(17), rs.getString(18), rs.getString(19),
                rs.getString(20), rs.getString(21), rs.getString(22),
                rs.getString(23), rs.getString(24), rs.getString(25), rs.getString(26), rs.getString(27),
                rs.getString(28)
        } : null);

        if (row == null) {
            return ResponseEntity.status(404).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"status\":\"NOT_FOUND\"}");
        }

        ObjectNode root = mapper.createObjectNode();
        root.put("status", "OK");
        root.put("source", "DB");
        ObjectNode n = mapper.createObjectNode();
        n.put("PriceCategory", (String) row[0]);
        n.put("Type", (String) row[1]);
        n.put("Region", (String) row[2]);
        n.put("MunicipalityCode", (String) row[3]);
        n.put("Prefecture", (String) row[4]);
        n.put("Municipality", (String) row[5]);
        n.put("DistrictName", (String) row[6]);
        putNumAsString(n, "TradePrice", row[7]);
        putNumAsString(n, "PricePerUnit", row[8]);
        n.put("FloorPlan", (String) row[9]);
        putNumAsString(n, "Area", row[10]);
        putNumAsString(n, "UnitPrice", row[11]);
        n.put("LandShape", (String) row[12]);
        n.put("Frontage", (String) row[13]);
        putNumAsString(n, "TotalFloorArea", row[14]);
        n.put("BuildingYear", (String) row[15]);
        n.put("Structure", (String) row[16]);
        n.put("Use", (String) row[17]);
        n.put("Purpose", (String) row[18]);
        n.put("Direction", (String) row[19]);
        n.put("Classification", (String) row[20]);
        n.put("Breadth", (String) row[21]);
        n.put("CityPlanning", (String) row[22]);
        n.put("CoverageRatio", (String) row[23]);
        n.put("FloorAreaRatio", (String) row[24]);
        n.put("Period", (String) row[25]);
        n.put("Renovation", (String) row[26]);
        n.put("Remarks", (String) row[27]);
        root.set("record", n);
        return ResponseEntity.ok(root.toString());
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static void putNumAsString(ObjectNode n, String key, Object v) {
        if (v == null) {
            n.putNull(key);
            return;
        }
        n.put(key, String.valueOf(v));
    }

    private static int normalizeSize(int size) {
        if (size <= 10)
            return 10;
        if (size <= 20)
            return 20;
        if (size <= 30)
            return 30;
        if (size <= 50)
            return 50;
        return 100;
    }

    @GetMapping(value = "/districts", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<String>> listDistricts(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String city,
            @RequestParam(required = false, name = "prefecture") String prefecture,
            @RequestParam(required = false, name = "municipality") String municipality,
            @RequestParam(required = false, name = "startYear") String startYear,
            @RequestParam(required = false, name = "endYear") String endYear) {
        Filters f = new Filters();
        f.area = area;
        f.city = city;
        f.prefecture = prefecture;
        f.municipality = municipality;
        f.startYear = startYear;
        f.endYear = endYear;
        // do not set districtName/quarter/classification to keep listing broad
        WhereArgs built = buildWhere(f);
        String sql = "SELECT DISTINCT r.district_name FROM mlit_price_record r " +
                JOIN_QUERY_LOG + built.where + " ORDER BY r.district_name";
        List<String> names = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            int idx = 1;
            for (Object a : built.args)
                ps.setObject(idx++, a);
            return ps;
        }, (rs, i) -> rs.getString(1));
        return ResponseEntity.ok(names);
    }

    @GetMapping(value = "/facets", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ObjectNode> listFacets(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String station,
            @RequestParam(required = false, name = "startYear") String startYear,
            @RequestParam(required = false, name = "endYear") String endYear,
            @RequestParam(required = false, name = "priceClassification") String priceClassification) {
        // Build base WHERE from dataset scope; ignore client-side list filters.
        Filters f = new Filters();
        f.area = area;
        f.city = city;
        f.station = station;
        f.startYear = startYear;
        f.endYear = endYear;
        f.priceClassification = priceClassification;
        WhereArgs built = buildWhere(f);

        ObjectNode out = mapper.createObjectNode();
        out.set("years", toNumberArray(distinctYears(built)));
        out.set("quarters", toNumberArray(distinctQuarters(built)));
        out.set("prefectures", toStringArray(distinctStrings(built, "r.prefecture", "r.prefecture")));
        out.set("municipalities", toStringArray(distinctStrings(built, "r.municipality", "r.municipality")));
        out.set("districts", toStringArray(distinctStrings(built, "r.district_name", "r.district_name")));
        // additional facets for new filters
        out.set("types", toStringArray(distinctStrings(built, "r.type", "r.type")));
        out.set("floorPlans", toStringArray(distinctStrings(built, "r.floor_plan", "r.floor_plan")));
        out.set("buildingYears", toStringArray(distinctStrings(built, "r.building_year", "r.building_year")));
        out.set("structures", toStringArray(distinctStrings(built, "r.structure", "r.structure")));
        return ResponseEntity.ok(out);
    }

    private List<Integer> distinctYears(WhereArgs built) {
        String sql = "SELECT DISTINCT q.year::int y FROM mlit_price_record r " + JOIN_QUERY_LOG + built.where +
                " ORDER BY y DESC";
        return queryDistinctInts(sql, built);
    }

    private List<Integer> distinctQuarters(WhereArgs built) {
        String sql = "SELECT DISTINCT COALESCE(q.quarter::int, NULLIF((regexp_match(r.period, '第([0-9])四半期'))[1], '')::int) q "
                +
                "FROM mlit_price_record r" + JOIN_QUERY_LOG + built.where +
                " AND (q.quarter IS NOT NULL OR r.period ~ '第([0-9])四半期') ORDER BY q DESC";
        return queryDistinctInts(sql, built);
    }

    private List<String> distinctStrings(WhereArgs built, String column, String orderBy) {
        String sql = "SELECT DISTINCT " + column + " FROM mlit_price_record r" + JOIN_QUERY_LOG + built.where +
                " ORDER BY " + orderBy;
        return queryDistinctStrings(sql, built);
    }

    private List<Integer> queryDistinctInts(String sql, WhereArgs built) {
        return jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            int idx = 1;
            for (Object a : built.args)
                ps.setObject(idx++, a);
            return ps;
        }, (rs, i) -> rs.getInt(1));
    }

    private List<String> queryDistinctStrings(String sql, WhereArgs built) {
        return jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            int idx = 1;
            for (Object a : built.args)
                ps.setObject(idx++, a);
            return ps;
        }, (rs, i) -> rs.getString(1));
    }

    private ArrayNode toNumberArray(List<Integer> list) {
        ArrayNode node = mapper.createArrayNode();
        for (Integer v : list) {
            if (v != null)
                node.add(v);
        }
        return node;
    }

    private ArrayNode toStringArray(List<String> list) {
        ArrayNode node = mapper.createArrayNode();
        for (String v : list) {
            if (v != null)
                node.add(v);
        }
        return node;
    }
}
