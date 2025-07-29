# SCM测试文档

本目录包含SCM（源代码管理）模块的完整测试文档。

## 文档结构

### 📊 [测试覆盖率分析报告](./test-coverage-analysis.md)
- 当前测试状态分析
- 未覆盖代码路径识别
- 覆盖率改进建议
- 具体行动计划

### 📖 [SCM测试运行指南](./scm-testing-guide.md)
- 测试环境设置
- 测试运行方法
- 测试编写最佳实践
- 调试和故障排除

### 🔧 [测试维护文档](./test-maintenance.md)
- 日常维护任务
- 故障排除指南
- 性能优化策略
- 质量指标监控

## 快速开始

### 运行所有SCM测试
```bash
npm run test:scm
```

### 生成覆盖率报告
```bash
npm run test:scm:coverage
```

### 检查覆盖率阈值
```bash
npm run coverage:check
```

### 运行质量门禁
```bash
npm run quality-gate
```

## 测试类型

### 单元测试
```bash
npm run test:scm:unit
```
测试单个组件和方法的功能。

### 集成测试
```bash
npm run test:scm:integration
```
测试组件之间的交互。

### 端到端测试
```bash
npm run test:scm:e2e
```
测试完整的用户工作流。

## 覆盖率目标

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 行覆盖率 | ≥90% | 🔴 ~35% |
| 函数覆盖率 | ≥95% | 🔴 ~40% |
| 分支覆盖率 | ≥85% | 🔴 ~25% |
| 语句覆盖率 | ≥90% | 🔴 ~35% |

## CI/CD集成

测试在以下情况下自动运行：
- 推送到 `main` 或 `develop` 分支
- 创建Pull Request
- SCM相关文件变更

查看 [GitHub Actions配置](./.github/workflows/scm-tests.yml) 了解详细信息。

## 贡献指南

### 添加新测试
1. 在相应的测试目录中创建测试文件
2. 遵循命名约定：`*.test.ts`
3. 使用AAA模式编写测试
4. 确保覆盖率不降低

### 修复失败测试
1. 运行失败的测试以重现问题
2. 分析失败原因
3. 修复代码或测试
4. 验证修复效果

### 更新文档
1. 保持文档与代码同步
2. 记录重要的测试决策
3. 更新故障排除指南

## 支持

如有问题或建议，请：
1. 查看相关文档
2. 检查已知问题
3. 联系开发团队

## 相关链接

- [项目主页](../README.md)
- [开发指南](../CONTRIBUTING.md)
- [API文档](../API.md)
- [变更日志](../CHANGELOG.md)