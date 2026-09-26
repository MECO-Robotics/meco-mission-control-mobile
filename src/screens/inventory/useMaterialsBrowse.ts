import { useMemo, useState } from "react";
import type { ManufacturingItem, PurchaseItem } from "../../types/domain";
import { inferMaterialCategory } from "../../ui/helpers";
import type { MaterialRollup } from "../../ui/types";

type Filters = { search: string; category: string; stock: string };
type Inputs = { manufacturingItems: ManufacturingItem[]; purchaseItems: PurchaseItem[] };

export function useMaterialsBrowse({ manufacturingItems, purchaseItems }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "", category: "all", stock: "all" });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const materialRollups = useMemo(() => {
    const rows: MaterialRollup[] = [];

    for (const materialName of new Set(manufacturingItems.map((item) => item.material))) {
      const relatedManufacturing = manufacturingItems.filter(
        (item) => item.material === materialName,
      );
      const relatedPurchases = purchaseItems.filter((item) => {
        const text = `${item.title} ${item.vendor} ${item.linkLabel}`.toLowerCase();
        return materialName
          .toLowerCase()
          .split(" ")
          .some((token) => token.length > 3 && text.includes(token));
      });

      const openDemand = relatedManufacturing
        .filter((item) => item.status !== "complete")
        .reduce((sum, item) => sum + item.quantity, 0);
      const supplied = relatedPurchases
        .filter((item) => item.status === "delivered" || item.status === "purchased")
        .reduce((sum, item) => sum + item.quantity, 0);
      const openPurchases = relatedPurchases.filter(
        (item) => item.status !== "delivered",
      );
      const openPurchaseQuantity = openPurchases.reduce((sum, item) => sum + item.quantity, 0);
      const reorderPoint = Math.max(1, Math.ceil(openDemand / 2));
      const onHand = Math.max(0, supplied - Math.ceil(openDemand * 0.35));
      const suggestedOrderQuantity = Math.max(
        0,
        reorderPoint + openDemand - onHand - openPurchaseQuantity,
      );
      const category = inferMaterialCategory(materialName);
      const vendor = relatedPurchases[0]?.vendor ?? "Mixed";

      rows.push({
        id: materialName.toLowerCase().replace(/\s+/g, "-"),
        name: materialName,
        category,
        onHand,
        reorderPoint,
        openDemand,
        openPurchaseCount: openPurchases.length,
        openPurchaseQuantity,
        suggestedOrderQuantity,
        vendor,
        stock: onHand <= reorderPoint ? "low" : "ok",
      });
    }

    return rows.sort((left, right) => left.name.localeCompare(right.name));
  }, [manufacturingItems, purchaseItems]);

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

  const summary = rows.reduce(
    (summary, row) => ({
      lowStockCount: summary.lowStockCount + (row.stock === "low" ? 1 : 0),
      suggestedRestockCount:
        summary.suggestedRestockCount + (row.suggestedOrderQuantity > 0 ? 1 : 0),
    }),
    { lowStockCount: 0, suggestedRestockCount: 0 },
  );

  return { filters, updateFilters, rows, summary };
}
