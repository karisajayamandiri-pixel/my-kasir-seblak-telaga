import { DataCabang } from '../types';

/**
 * Helper to dynamically resolve branch name from Firestore branches collection based on branchId.
 * When a branch's name is modified in Firestore, all places using getBranchName will update automatically.
 */
export function getBranchName(branchIdOrName: string | undefined, branches: DataCabang[] = []): string {
  if (!branchIdOrName) return '';
  const trimmed = branchIdOrName.trim();
  const found = branches.find(
    (b) =>
      b.id === trimmed ||
      b.branchId === trimmed ||
      b.nama.toLowerCase() === trimmed.toLowerCase() ||
      (b.name && b.name.toLowerCase() === trimmed.toLowerCase())
  );
  return found ? found.nama : trimmed;
}

/**
 * Resolve branchId from either an ID or a branch name
 */
export function getBranchId(branchIdOrName: string | undefined, branches: DataCabang[] = []): string {
  if (!branchIdOrName) return '';
  const trimmed = branchIdOrName.trim();
  const found = branches.find(
    (b) =>
      b.id === trimmed ||
      b.branchId === trimmed ||
      b.nama.toLowerCase() === trimmed.toLowerCase() ||
      (b.name && b.name.toLowerCase() === trimmed.toLowerCase())
  );
  return found ? (found.branchId || found.id) : trimmed;
}

/**
 * Get branch object by branchId
 */
export function getBranchById(branchId: string | undefined, branches: DataCabang[] = []): DataCabang | undefined {
  if (!branchId) return undefined;
  return branches.find((b) => b.id === branchId || b.branchId === branchId);
}

/**
 * Get all active store branches (excluding DC Pusat) dynamically from branches collection
 */
export function getStoreBranches(branches: DataCabang[] = []): DataCabang[] {
  return branches.filter((b) => !b.isPusat && b.status === 'Aktif');
}

/**
 * Get all active store branch names dynamically from branches collection
 */
export function getStoreBranchNames(branches: DataCabang[] = []): string[] {
  return getStoreBranches(branches).map((b) => b.nama);
}

/**
 * Get all store branches (active & nonaktif, excluding DC Pusat)
 */
export function getAllStoreBranches(branches: DataCabang[] = []): DataCabang[] {
  return branches.filter((b) => !b.isPusat);
}
