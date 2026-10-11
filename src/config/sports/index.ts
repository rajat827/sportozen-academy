import { football } from "./football";
import type { SportConfiguration } from "@/domain/entities";
export const sportConfigurations: Record<string, SportConfiguration> = {
  football,
};
export const sportConfiguration = (id: string) => sportConfigurations[id];
