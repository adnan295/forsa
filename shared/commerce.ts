/** Shared bank-transfer rules for server, web and native clients. */
export function normalizePaymentMethod(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
type Method = {name: string; nameAr?: string | null; iban?: string | null; imageUrl?: string | null};
export function isBankTransferMethod(method: Method): boolean {
  const name = normalizePaymentMethod(method.name) + " " + (method.nameAr || "");
  if (/cash|cod|sham|شام|عند الاستلام/.test(name)) return false;
  return !!method.iban || /bank|تحويل بنكي|حوالة بنكية/.test(name);
}
export function requiresPaymentReceipt(method: Method): boolean {
  return isBankTransferMethod(method);
}
export function isConfiguredBankTransfer(method: Method & {bankName?: string | null; accountName?: string | null}): boolean {
  return isBankTransferMethod(method) && !!method.bankName?.trim() && !!method.accountName?.trim() && !!method.iban?.trim();
}
