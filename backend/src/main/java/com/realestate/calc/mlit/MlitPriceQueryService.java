package com.realestate.calc.mlit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MlitPriceQueryService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public MlitPriceQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final String Q_YEAR = "q.year";
    private static final String Q_PRICE_CLASS = "q.price_classification";
    private static final String Q_QUARTER = "q.quarter";
    private static final String ORDER_BY_ID = " ORDER BY r.id";
    private static final String AND_OPEN = " AND (";

    public boolean existsForCity(String city, String year, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        sb.append(
                "SELECT 1 FROM mlit_price_record r JOIN mlit_price_query_log q ON r.query_id=q.id WHERE r.municipality_code=?");
        args.add(city);
        addFilter(sb, args, Q_YEAR, year);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        String existsSql = "SELECT EXISTS (" + sb + ")";
        Boolean exists = jdbc.query(con -> {
            var ps = con.prepareStatement(existsSql);
            for (int i = 0; i < args.size(); i++)
                ps.setObject(i + 1, args.get(i));
            return ps;
        }, rs -> rs.next() ? rs.getBoolean(1) : Boolean.FALSE);
        return Boolean.TRUE.equals(exists);
    }

    public boolean existsForArea(String area, String year, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        sb.append(
                "SELECT 1 FROM mlit_price_record r JOIN mlit_price_query_log q ON r.query_id=q.id WHERE (q.area=? OR r.municipality_code LIKE ?)");
        args.add(area);
        args.add(area + "%");
        addFilter(sb, args, Q_YEAR, year);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        String existsSql = "SELECT EXISTS (" + sb + ")";
        Boolean exists = jdbc.query(con -> {
            var ps = con.prepareStatement(existsSql);
            for (int i = 0; i < args.size(); i++)
                ps.setObject(i + 1, args.get(i));
            return ps;
        }, rs -> rs.next() ? rs.getBoolean(1) : Boolean.FALSE);
        return Boolean.TRUE.equals(exists);
    }

    public String jsonForCity(String city, String year, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        baseSelect(sb);
        sb.append(" WHERE r.municipality_code=?");
        args.add(city);
        addFilter(sb, args, Q_YEAR, year);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        sb.append(ORDER_BY_ID);
        return rowsToJson(sb.toString(), args);
    }

    /**
     * Year-range variant: filters rows where q.year::int is within
     * [startYear,endYear].
     * If both startYear and endYear are null/blank, behaves like single-year with
     * null year.
     */
    public String jsonForCityRange(String city, String startYear, String endYear, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        baseSelect(sb);
        sb.append(" WHERE r.municipality_code=?");
        args.add(city);
        addYearRangeFilter(sb, args, startYear, endYear);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        sb.append(ORDER_BY_ID);
        return rowsToJson(sb.toString(), args);
    }

    /**
     * Returns list of quarters (1..4) that are missing for a given
     * city/year/priceClass.
     * If year or priceClass is null/blank, returns empty (cannot determine
     * completeness).
     */
    public java.util.List<Integer> missingQuartersForCity(String city, String year, String priceClass) {
        if (city == null || city.isBlank() || year == null || year.isBlank() || priceClass == null
                || priceClass.isBlank()) {
            return java.util.List.of();
        }
        String sql = "SELECT DISTINCT q.quarter FROM mlit_price_record r JOIN mlit_price_query_log q ON r.query_id=q.id "
                + "WHERE r.municipality_code=? AND q.year=? AND q.price_classification=? AND q.quarter IS NOT NULL";
        var quarters = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            ps.setString(1, city);
            ps.setString(2, year);
            ps.setString(3, priceClass);
            return ps;
        }, rs -> {
            var set = new java.util.HashSet<Integer>();
            while (rs.next()) {
                String q = rs.getString(1);
                try {
                    if (q != null)
                        set.add(Integer.parseInt(q.trim()));
                } catch (NumberFormatException ignore) {
                    // Ignore unparsable quarter values from legacy data
                }
            }
            return set;
        });
        java.util.List<Integer> missing = new java.util.ArrayList<>();
        java.util.Set<Integer> had = (quarters != null) ? quarters : java.util.Set.of();
        for (int q = 1; q <= 4; q++) {
            if (!had.contains(q))
                missing.add(q);
        }
        return missing;
    }

    public String jsonForArea(String area, String year, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        baseSelect(sb);
        sb.append(" WHERE (q.area=? OR r.municipality_code LIKE ?)");
        args.add(area);
        args.add(area + "%");
        addFilter(sb, args, Q_YEAR, year);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        sb.append(ORDER_BY_ID);
        return rowsToJson(sb.toString(), args);
    }

    /** Year-range variant for prefecture scope. */
    public String jsonForAreaRange(String area, String startYear, String endYear, String priceClass, String quarter) {
        StringBuilder sb = new StringBuilder();
        List<Object> args = new ArrayList<>();
        baseSelect(sb);
        sb.append(" WHERE (q.area=? OR r.municipality_code LIKE ?)");
        args.add(area);
        args.add(area + "%");
        addYearRangeFilter(sb, args, startYear, endYear);
        addFilter(sb, args, Q_PRICE_CLASS, priceClass);
        addFilter(sb, args, Q_QUARTER, quarter);
        sb.append(ORDER_BY_ID);
        return rowsToJson(sb.toString(), args);
    }

    /**
     * Returns whether there exists at least one record for each quarter 1..4 within
     * a prefecture for a given year and priceClass.
     */
    public boolean hasAllQuartersForArea(String area, String year, String priceClass) {
        if (area == null || area.isBlank() || year == null || year.isBlank() || priceClass == null
                || priceClass.isBlank()) {
            return false;
        }
        String sql = "SELECT DISTINCT q.quarter FROM mlit_price_record r JOIN mlit_price_query_log q ON r.query_id=q.id "
                + "WHERE (q.area=? OR r.municipality_code LIKE ?) AND q.year=? AND q.price_classification=? AND q.quarter IS NOT NULL";
        var quarters = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            ps.setString(1, area);
            ps.setString(2, area + "%");
            ps.setString(3, year);
            ps.setString(4, priceClass);
            return ps;
        }, rs -> {
            var set = new java.util.HashSet<Integer>();
            while (rs.next()) {
                String q = rs.getString(1);
                try {
                    if (q != null)
                        set.add(Integer.parseInt(q.trim()));
                } catch (NumberFormatException ignore) {
                    // Ignore unparsable quarter values from legacy data
                }
            }
            return set;
        });
        java.util.Set<Integer> had = (quarters != null) ? quarters : java.util.Set.of();
        for (int q = 1; q <= 4; q++)
            if (!had.contains(q))
                return false;
        return true;
    }

    private void baseSelect(StringBuilder sb) {
        sb.append(
                "SELECT r.price_category, r.type, r.region, r.municipality_code, r.prefecture, r.municipality, r.district_name, ");
        sb.append(
                "r.trade_price_int, r.price_per_unit_int, r.floor_plan, r.area_num, r.unit_price_int, r.land_shape, r.frontage, ");
        sb.append(
                "r.total_floor_area_num, r.building_year, r.structure, r.use, r.purpose, r.direction, r.classification, r.breadth, ");
        sb.append("r.city_planning, r.coverage_ratio, r.floor_area_ratio, r.period, r.renovation, r.remarks ");
        sb.append("FROM mlit_price_record r JOIN mlit_price_query_log q ON r.query_id=q.id");
    }

    private void addFilter(StringBuilder sb, List<Object> args, String col, String val) {
        if (val != null && !val.isBlank()) {
            sb.append(" AND ").append(col).append(" = ?");
            args.add(val);
        }
    }

    private void addYearRangeFilter(StringBuilder sb, List<Object> args, String startYear, String endYear) {
        Integer s = parseYear(startYear);
        Integer e = parseYear(endYear);
        if (s != null && e != null) {
            sb.append(AND_OPEN).append(Q_YEAR).append("::int BETWEEN ? AND ?)");
            args.add(s);
            args.add(e);
        } else if (s != null) {
            sb.append(AND_OPEN).append(Q_YEAR).append("::int >= ?)");
            args.add(s);
        } else if (e != null) {
            sb.append(AND_OPEN).append(Q_YEAR).append("::int <= ?)");
            args.add(e);
        }
    }

    private Integer parseYear(String y) {
        if (y == null || y.isBlank())
            return null;
        try {
            return Integer.parseInt(y.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String rowsToJson(String sql, List<Object> args) {
        var rows = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            for (int i = 0; i < args.size(); i++)
                ps.setObject(i + 1, args.get(i));
            return ps;
        }, rs -> {
            var list = new java.util.ArrayList<Object[]>();
            while (rs.next()) {
                list.add(new Object[] {
                        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7),
                        rs.getObject(8), rs.getObject(9), rs.getString(10), rs.getObject(11), rs.getObject(12),
                        rs.getString(13), rs.getString(14),
                        rs.getObject(15), rs.getString(16), rs.getString(17), rs.getString(18), rs.getString(19),
                        rs.getString(20), rs.getString(21), rs.getString(22),
                        rs.getString(23), rs.getString(24), rs.getString(25), rs.getString(26), rs.getString(27),
                        rs.getString(28)
                });
            }
            return list;
        });
        ObjectNode root = mapper.createObjectNode();
        root.put("status", "OK");
        root.put("source", "DB");
        ArrayNode data = mapper.createArrayNode();
        for (Object[] r : (rows != null ? rows : java.util.List.<Object[]>of())) {
            ObjectNode n = mapper.createObjectNode();
            n.put("PriceCategory", (String) r[0]);
            n.put("Type", (String) r[1]);
            n.put("Region", (String) r[2]);
            n.put("MunicipalityCode", (String) r[3]);
            n.put("Prefecture", (String) r[4]);
            n.put("Municipality", (String) r[5]);
            n.put("DistrictName", (String) r[6]);
            putNumAsString(n, "TradePrice", r[7]);
            putNumAsString(n, "PricePerUnit", r[8]);
            n.put("FloorPlan", (String) r[9]);
            putNumAsString(n, "Area", r[10]);
            putNumAsString(n, "UnitPrice", r[11]);
            n.put("LandShape", (String) r[12]);
            n.put("Frontage", (String) r[13]);
            putNumAsString(n, "TotalFloorArea", r[14]);
            n.put("BuildingYear", (String) r[15]);
            n.put("Structure", (String) r[16]);
            n.put("Use", (String) r[17]);
            n.put("Purpose", (String) r[18]);
            n.put("Direction", (String) r[19]);
            n.put("Classification", (String) r[20]);
            n.put("Breadth", (String) r[21]);
            n.put("CityPlanning", (String) r[22]);
            n.put("CoverageRatio", (String) r[23]);
            n.put("FloorAreaRatio", (String) r[24]);
            n.put("Period", (String) r[25]);
            n.put("Renovation", (String) r[26]);
            n.put("Remarks", (String) r[27]);
            data.add(n);
        }
        root.set("data", data);
        return root.toString();
    }

    private static void putNumAsString(ObjectNode n, String key, Object v) {
        if (v == null) {
            n.putNull(key);
            return;
        }
        String s = String.valueOf(v);
        n.put(key, s);
    }
}
