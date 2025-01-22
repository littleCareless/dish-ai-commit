/**
 * 日期工具类，提供日期范围计算相关功能
 */
export class DateUtils {
  /**
   * 根据给定的时间段计算日期范围
   * @param {string} period - 时间段描述，可选值: "1 week ago" | "2 weeks ago" | "3 weeks ago"
   * @returns {{startDate: Date, endDate: Date}} 计算得到的日期范围
   */
  static getDateRangeFromPeriod(period: string): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;

    // 根据时间段计算起始日期
    switch (period) {
      case "1 week ago":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前
        break;
      case "2 weeks ago":
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14天前
        break;
      case "3 weeks ago":
        startDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000); // 21天前
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 默认7天前
    }

    return { startDate, endDate: now };
  }
}
