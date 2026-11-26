import { ARK_ASSET_CATEGORY, normalizeAssetCategory, type AssetCategory } from "@/lib/asset-category";

// fastai: 生成作品入素材库的业务分类与素材库“我的分类”计数。

/**
 * 画布生成时随任务提交的分类：取来源节点的分类（短剧角色 / 场景 / 道具设定图投送时已写入）。
 * 方舟认证只能由认证结果写入，生成结果不继承；没有分类时不传，入库归“素材”。
 */
export function canvasGenerationAssetCategoryFastai(category: unknown): AssetCategory | undefined {
    if (typeof category !== "string" || !category.trim()) return undefined;
    const normalized = normalizeAssetCategory(category, "material");
    return normalized === ARK_ASSET_CATEGORY || normalized === "material" ? undefined : normalized;
}

/** 生成作品登记为素材时的分类；与后端补登记（taskAssetCategoryFastai）同一口径。 */
export function generationAssetCategoryFastai(task: { clientContext?: { assetCategory?: string } }): AssetCategory {
    return canvasGenerationAssetCategoryFastai(task.clientContext?.assetCategory) ?? "material";
}

/**
 * “我的分类 · 全部”：服务端已返回各文件夹计数时取其合计，与“未分类”和各文件夹同一口径；
 * 否则退回本机已加载的素材数。本机只缓存用过的素材，直接用它会出现“全部”比“未分类”还少。
 */
export function assetFolderTotalFastai(folderCounts: Record<string, number> | undefined, fallback: number) {
    if (!folderCounts) return fallback;
    return Object.values(folderCounts).reduce((sum, count) => sum + (count || 0), 0);
}
