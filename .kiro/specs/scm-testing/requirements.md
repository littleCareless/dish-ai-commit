# SCM测试需求文档

## 介绍

为了确保SCM（源代码管理）部分的关键逻辑在vibe coding过程中不会出现问题，需要为SCM相关的核心功能添加完善的单元测试和集成测试。SCM部分包含Git和SVN两种版本控制系统的支持，涉及差异获取、提交操作、日志查询、作者信息获取等关键功能。

## 需求

### 需求 1: SCM工厂类测试

**用户故事:** 作为开发者，我希望SCM工厂类能够正确检测和创建相应的SCM提供者，以便系统能够自动适配不同的版本控制系统。

#### 验收标准

1. WHEN 工作区包含.git目录 THEN SCMFactory SHALL 返回GitProvider实例
2. WHEN 工作区包含.svn目录 THEN SCMFactory SHALL 返回SvnProvider或CliSvnProvider实例
3. WHEN 工作区既不包含.git也不包含.svn目录 THEN SCMFactory SHALL 返回undefined
4. WHEN 提供选定文件路径 THEN SCMFactory SHALL 基于文件路径查找相应的SCM根目录
5. WHEN Git扩展不可用但系统有git命令 THEN SCMFactory SHALL 仍能检测到git类型
6. WHEN SVN扩展不可用但系统有svn命令 THEN SCMFactory SHALL 创建CliSvnProvider实例

### 需求 2: Git提供者核心功能测试

**用户故事:** 作为开发者，我希望GitProvider的所有核心功能都经过充分测试，以确保Git操作的可靠性。

#### 验收标准

1. WHEN 调用getDiff方法且有文件更改 THEN GitProvider SHALL 返回正确的差异内容
2. WHEN 调用getDiff方法且没有文件更改 THEN GitProvider SHALL 抛出"无更改"错误
3. WHEN 调用getDiff方法指定特定文件 THEN GitProvider SHALL 只返回指定文件的差异
4. WHEN 调用commit方法 THEN GitProvider SHALL 成功提交更改
5. WHEN 调用setCommitInput方法 THEN GitProvider SHALL 正确设置提交输入框内容
6. WHEN 调用getCommitLog方法 THEN GitProvider SHALL 返回正确的提交日志列表
7. WHEN 调用getBranches方法 THEN GitProvider SHALL 返回所有分支列表
8. WHEN 调用getRecentCommitMessages方法 THEN GitProvider SHALL 返回最近的提交信息

### 需求 3: SVN提供者核心功能测试

**用户故事:** 作为开发者，我希望SvnProvider的所有核心功能都经过充分测试，以确保SVN操作的可靠性。

#### 验收标准

1. WHEN 调用init方法 THEN SvnProvider SHALL 成功初始化并检测SVN版本
2. WHEN 调用getDiff方法且有文件更改 THEN SvnProvider SHALL 返回正确的差异内容
3. WHEN 调用commit方法 THEN SvnProvider SHALL 成功提交更改
4. WHEN 调用getCommitLog方法 THEN SvnProvider SHALL 返回正确的SVN日志
5. WHEN SVN路径配置错误 THEN SvnProvider SHALL 抛出初始化错误
6. WHEN 调用getRecentCommitMessages方法 THEN SvnProvider SHALL 返回最近的提交信息

### 需求 4: CLI SVN提供者测试

**用户故事:** 作为开发者，我希望CliSvnProvider作为SVN扩展的备选方案能够正常工作。

#### 验收标准

1. WHEN 系统有svn命令 THEN CliSvnProvider SHALL 检测为可用
2. WHEN 系统没有svn命令 THEN CliSvnProvider SHALL 检测为不可用
3. WHEN 调用getDiff方法 THEN CliSvnProvider SHALL 通过命令行获取差异
4. WHEN 调用commit方法 THEN CliSvnProvider SHALL 通过命令行执行提交

### 需求 5: 作者服务测试

**用户故事:** 作为开发者，我希望AuthorService能够正确获取Git和SVN的作者信息。

#### 验收标准

1. WHEN 调用getAuthor方法且类型为git THEN AuthorService SHALL 返回Git配置的用户名
2. WHEN 调用getAuthor方法且类型为svn THEN AuthorService SHALL 返回SVN的作者信息
3. WHEN SVN作者信息获取失败 THEN AuthorService SHALL 提示用户手动输入
4. WHEN 调用getAllAuthors方法 THEN AuthorService SHALL 返回所有作者列表

### 需求 6: 提交日志策略测试

**用户故事:** 作为开发者，我希望提交日志策略能够正确获取指定时间段和作者的提交记录。

#### 验收标准

1. WHEN 使用GitCommitStrategy获取提交记录 THEN 系统 SHALL 返回指定时间段内的Git提交
2. WHEN 使用SvnCommitStrategy获取提交记录 THEN 系统 SHALL 返回指定时间段内的SVN提交
3. WHEN 指定多个作者 THEN 提交日志策略 SHALL 返回所有指定作者的提交记录
4. WHEN 时间段为null THEN 提交日志策略 SHALL 使用默认的上周时间段

### 需求 7: SVN工具类测试

**用户故事:** 作为开发者，我希望SVN工具类的各种实用方法都能正确工作。

#### 验收标准

1. WHEN 调用getSvnAuthorFromInfo方法 THEN SVNUtils SHALL 从svn info输出中提取作者信息
2. WHEN 调用getSvnAuthorFromAuth方法 THEN SVNUtils SHALL 从认证缓存中获取用户名
3. WHEN 调用findSvnRoot方法 THEN SVNUtils SHALL 找到正确的SVN根目录
4. WHEN SVN路径检测失败 THEN SVNUtils SHALL 抛出相应错误

### 需求 8: 错误处理和边界情况测试

**用户故事:** 作为开发者，我希望SCM组件能够优雅地处理各种错误情况和边界条件。

#### 验收标准

1. WHEN 网络连接失败 THEN SCM提供者 SHALL 抛出有意义的错误信息
2. WHEN 文件权限不足 THEN SCM提供者 SHALL 抛出权限错误
3. WHEN 仓库损坏 THEN SCM提供者 SHALL 检测并报告仓库状态问题
4. WHEN 命令执行超时 THEN SCM提供者 SHALL 抛出超时错误
5. WHEN 传入无效参数 THEN SCM提供者 SHALL 进行参数验证并抛出相应错误

### 需求 9: 性能测试

**用户故事:** 作为开发者，我希望SCM操作在处理大型仓库时仍能保持良好的性能。

#### 验收标准

1. WHEN 处理大量文件的差异 THEN getDiff方法 SHALL 在合理时间内完成
2. WHEN 获取大量提交日志 THEN getCommitLog方法 SHALL 使用适当的缓冲区大小
3. WHEN 并发调用SCM方法 THEN 系统 SHALL 正确处理并发请求

### 需求 10: 集成测试

**用户故事:** 作为开发者，我希望SCM组件能够与VS Code扩展API正确集成。

#### 验收标准

1. WHEN VS Code Git扩展可用 THEN GitProvider SHALL 正确集成Git API
2. WHEN VS Code SVN扩展可用 THEN SvnProvider SHALL 正确集成SVN API
3. WHEN 扩展不可用 THEN 系统 SHALL 回退到命令行实现
4. WHEN 用户配置发生变化 THEN SCM提供者 SHALL 重新加载配置