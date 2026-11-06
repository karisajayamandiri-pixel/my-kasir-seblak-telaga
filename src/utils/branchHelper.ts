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

/**
 * Checks if a promo is active for a specific branch based on promo_cabang_ids:
 * - If promo_cabang_ids is undefined or empty []: active for ALL branches.
 * - If promo_cabang_ids has items: active ONLY if current branch matches one of the target IDs or branch names.
 */
export function isPromoActiveForBranch(
  promoCabangIds: string[] | undefined,
  currentBranchIdOrName: string | undefined,
  branches: DataCabang[] = []
): boolean {
  if (!promoCabangIds || promoCabangIds.length === 0) {
    return true; // Empty array means active for all branches
  }
  if (!currentBranchIdOrName) {
    return false;
  }
  const targetBranch = getBranchById(currentBranchIdOrName, branches) ||
    branches.find((b) => b.nama.toLowerCase() === currentBranchIdOrName.toLowerCase() || b.id === currentBranchIdOrName);

  const currentId = targetBranch?.branchId || targetBranch?.id || currentBranchIdOrName;
  const currentName = targetBranch?.nama || currentBranchIdOrName;

  return promoCabangIds.some((targetId) => {
    const trimmedTarget = targetId.trim().toLowerCase();
    return (
      trimmedTarget === currentId.toLowerCase() ||
      trimmedTarget === currentName.toLowerCase() ||
      (targetBranch?.id && trimmedTarget === targetBranch.id.toLowerCase()) ||
      (targetBranch?.branchId && trimmedTarget === targetBranch.branchId.toLowerCase())
    );
  });
}
