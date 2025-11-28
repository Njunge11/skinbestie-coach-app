"use client";

import { ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";
import type { RoutineProduct } from "../types";

interface ProductRecommendationsTableProps {
  products: RoutineProduct[];
}

export function ProductRecommendationsTable({
  products,
}: ProductRecommendationsTableProps) {
  // Filter to only include product type (exclude instruction-only steps)
  const productTypeSteps = products.filter(
    (product) => product.stepType === "product",
  );

  // Get unique products (deduplicate by product name)
  const uniqueProducts = productTypeSteps.reduce((acc, product) => {
    const existing = acc.find((p) => p.productName === product.productName);
    if (!existing) {
      acc.push(product);
    }
    return acc;
  }, [] as RoutineProduct[]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          Product Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueProducts.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No product recommendations yet"
            description="Product recommendations will appear here once you add products to the routine above."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-primary/10 hover:bg-primary/10">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Store Link</TableHead>
                  <TableHead className="font-semibold">
                    Purchase Instructions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueProducts.map((product) => (
                  <TableRow key={product.id} className="border-0">
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell>{product.routineStep}</TableCell>
                    <TableCell>
                      {product.productUrl ? (
                        <a
                          href={product.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                        >
                          View Product
                        </a>
                      ) : (
                        <span className="text-gray-400">No link</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.productPurchaseInstructions ||
                        "No Special Instructions"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
