# 日期工具使用说明

本文档详细介绍 `getDateRangeFromPeriod` 函数的用法。

## 函数简介

`getDateRangeFromPeriod` 函数接收一个时间段描述（可选值："1 week ago" | "2 weeks ago" | "3 weeks ago"）  
返回一个包含两个日期的对象，其中：

- **startDate**：基于当前日期减去对应周数得到的开始日期
- **endDate**：当前日期

## 示例代码

下面示例展示如何使用该函数：

```typescript
import { getDateRangeFromPeriod } from "./DateUtils";

// 示例：获取 "2 weeks ago" 时间段的日期范围
const period = "2 weeks ago";
const { startDate, endDate } = getDateRangeFromPeriod(period);

console.log("Start Date:", startDate);
console.log("End Date:", endDate);
```

## 详细说明

- **计算过程**：  
  函数先获取当前日期，然后根据输入的描述查找对应的周数（1、2 或 3），接着减去相应的毫秒数（7 天 _ 24 小时 _ 60 分钟 _ 60 秒 _ 1000 毫秒）。
- **默认值**：  
  当 period 参数不匹配时默认使用 1 周，即 "1 week ago"。

- **输出结果示例**：  
  运行上述代码时，会打印例如如下内容：
  ```
  Start Date: [对应2周前的日期]
  End Date: [当前日期]
  ```
  实际输出依赖于代码运行时的当前日期。

## 扩展说明

- 本函数依赖于 JavaScript 的 Date 对象进行日期计算。
- 如果需要适用更多时间段，可以在 weeksMap 中进行扩展。

// ...existing code...
