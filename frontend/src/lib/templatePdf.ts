import { fetchTemplatePdfDataUrl } from "@/lib/api/client";
import type { BMRTemplate } from "@/lib/store";

export async function resolveTemplatePdfDataUrl(
  template: BMRTemplate,
): Promise<string> {
  if (template.pdfDataUrl) return template.pdfDataUrl;
  return fetchTemplatePdfDataUrl(template.id);
}
