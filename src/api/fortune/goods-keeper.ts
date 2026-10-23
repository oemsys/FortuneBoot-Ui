import { http } from "@/utils/http";
import type { BillVo } from "@/api/fortune/bill";

export interface GoodsKeeperQuery extends BasePageQuery {
  pageNum?: number;
  pageSize?: number;
  groupId?: number;
  bookId?: number;
  goodsName?: string;
}

export interface GoodsKeeperVo {
  goodsKeeperId: number;
  bookId: number;
  goodsName?: string;
  categoryName?: string;
  tagName?: string;
  price?: number;
  /** 关联账单累计净成本（支出加/收入减） */
  accumulatedCost?: number;
  purchaseDate?: string;
  warrantyDate?: string;
  useByTimes?: boolean;
  usageNum?: boolean;
  statusDesc?: boolean;
  retiredDate?: boolean;
  soldPrice?: boolean;
  remark?: string;
  dailyAverageCost?: string;
}

/** 归物下拉选项（新增账单-关联归物用） */
export interface GoodsKeeperOptionVo {
  goodsKeeperId: number;
  goodsName?: string;
  price?: number;
  /** 关联账单累计净成本 */
  accumulatedCost?: number;
}

export interface AddGoodsKeeperCommand {
  bookId?: number;
  goodsName?: string;
  categoryId?: number;
  tagId?: number;
  price?: number;
  purchaseDate?: string;
  warrantyDate?: string;
  useByTimes?: boolean;
  usageNum?: number;
  status?: number;
  retiredDate?: string;
  soldPrice?: number;
  remark?: string;
}

export interface goodsKeeperStatistics {
  allPrice: number;
  allDailyPrice: number;
  activePrice: number;
  activeDailyPrice: number;
}

export interface ModifyGoodsKeeperCommand extends AddGoodsKeeperCommand {
  goodsKeeperId?: number;
}

export function getFortuneGoodsKeeperPage(params: GoodsKeeperQuery) {
  return http.request<ResponseData<PageDTO<GoodsKeeperVo>>>(
    "get",
    "/fortune/goods/keeper/getPage",
    {
      params
    }
  );
}

export function getGoodsKeeperStatistics(bookId: number) {
  return http.request<ResponseData<goodsKeeperStatistics>>(
    "get",
    `/fortune/goods/keeper/${bookId}/getGoodsKeeperStatistics`
  );
}

export function addGoodsKeeperApi(data: FormData) {
  return http.request("post", "/fortune/goods/keeper/add", {
    data,
    headers: {
      "Content-Type": "multipart/form-data" // 必须设置
    }
  });
}

export function modifyGoodsKeeperApi(data: FormData) {
  return http.request("put", "/fortune/goods/keeper/modify", {
    data,
    headers: {
      "Content-Type": "multipart/form-data" // 必须设置
    }
  });
}

export function removeGoodsKeeperApi(bookId: number, goodsKeeperId: number) {
  return http.request(
    "delete",
    `/fortune/goods/keeper/${bookId}/${goodsKeeperId}/remove`
  );
}

/** 归物下拉选项 */
export function getGoodsKeeperOptions(bookId: number) {
  return http.request<ResponseData<GoodsKeeperOptionVo[]>>(
    "get",
    `/fortune/goods/keeper/${bookId}/options`
  );
}

/** 查询归物关联的流水 */
export function getGoodsKeeperBills(
  bookId: number,
  keeperId: number,
  params: GoodsKeeperQuery
) {
  return http.request<ResponseData<PageDTO<BillVo>>>(
    "get",
    `/fortune/goods/keeper/${bookId}/${keeperId}/bills`,
    { params }
  );
}
