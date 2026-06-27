import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function translateCategory(category: string, t: any): string {
  if (!category) return "";
  
  if (category.includes("-")) {
    const parts = category.split("-");
    const prefix = parts[0].trim();
    const suffix = parts.slice(1).join("-").trim();
    
    const translatedPrefix = t(`dashboard.categories.${prefix.replace(/ & | /g, "")}`, 
      t(`dashboard.accounts.${prefix.replace(/ & | /g, "")}`, 
        t(`categories.${prefix.replace(/ & | /g, "")}`,
          t(`accounts.${prefix.replace(/ & | /g, "")}`, prefix)
        )
      )
    );
    return `${translatedPrefix} - ${suffix}`;
  }
  
  return t(`dashboard.categories.${category.replace(/ & | /g, "")}`, 
    t(`dashboard.accounts.${category.replace(/ & | /g, "")}`, 
      t(`categories.${category.replace(/ & | /g, "")}`,
        t(`accounts.${category.replace(/ & | /g, "")}`, category)
      )
    )
  );
}
