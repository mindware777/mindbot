export const categories = ["Robotics", "Physical AI", "Open Source"] as const;
export type ArticleMetadata = { id: string; slug: string; title: string; summary: string; category: typeof categories[number]; publishedAt: string; draft: boolean };
