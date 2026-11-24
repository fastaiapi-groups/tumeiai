// tumeiai: MiniMax H3（minimax-h3-xs）算力来源。中转走平台网关并扣积分；自有仙宫云由后端直连 Wrapper 用户资源池，平台不扣积分。
import { http } from "@/services/api/request";

export type TumeiaiXiangongMode = "relay" | "own";

export type TumeiaiXiangongSetting = {
    mode: TumeiaiXiangongMode;
    /** 中转：生成时使用的镜像；自有仙宫云：资源池自动租用实例时使用的镜像。空表示默认镜像。 */
    gpuImage: string;
    /** 是否已连接仙宫云账号（后端保存了资源 Key）。 */
    connected: boolean;
    resourceAccountId?: string;
};

export type TumeiaiXiangongSettingInput = {
    mode: TumeiaiXiangongMode;
    gpuImage: string;
    /** 仙宫云访问令牌，只在首次连接或更换账号时提交；后端不保存令牌。 */
    accessToken?: string;
};

export function getTumeiaiXiangongSetting(signal?: AbortSignal) {
    return http.get<TumeiaiXiangongSetting>("/tumeiai/xiangong", { signal });
}

export function saveTumeiaiXiangongSetting(input: TumeiaiXiangongSettingInput) {
    return http.put<TumeiaiXiangongSetting>("/tumeiai/xiangong", input);
}
