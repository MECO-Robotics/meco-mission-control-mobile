import type { AppScreenProps } from "./types";
import { InventoryMaterialsScreen } from "./InventoryMaterialsScreen";
import { InventoryPartsScreen } from "./InventoryPartsScreen";
import { InventoryPurchasesScreen } from "./InventoryPurchasesScreen";

export function InventoryScreen(props: AppScreenProps) {
  const { inventoryView } = props;

  return (
    <>
      {inventoryView === "materials"
        ? <InventoryMaterialsScreen {...props} />
        : inventoryView === "parts"
          ? <InventoryPartsScreen {...props} />
          : <InventoryPurchasesScreen {...props} />}
    </>
  );
}
