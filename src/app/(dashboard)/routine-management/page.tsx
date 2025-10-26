import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTemplates, getTemplateProducts } from "./template-actions/actions";
import { RoutineManagementClient } from "./_components/routine-management-client";
import type { Product } from "@/components/routine/product-item";

export default async function RoutineManagementPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all templates
  const templatesResult = await getTemplates();

  if (!templatesResult.success) {
    console.error("Failed to fetch templates:", templatesResult.error);
    return <div>Error loading templates</div>;
  }

  const templates = templatesResult.data;

  // Fetch products for all templates in parallel
  const templateDetails: Record<string, { morning: Product[]; evening: Product[] }> = {};

  const productsResults = await Promise.all(
    templates.map((template) => getTemplateProducts(template.id))
  );

  templates.forEach((template, index) => {
    const productsResult = productsResults[index];

    if (productsResult.success) {
      const products = productsResult.data;
      templateDetails[template.id] = {
        morning: products.filter((p) => p.timeOfDay === "morning"),
        evening: products.filter((p) => p.timeOfDay === "evening"),
      };
    } else {
      templateDetails[template.id] = { morning: [], evening: [] };
    }
  });

  // Calculate product counts for each template
  const templatesWithCounts = templates.map((template) => ({
    ...template,
    morningProducts: templateDetails[template.id]?.morning.length || 0,
    eveningProducts: templateDetails[template.id]?.evening.length || 0,
  }));

  return (
    <RoutineManagementClient
      templates={templatesWithCounts}
      templateDetails={templateDetails}
      adminId={session.user.id}
    />
  );
}
