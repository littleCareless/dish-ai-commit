export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type DatePeriod = "1 week ago" | "2 weeks ago" | "3 weeks ago";

// 每个时间段对应的周数映射
const weeksMap = {
  "1 week ago": 1,
  "2 weeks ago": 2,
  "3 weeks ago": 3,
} as const;

/**
 * 根据给定的时间段计算日期范围
 * @param {DatePeriod} period - 时间段描述
 * @returns {DateRange} 计算得到的日期范围
 */
export function getDateRangeFromPeriod(period: DatePeriod): DateRange {
  const now = new Date();
  const weekInMillis = 7 * 24 * 60 * 60 * 1000;

  const weeks = weeksMap[period] || 1;
  const startDate = new Date(now.getTime() - weeks * weekInMillis);

  return { startDate, endDate: now };
}
