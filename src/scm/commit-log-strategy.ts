import { exec } from "child_process";
import { promisify } from "util";
import { Logger } from "@/utils/logger";

const execAsync = promisify(exec);
const GIT_COMMIT_SEPARATOR = "<<DISH-COMMIT-END>>";
const logger = Logger.getInstance("CommitLogStrategy");

/**
 * 表示一个时间段的接口
 */
interface Period {
  /** 开始日期 */
  startDate: string | Date;
  /** 结束日期 */
  endDate: string | Date;
}

/**
 * 提交日志策略接口
 * 定义了获取代码提交记录的统一接口
 */
export interface CommitLogStrategy {
  /**
   * 获取指定时间段内指定作者的提交记录
   * @param workspacePath 工作区路径
   * @param period 时间段
   * @param author 作者名
   * @returns 提交记录数组
   */
  getCommits(
    workspacePath: string,
    period: Period | null,
    author: string
  ): Promise<string[]>;

  /**
   * 获取指定时间段内指定多个作者的提交记录
   * @param workspacePath 工作区路径
   * @param period 时间段
   * @param users 作者名数组
   * @returns 提交记录数组
   */
  getCommitsForUsers(
    workspacePath: string,
    period: Period | null,
    users: string[]
  ): Promise<string[]>;
}

/**
 * 获取上一周的日期范围(周一到周日)
 * @returns 包含上一周日期范围的Period对象
 */
export function getLastWeekPeriod(): Period {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  // 计算上周一
  const lastMonday = new Date(lastWeek);
  const dayOfWeek = lastWeek.getDay() || 7; // 将周日(0)转换为7
  lastMonday.setDate(lastWeek.getDate() - dayOfWeek + 1); // 调整到上周一

  // 计算上周日
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  return {
    startDate: lastMonday,
    endDate: lastSunday,
  };
}

/**
 * 格式化日期为YYYY-MM-DD格式的字符串
 * @param date 日期对象、字符串或其他日期类型
 * @returns 格式化后的日期字符串
 */
function formatDateToString(date: string | Date | any): string {
  // 如果是字符串，直接返回
  if (typeof date === "string") {
    return date;
  }

  // 检测是否是dayjs对象（它们通常有$d、$y、$M、$D等属性）
  if (date && typeof date === "object" && date.$d instanceof Date) {
    // 从dayjs对象中提取原始Date对象
    return formatDateToString(date.$d);
  }

  // 如果是标准Date对象
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 尝试从ISO格式字符串或时间戳创建Date对象
  try {
    // 检查是否有$d属性（标准dayjs对象格式）
    if (date && typeof date === "object" && date.$d) {
      return formatDateToString(date.$d);
    }

    // 处理ISO格式字符串，确保考虑时区
    if (
      date &&
      typeof date === "object" &&
      date.$d &&
      typeof date.$d === "string"
    ) {
      const dateObj = new Date(date.$d);
      if (!isNaN(dateObj.getTime())) {
        return formatDateToString(dateObj);
      }
    }

    // 其他可能的日期格式
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return formatDateToString(dateObj);
    }
  } catch (error) {
    logger.error("日期格式化错误", {
      error: error as Error,
    });
  }

  // 无法转换时，返回当前日期
  logger.warn(`无法识别的日期格式，使用当前日期代替: ${String(date)}`);
  return formatDateToString(new Date());
}

/**
 * 格式化时间段对象为日期字符串
 * @param period 时间段对象
 * @returns 格式化后的时间段对象
 */
function formatPeriod(period: Period | null): Period {
  if (!period) {
    return getLastWeekPeriod();
  }

  return {
    startDate: formatDateToString(period.startDate),
    endDate: formatDateToString(period.endDate),
  };
}

/**
 * Git提交记录策略实现类
 */
export class GitCommitStrategy implements CommitLogStrategy {
  private parseGitLogEntries(stdout: string): string[] {
    if (!stdout?.trim()) {
      return [];
    }

    return stdout
      .split(GIT_COMMIT_SEPARATOR)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  /**
   * 获取Git仓库的提交记录
   * @param workspacePath Git仓库路径
   * @param period 查询的时间段
   * @param author 提交作者
   * @returns 格式化后的提交记录数组
   */
  async getCommits(
    workspacePath: string,
    period: Period | null,
    author: string
  ): Promise<string[]> {
    // 格式化时间段
    const formattedPeriod = formatPeriod(period);

    // 构建git log命令,格式化输出提交信息
    // const command = `git log --since="${formattedPeriod.startDate}" --until="${formattedPeriod.endDate}" --pretty=format:"%h - %an, %ar : %s" --author="${author}"`;
    const command = `git log --since="${formattedPeriod.startDate}" --until="${formattedPeriod.endDate}" --pretty=format:"=== %h ===%nAuthor: %an%nDate: %ad%n%n%B%n${GIT_COMMIT_SEPARATOR}" --author="${author}"`;

    const { stdout } = await execAsync(command, {
      cwd: workspacePath,
      maxBuffer: 1024 * 1024 * 10,
    });
    return this.parseGitLogEntries(stdout);
  }

  /**
   * 获取Git仓库的多个作者的提交记录
   * @param workspacePath Git仓库路径
   * @param period 查询的时间段
   * @param users 提交作者数组
   * @returns 格式化后的提交记录数组
   */
  async getCommitsForUsers(
    workspacePath: string,
    period: Period | null,
    users: string[]
  ): Promise<string[]> {
    if (users.length === 0) {
      return [];
    }
    const formattedPeriod = formatPeriod(period);
    // 要实现 OR 关系，需要使用正则表达式
    const authorRegex = users
      .map((user) => user.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) // 转义正则特殊字符
      .join("\\|"); // 构建 OR 正则表达式

    // 使用 --author=<regex>
    const command = `git log --since="${formattedPeriod.startDate}" --until="${formattedPeriod.endDate}" --author="${authorRegex}" --all-match --pretty=format:"=== %h ===%nAuthor: %an%nDate: %ad%n%n%B%n${GIT_COMMIT_SEPARATOR}"`;

    try {
      const { stdout } = await execAsync(command, {
        cwd: workspacePath,
        maxBuffer: 1024 * 1024 * 10, // 增加缓冲区
      });
      return this.parseGitLogEntries(stdout);
    } catch (error) {
      // 如果正则查询失败（例如某些git版本不支持），可以回退到为每个用户查询然后合并
      logger.error(
        "Error getting commits for multiple users with regex, falling back to individual queries",
        {
          error: error as Error,
        },
      );
      let allCommits: string[] = [];
      for (const user of users) {
        const singleUserCommand = `git log --since="${
          formattedPeriod.startDate
        }" --until="${
          formattedPeriod.endDate
        }" --pretty=format:"=== %h ===%nAuthor: %an%nDate: %ad%n%n%B%n${GIT_COMMIT_SEPARATOR}" --author="${user.replace(
          /"/g,
          '\\"'
        )}"`;
        try {
          const { stdout } = await execAsync(singleUserCommand, {
            cwd: workspacePath,
            maxBuffer: 1024 * 1024 * 10,
          });
          allCommits = allCommits.concat(this.parseGitLogEntries(stdout));
        } catch (singleError) {
          logger.error(`Error getting commits for user ${user}`, {
            error: singleError as Error,
          });
        }
      }
      // 去重并按某种方式排序（例如，git log默认输出就是按日期逆序）
      // 简单的去重可以通过 Set 实现，但会打乱顺序。如果需要保持顺序或特定排序，需要更复杂逻辑。
      // 暂时简单合并，后续可优化排序和去重。
      return [...new Set(allCommits)]; // 简单去重，会打乱顺序
    }
  }
}

/**
 * SVN提交记录策略实现类
 */
export class SvnCommitStrategy implements CommitLogStrategy {
  /**
   * 获取SVN仓库的提交记录
   * @param workspacePath SVN仓库路径
   * @param period 查询的时间段
   * @param author 提交作者
   * @returns 解析后的提交记录数组
   */
  async getCommits(
    workspacePath: string,
    period: Period | null,
    author: string
  ): Promise<string[]> {
    // 格式化时间段
    const formattedPeriod = formatPeriod(period);

    // 构建svn log命令,使用XML格式输出
    const command = `svn log -r "{${formattedPeriod.startDate}}:{${formattedPeriod.endDate}}" --search="${author}" --xml`;

    const { stdout } = await execAsync(command, { cwd: workspacePath });
    return this.parseXmlLogs(stdout);
  }

  /**
   * 获取SVN仓库的多个作者的提交记录
   * @param workspacePath SVN仓库路径
   * @param period 查询的时间段
   * @param users 提交作者数组
   * @returns 解析后的提交记录数组
   */
  async getCommitsForUsers(
    workspacePath: string,
    period: Period | null,
    users: string[]
  ): Promise<string[]> {
    if (users.length === 0) {
      return [];
    }
    const formattedPeriod = formatPeriod(period);
    let allCommits: string[] = [];

    // SVN 的 --search 似乎只支持单个用户或模式
    // 我们需要为每个用户执行一次命令，然后合并结果
    for (const user of users) {
      // 对用户名进行适当的清理或转义，以防注入（尽管这里是search参数）
      const safeUser = user.replace(/[^\w\s.-]/g, ""); // 简单清理
      const command = `svn log -r "{${formattedPeriod.startDate}}:{${formattedPeriod.endDate}}" --search="${safeUser}" --xml`;
      logger.debug(`SVN command for user ${user}: ${command}`);
      try {
        const { stdout } = await execAsync(command, {
          cwd: workspacePath,
          maxBuffer: 1024 * 1024 * 10, // 增加缓冲区
        });
        const userCommits = this.parseXmlLogs(stdout);
        allCommits = allCommits.concat(userCommits);
      } catch (error) {
        logger.error(`Error getting SVN commits for user ${user}`, {
          error: error as Error,
        });
        // 可以选择忽略错误继续为其他用户获取，或者抛出错误
      }
    }
    // 注意：合并后的提交可能需要按日期排序和去重
    // parseXmlLogs 返回的是 msg 内容，如果多个用户修改了同一个 revision，可能会有重复内容（如果msg相同）
    // 或者如果需要基于 revision 去重，则 parseXmlLogs 需要返回更结构化的数据
    return [...new Set(allCommits)]; // 简单去重，会打乱顺序
  }

  /**
   * 解析SVN的XML格式日志输出
   * @param xmlOutput XML格式的SVN日志输出
   * @returns 提取的提交消息数组
   */
  private parseXmlLogs(xmlOutput: string): string[] {
    const commits: string[] = [];
    // 匹配<logentry>标签内的<msg>内容
    const logEntriesRegex =
      /<logentry[^>]*>[\s\S]*?<msg>([\s\S]*?)<\/msg>[\s\S]*?<\/logentry>/g;
    let match;

    // 循环提取所有匹配的提交消息
    while ((match = logEntriesRegex.exec(xmlOutput)) !== null) {
      if (match[1]?.trim()) {
        commits.push(match[1]?.trim());
      }
    }

    return commits;
  }
}
