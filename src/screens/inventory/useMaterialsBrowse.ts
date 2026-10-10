import { useMemo, useState } from "react";
import type { Material, PurchaseItem } from "../../types/domain";
import type { MaterialRollup } from "../../ui/types";

type Filters = { search: string; category: string; stock: string };
type Inputs = { materials: Material[]; purchaseItems: PurchaseItem[] };

export function useMaterialsBrowse({ materials, purchaseItems }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "", category: "all", stock: "all" });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const materialRollups = useMemo(() => {
    const rows: MaterialRollup[] = [];

    for (const material of materials) {
      const relatedPurchases = purchaseItems.filter((item) => item.materialId === material.id);
      const openPurchases = relatedPurchases.filter((item) => !["delivered", "cancelled"].includes(item.orderStatus));
      const openPurchaseQuantity = openPurchases.reduce((sum, item) => sum + item.quantity, 0);
      rows.push({
        id: material.id,
        name: material.name,
        category: material.category,
        onHand: material.onHandQuantity,
        reorderPoint: material.reorderPoint,
        openDemand: 0,
        openPurchaseCount: openPurchases.length,
        openPurchaseQuantity,
        suggestedOrderQuantity: Math.max(0, material.reorderPoint - material.onHandQuantity - openPurchaseQuantity),
        vendor: "See purchasing records",
        stock: material.onHandQuantity <= material.reorderPoint ? "low" : "ok",
      });
    }

    return rows.sort((left, right) => left.name.localeCompare(right.name));
  }, [materials, purchaseItems]);

  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return materialRollups.filter((row) => {
      if (filters.category !== "all" && row.category !== filters.category) {
        return false;
      }

      if (filters.stock !== "all" && row.stock !== filters.stock) {
        return false;
      }

      if (!search) {
        return true;
      }

      return `${row.name} ${row.vendor} ${row.category}`.toLowerCase().includes(search);
    });
  }, [materialRollups, filters]);

  const summary = useMemo(() => rows.reduce(
    (summary, row) => ({
      lowStockCount: summary.lowStockCount + (row.stock === "low" ? 1 : 0),
      suggestedRestockCount:
        summary.suggestedRestockCount + (row.suggestedOrderQuantity > 0 ? 1 : 0),
    }),
    { lowStockCount: 0, suggestedRestockCount: 0 },
  ), [rows]);

  return { filters, updateFilters, rows, summary };
}
