import type { Inventory } from "@/types/inventory";

export function generateTxtContent(inventory: Inventory): string {
  return inventory.items
    .map((item) => `${item.ean};${item.quantity}`)
    .join("\n");
}

export function getTxtFilename(inventoryName: string): string {
  const sanitized = inventoryName.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `inventory-${sanitized}.txt`;
}

export async function shareTxt(
  inventory: Inventory
): Promise<{ success: boolean; fallback?: boolean }> {
  const content = generateTxtContent(inventory);
  const filename = getTxtFilename(inventory.name);
  const blob = new Blob([content], { type: "text/plain" });
  const file = new File([blob], filename, { type: "text/plain" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: inventory.name,
        text: `Inventário: ${inventory.name}`,
      });
      return { success: true };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return { success: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true };
}
