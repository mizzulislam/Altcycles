import type { LoginMediaCategory } from "@/types/database.types";

export interface CategoryTickerItem {
  count: number;
  label: string;
  dotTone: string;
}

export type CategoryMetaMap = Record<
  LoginMediaCategory,
  { label: string; tone: "info" | "success" | "warning" }
>;
