# VSCode 主题适配说明

## 问题描述
webview 没有适配 VSCode 的深浅色模式，导致在不同主题下显示效果不佳。保存按钮和菜单组件也没有正确适配主题变化。

## 解决方案

### 1. HTML 层面的主题检测
在 `src/webview/providers/settings-view-html-provider.ts` 中添加了主题检测和监听逻辑：
- 检测 VSCode 的主题类名（`vscode-light`、`vscode-dark`、`vscode-high-contrast`）
- 监听主题变化事件
- 将主题信息传递给 React 应用
- **新增**: 自动设置Arco Design的 `arco-theme` 属性

### 2. CSS 变量适配
在 `src/webview-ui/src/index.css` 中：
- 使用 VSCode 提供的 CSS 变量（如 `--vscode-editor-background`）
- 为不同主题（light、dark、high-contrast）定义了对应的颜色变量
- 替换了硬编码的颜色值，使其能够响应主题变化
- **新增**: 添加Arco Design暗黑模式CSS变量映射
- **新增**: 强制覆盖Arco Design组件样式以确保主题一致性

### 3. React 组件适配
在 `src/webview-ui/src/App.tsx` 中：
- 添加了主题状态管理
- 监听主题变化事件
- 将主题类名应用到 document 元素

在 `src/webview-ui/src/pages/settings-page.tsx` 中：
- 更新了组件样式，使用 CSS 变量替代硬编码颜色
- 确保 Arco Design 组件也能适配主题

在 `src/webview-ui/src/pages/setting/SettingsMenu.tsx` 中：
- 为 ArcoMenu 组件添加了主题适配样式
- 使用 CSS 变量设置背景色、前景色和边框色

在 `src/webview-ui/src/pages/setting/SettingsContent.tsx` 中：
- 为所有 Arco Design 组件（Input、Select、Switch、Button、Collapse）添加了主题适配
- 确保表单控件能够正确响应主题变化

在 `src/webview-ui/src/pages/weekly-report-page.tsx` 中：
- 为 RangePicker 和 ArcoSelect 组件添加了主题适配样式
- 保证日期选择器和下拉选择框能够适配主题

## 主要特性

1. **自动主题检测**：webview 会自动检测当前 VSCode 主题
2. **动态主题切换**：用户切换主题时，webview 会实时响应
3. **完整主题支持**：支持浅色、深色和高对比度三种主题
4. **组件库完整适配**：所有 Arco Design 组件（菜单、按钮、输入框、选择器、开关等）都能正确适配主题
5. **向后兼容**：如果 VSCode 变量不可用，会使用默认颜色值

## 技术实现

### 主题检测与Arco Design适配
```javascript
function getVSCodeTheme() {
    const body = document.body;
    if (body.classList.contains('vscode-dark')) {
        return 'dark';
    } else if (body.classList.contains('vscode-light')) {
        return 'light';
    } else if (body.classList.contains('vscode-high-contrast')) {
        return 'high-contrast';
    }
    return 'light';
}

function applyTheme() {
    const theme = getVSCodeTheme();
    const root = document.documentElement;
    const body = document.body;
    
    // 应用主题类
    root.classList.remove('light', 'dark', 'high-contrast');
    root.classList.add(theme);
    
    // 设置Arco Design主题
    if (theme === 'dark' || theme === 'high-contrast') {
        body.setAttribute('arco-theme', 'dark');
    } else {
        body.removeAttribute('arco-theme');
    }
}
```

### CSS变量映射
```css
:root {
    --background: var(--vscode-editor-background, 0 0% 100%);
    --foreground: var(--vscode-editor-foreground, 0 0% 3.9%);
    --primary: var(--vscode-button-background, 0 0% 9%);
    /* ... 更多变量映射 */
}

/* Arco Design 暗黑模式 CSS 变量 */
body[arco-theme="dark"] {
    --color-bg-1: var(--color-background);
    --color-bg-2: var(--color-card);
    --color-text-1: var(--color-foreground);
    --color-text-2: var(--color-muted-foreground);
    --color-border: var(--color-border);
    color-scheme: dark;
}

/* 强制覆盖Arco Design组件样式 */
body[arco-theme="dark"] .arco-menu,
body[arco-theme="dark"] .arco-layout-sider-trigger {
    background-color: var(--color-background) !important;
    color: var(--color-foreground) !important;
}
```

### 主题变化监听
```javascript
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            applyTheme();
        }
    });
});
```

## 测试方法

1. 在 VSCode 中切换主题（Ctrl+K Ctrl+T）
2. 打开插件的设置页面
3. 观察页面颜色是否正确适配新主题
4. 测试浅色、深色和高对比度三种主题

## 修复记录

### 2024-12-19: Arco Design 完整主题适配

**问题**: Arco Design 组件（特别是 `arco-menu-inline` 和 `arco-layout-sider-trigger`）在深色模式下仍显示为白色，未能完全适配 VSCode 颜色主题

**根本原因**: 
- 缺少 Arco Design 官方暗黑模式支持
- 未设置 `body` 标签的 `arco-theme` 属性
- 缺少 Arco Design 暗黑模式所需的 CSS 变量

**完整解决方案**:

1. **settings-view-html-provider.ts**: 添加 Arco Design 主题属性自动设置
   ```javascript
   // 设置Arco Design主题
   if (theme === 'dark' || theme === 'high-contrast') {
       body.setAttribute('arco-theme', 'dark');
   } else {
       body.removeAttribute('arco-theme');
   }
   ```

2. **index.css**: 添加 Arco Design 暗黑模式 CSS 变量映射
   ```css
   body[arco-theme="dark"] {
       --color-bg-1: var(--color-background);
       --color-text-1: var(--color-foreground);
       --color-border: var(--color-border);
       color-scheme: dark;
   }
   ```

3. **强制样式覆盖**: 确保所有 Arco Design 组件正确显示
   ```css
   body[arco-theme="dark"] .arco-menu,
   body[arco-theme="dark"] .arco-layout-sider-trigger {
       background-color: var(--color-background) !important;
       color: var(--color-foreground) !important;
   }
   ```

4. **组件级别适配**: 为各种表单控件添加主题适配
   - SettingsMenu.tsx: ArcoMenu 组件
   - SettingsContent.tsx: Input, Select, Switch, Button, Collapse 组件
   - weekly-report-page.tsx: RangePicker 和 ArcoSelect 组件

**结果**: 
- ✅ 所有 Arco Design 组件完全适配 VSCode 主题
- ✅ 自动跟随 VSCode 主题切换（浅色/深色/高对比度）
- ✅ 实时响应主题变化，无需刷新
- ✅ 保持与 VSCode UI 的视觉一致性

## 注意事项

- 确保 webview-ui 项目已重新构建（`npm run build`）
- 某些第三方组件可能需要额外的样式调整
- 如果发现颜色不匹配，可以在 CSS 中调整对应的变量映射