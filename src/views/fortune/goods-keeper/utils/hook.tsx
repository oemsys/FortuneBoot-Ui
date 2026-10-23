import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import {
  getFortuneGoodsKeeperPage,
  getGoodsKeeperBills,
  getGoodsKeeperStatistics,
  type GoodsKeeperQuery,
  type goodsKeeperStatistics,
  type GoodsKeeperVo,
  removeGoodsKeeperApi
} from "@/api/fortune/goods-keeper";
import type { BillVo } from "@/api/fortune/bill";
import {
  getDefaultGroupId,
  getEnableGroupList,
  type GroupVo
} from "@/api/fortune/group";
import { type BookVo, getEnableBookList } from "@/api/fortune/book";

export function useHook() {
  const loading = ref(true);
  const dataList = ref([]);

  // 状态控制
  const defaultGroupId = ref<number>();
  const groupOptions = ref<Array<GroupVo>>();
  const bookOptions = ref<Array<BookVo>>();

  const opType = ref<"add" | "modify">("add");
  const opRow = ref<GoodsKeeperVo>();
  const formVisible = ref<boolean>(false);

  const goodsKeeperStatistics = ref<goodsKeeperStatistics>();

  onMounted(async () => {
    const [groupRes, defaultGroupRes] = await Promise.all([
      getEnableGroupList(),
      getDefaultGroupId()
    ]);
    if (groupRes.data.length === 0) {
      message("请先启用或创建分组");
    }
    groupOptions.value = groupRes.data;
    searchForm.groupId = defaultGroupRes.data;
    console.log(searchForm.groupId);
    const booksRes = await getEnableBookList(searchForm.groupId);
    bookOptions.value = booksRes.data;
    searchForm.bookId = groupOptions.value.find(
      group => group.groupId === searchForm.groupId
    ).defaultBookId;
    await onSearch();
  });

  const tableTitle = computed(() => {
    return `归物　|　总资产：${
      goodsKeeperStatistics.value?.allPrice ?? 0
    }元　|　总日均成本：${
      goodsKeeperStatistics.value?.allDailyPrice ?? 0
    }元　|　在役资产：${
      goodsKeeperStatistics.value?.activePrice ?? 0
    }元　|　在役日均成本：${
      goodsKeeperStatistics.value?.activeDailyPrice ?? 0
    }元`;
  });

  async function onSearch() {
    loading.value = true;
    const res = await getFortuneGoodsKeeperPage(searchForm);
    dataList.value = res.data.rows;
    pagination.total = res.data.total;
    const statistics = await getGoodsKeeperStatistics(searchForm.bookId);
    goodsKeeperStatistics.value = statistics.data;
    loading.value = false;
  }

  function resetForm() {
    searchForm.goodsName = "";
  }

  const searchForm = reactive<GoodsKeeperQuery>({});
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    currentPage: 1,
    background: true
  });

  async function handleRemoveGoodsKeeperApi(row: GoodsKeeperVo) {
    try {
      loading.value = true;
      await removeGoodsKeeperApi(row.bookId, row.goodsKeeperId);
      message(`您删除了物品名称为${row.goodsName}的这条数据`, { type: "info" });
      await onSearch();
    } catch (e) {
      console.error(e);
      message((e as Error)?.message || "删除失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function handleSizeChange(pageSize: number) {
    pagination.pageSize = pageSize;
    searchForm.pageSize = pageSize;
    await onSearch();
  }

  async function handleCurrentChange(currentPage: number) {
    pagination.currentPage = currentPage;
    searchForm.pageNum = currentPage;
    await onSearch();
  }

  async function openFormDialog(type: "add" | "modify", row?: GoodsKeeperVo) {
    try {
      opType.value = type;
      opRow.value = row;
      formVisible.value = true;
    } catch (e) {
      console.error(e);
      message(e.message || "操作失败", { type: "error" });
    }
  }

  // ===== 关联流水弹窗 =====
  const linkedBillsVisible = ref(false);
  const linkedBillsLoading = ref(false);
  const linkedBillsData = ref<Array<BillVo>>([]);
  const linkedBillsBookId = ref<number>();
  const linkedBillsKeeperId = ref<number>();
  const linkedBillsPagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    currentPage: 1,
    background: true
  });

  const billTypeLabel = (t?: number | string) => {
    if (t === 1 || t === "1") return "支出";
    if (t === 2 || t === "2") return "收入";
    if (t === 3 || t === "3") return "转账";
    return String(t ?? "");
  };

  const formatLinkedAmount = (row: any) => {
    const amt = Number(row.amount ?? 0);
    const sign = row.billType === 2 ? "+" : row.billType === 1 ? "-" : "";
    return `${sign}${amt}`;
  };

  const formatLinkedCategory = (row: any) => {
    const list = row.categoryAmountPair;
    if (!Array.isArray(list) || list.length === 0) return "-";
    return list
      .map((c: any) => c.categoryName)
      .filter(Boolean)
      .join("、");
  };

  const linkedBillsColumns: TableColumnList = [
    { label: "交易时间", prop: "tradeTime", minWidth: 160 },
    {
      label: "类型",
      prop: "billType",
      width: 90,
      cellRenderer: ({ row }) => billTypeLabel(row.billType)
    },
    { label: "标题", prop: "title", minWidth: 140 },
    {
      label: "金额",
      prop: "amount",
      width: 120,
      cellRenderer: ({ row }) => formatLinkedAmount(row)
    },
    {
      label: "分类",
      prop: "categoryAmountPair",
      minWidth: 140,
      cellRenderer: ({ row }) => formatLinkedCategory(row)
    },
    { label: "账户", prop: "accountName", minWidth: 120 },
    { label: "备注", prop: "remark", minWidth: 160 }
  ];

  async function loadLinkedBills(page = 1) {
    if (!linkedBillsBookId.value || !linkedBillsKeeperId.value) return;
    linkedBillsLoading.value = true;
    try {
      const res = await getGoodsKeeperBills(
        linkedBillsBookId.value,
        linkedBillsKeeperId.value,
        {
          pageNum: page,
          pageSize: linkedBillsPagination.pageSize,
          bookId: linkedBillsBookId.value
        }
      );
      linkedBillsData.value = res.data.rows ?? [];
      linkedBillsPagination.total = res.data.total ?? 0;
      linkedBillsPagination.currentPage = page;
    } finally {
      linkedBillsLoading.value = false;
    }
  }

  async function openLinkedBills(row: GoodsKeeperVo) {
    linkedBillsBookId.value = row.bookId;
    linkedBillsKeeperId.value = row.goodsKeeperId;
    linkedBillsVisible.value = true;
    await loadLinkedBills(1);
  }

  function closeLinkedBills() {
    linkedBillsVisible.value = false;
    linkedBillsData.value = [];
    linkedBillsPagination.currentPage = 1;
    linkedBillsPagination.total = 0;
  }

  async function handleLinkedBillsSizeChange(pageSize: number) {
    linkedBillsPagination.pageSize = pageSize;
    await loadLinkedBills(1);
  }

  async function handleLinkedBillsCurrentChange(currentPage: number) {
    await loadLinkedBills(currentPage);
  }

  const columns: TableColumnList = [
    {
      label: "物品",
      prop: "goodsName",
      width: 150,
      align: "left"
    },
    {
      label: "日均成本",
      prop: "dailyAverageCost",
      width: 100
    },
    {
      label: "价格",
      prop: "price",
      minWidth: 100
    },
    {
      label: "关联成本",
      prop: "accumulatedCost",
      minWidth: 110,
      cellRenderer: ({ row }) =>
        row.accumulatedCost == null ? "0" : `¥${row.accumulatedCost}`
    },
    {
      label: "持有时间（天）",
      prop: "holdingTime",
      minWidth: 140
    },
    {
      label: "购买日期",
      prop: "purchaseDate",
      minWidth: 100
    },
    {
      label: "分类",
      prop: "categoryName",
      minWidth: 100
    },
    {
      label: "标签",
      prop: "tagName",
      minWidth: 100
    },
    {
      label: "保修日期",
      prop: "warrantyDate",
      minWidth: 100
    },
    {
      label: "是否过保",
      prop: "isOverWarranty",
      minWidth: 100
    },
    {
      label: "是否按次使用",
      prop: "useByTimesDesc",
      minWidth: 120
    },
    {
      label: "使用次数",
      prop: "usageNum",
      minWidth: 100
    },
    {
      label: "状态",
      prop: "statusDesc",
      minWidth: 100
    },
    {
      label: "退役日期",
      prop: "retiredDate",
      minWidth: 100
    },
    {
      label: "出售价格",
      prop: "soldPrice",
      minWidth: 100
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 200
    },
    {
      label: "操作",
      fixed: "right",
      width: 180,
      slot: "operation"
    }
  ];

  return {
    loading,
    groupOptions,
    bookOptions,
    columns,
    dataList,
    defaultGroupId,
    pagination,
    searchForm,
    formVisible,
    opRow,
    opType,
    tableTitle,
    onSearch,
    openFormDialog,
    resetForm,
    handleRemoveGoodsKeeperApi,
    handleSizeChange,
    handleCurrentChange,
    linkedBillsVisible,
    linkedBillsLoading,
    linkedBillsData,
    linkedBillsPagination,
    linkedBillsColumns,
    openLinkedBills,
    closeLinkedBills,
    handleLinkedBillsSizeChange,
    handleLinkedBillsCurrentChange
  };
}
