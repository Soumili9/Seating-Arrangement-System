import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Filter, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, SearchX, X,
} from "lucide-react";

const COLUMNS = [
  { key: "Department", label: "Department", align: "left" },
  { key: "Room Allocated", label: "Room Allocated", align: "left" },
  { key: "Allocated Strength", label: "Allocated Strength", align: "center" },
  { key: "Room Capacity", label: "Room Capacity", align: "center" },
];

export default function ResultsTable({ rows }) {
  const [sorting, setSorting] = useState([{ id: "Department", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const columns = useMemo(
    () =>
      COLUMNS.map((c) => ({
        accessorKey: c.key,
        header: c.label,
        meta: { align: c.align },
        sortingFn:
          c.key === "Allocated Strength" || c.key === "Room Capacity" ? "alphanumeric" : "text",
        filterFn: "includesString",
      })),
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: 10 } },
  });

  const s = {
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" },
    search: { flex: "1 1 220px", padding: "9px 14px", background: "rgba(14,12,17,0.8)", border: "1px solid #2e2a38", borderRadius: 12, color: "#f5f3f7", fontSize: "0.82rem", outline: "none", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
    toolBtn: { background: "transparent", border: "1px solid #2e2a38", color: "#a8a3b0", borderRadius: 999, padding: "9px 16px", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', 'Segoe UI', sans-serif", whiteSpace: "nowrap" },
    toolBtnActive: { background: "rgba(255,107,71,0.12)", border: "1px solid #ff6b47", color: "#ff6b47", borderRadius: 999, padding: "9px 16px", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', 'Segoe UI', sans-serif", whiteSpace: "nowrap" },
    scrollArea: { maxHeight: 420, overflow: "auto", border: "1px solid #2e2a38", borderRadius: 12 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
    th: { padding: "11px 14px", textAlign: "left", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff6b47", borderBottom: "1px solid #2e2a38", fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: "normal", position: "sticky", top: 0, background: "#18151d", cursor: "pointer", userSelect: "none", zIndex: 2 },
    filterRow: { position: "sticky", top: 38, background: "#18151d", zIndex: 2 },
    filterCell: { padding: "6px 10px", borderBottom: "1px solid #2e2a38" },
    filterInput: { width: "100%", padding: "5px 8px", background: "rgba(14,12,17,0.9)", border: "1px solid #2e2a38", borderRadius: 12, color: "#e5e1ea", fontSize: "0.72rem", outline: "none", boxSizing: "border-box" },
    td: (i) => ({ padding: "9px 14px", borderBottom: "1px solid rgba(38,34,46,0.5)", color: "#e5e1ea", background: i % 2 === 0 ? "rgba(16,14,20,0.4)" : "transparent" }),
    empty: { padding: "30px 14px", textAlign: "center", color: "#4a4454", fontSize: "0.8rem" },
    pager: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 10 },
    pagerBtn: (disabled) => ({ background: "transparent", border: "1px solid #2e2a38", color: disabled ? "#332f3c" : "#a8a3b0", borderRadius: 999, padding: "6px 12px", fontSize: "0.7rem", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', 'Segoe UI', sans-serif" }),
    pagerInfo: { fontSize: "0.7rem", color: "#9691a0", letterSpacing: "0.05em" },
    select: { padding: "6px 10px", background: "rgba(14,12,17,0.8)", border: "1px solid #2e2a38", borderRadius: 12, color: "#a8a3b0", fontSize: "0.7rem", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  };

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.search}
          placeholder="Search all columns…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <button style={showFilters ? s.toolBtnActive : s.toolBtn} onClick={() => setShowFilters((v) => !v)}>
          <Filter size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Column Filters
        </button>
      </div>

      <div style={s.scrollArea}>
        <table style={s.table}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const align = header.column.columnDef.meta?.align || "left";
                  const dir = header.column.getIsSorted();
                  return (
                    <th key={header.id} style={{ ...s.th, textAlign: align }} onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span style={{ marginLeft: 6, color: dir ? "#ff6b47" : "#3a3544", display: "inline-flex", verticalAlign: "-3px" }}>
                        {dir === "asc" ? <ChevronUp size={13} /> : dir === "desc" ? <ChevronDown size={13} /> : <ChevronsUpDown size={13} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
            {showFilters && (
              <tr style={s.filterRow}>
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <th key={header.id} style={s.filterCell}>
                    <input
                      style={s.filterInput}
                      placeholder="Filter…"
                      value={header.column.getFilterValue() ?? ""}
                      onChange={(e) => header.column.setFilterValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td style={s.empty} colSpan={COLUMNS.length}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <SearchX size={26} color="#3a3544" />
                    <div>No rows match your search or filters.</div>
                    {(globalFilter || columnFilters.length > 0) && (
                      <button
                        style={{ background: "none", border: "1px solid #2e2a38", color: "#a8a3b0", borderRadius: 12, padding: "5px 14px", fontSize: "0.7rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                        onClick={() => { setGlobalFilter(""); setColumnFilters([]); }}
                      >
                        <X size={12} /> Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ ...s.td(i), textAlign: cell.column.columnDef.meta?.align || "left" }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.pager}>
        <div style={s.pagerInfo}>
          {table.getFilteredRowModel().rows.length} row(s)
          {" · "}Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            style={s.select}
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button style={s.pagerBtn(!table.getCanPreviousPage())} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <ChevronLeft size={14} style={{ verticalAlign: "-3px" }} /> Prev
          </button>
          <button style={s.pagerBtn(!table.getCanNextPage())} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next <ChevronRight size={14} style={{ verticalAlign: "-3px" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
