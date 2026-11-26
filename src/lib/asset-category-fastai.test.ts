import assert from "node:assert/strict";
import test from "node:test";

import { assetFolderTotalFastai, canvasGenerationAssetCategoryFastai, generationAssetCategoryFastai } from "./asset-category-fastai";

test("短剧设定节点的分类随任务提交", () => {
    assert.equal(canvasGenerationAssetCategoryFastai("character"), "character");
    assert.equal(canvasGenerationAssetCategoryFastai("environment"), "environment");
    assert.equal(canvasGenerationAssetCategoryFastai("prop"), "prop");
    assert.equal(canvasGenerationAssetCategoryFastai("wardrobe"), "prop");
});

test("无分类、素材和方舟认证不随任务提交", () => {
    for (const value of [undefined, "", "material", "ark", "unknown"]) assert.equal(canvasGenerationAssetCategoryFastai(value), undefined);
});

test("登记素材时按任务上下文分类，缺省为素材", () => {
    assert.equal(generationAssetCategoryFastai({ clientContext: { assetCategory: "environment" } }), "environment");
    assert.equal(generationAssetCategoryFastai({ clientContext: { assetCategory: "ark" } }), "material");
    assert.equal(generationAssetCategoryFastai({}), "material");
});

test("我的分类·全部：服务端计数可用时取各文件夹合计，与未分类同口径", () => {
    assert.equal(assetFolderTotalFastai({ "": 52 }, 2), 52);
    assert.equal(assetFolderTotalFastai({ "": 50, folderA: 3 }, 2), 53);
    assert.equal(assetFolderTotalFastai({}, 2), 0);
    assert.equal(assetFolderTotalFastai(undefined, 2), 2);
});
