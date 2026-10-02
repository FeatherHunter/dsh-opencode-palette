# Security Policy

## 支持的版本

| 版本 | 是否支持安全更新 |
| ---- | ---------------- |
| 2.0.x（当前大版本最新补丁） | ✅ |
| < 2.0 | ❌（请先升级到 2.0.x 再验证问题是否仍然存在） |

## 报告漏洞

首选 **GitHub Security Advisories** 私下报告（本仓库主页 → Security → Report a vulnerability），
请勿在公开 Issue 里直接贴可利用的 PoC。

- 仓库：https://github.com/FeatherHunter/dsh-opencode-palette
- 公开 Issue（仅限不涉及利用细节的问题）：https://github.com/FeatherHunter/dsh-opencode-palette/issues

报告请包含：受影响版本、复现步骤（最小复现优先）、影响范围判断、是否涉及用户数据。

## 响应目标

- 确认收到：目标 7 个自然日内。
- 修复与发布：确认属实后按 semver 发补丁版本，并在 Release 正文里说明影响与验证结果；
  高危问题优先处理。

## 范围

- 本仓库的自有代码（含 `src/`、`runtime/`、构建脚本与测试）。
- 上游依赖（如 `dsh-log`、`dsh-plugin-update`、`react`）的问题请同步向上游报告，
  本仓库只跟进需要本侧配合升级或规避的部分。
- 第三方清单（如 awesome-ai-plugins）的扫描策略与合并门槛归对方仓库，不在本政策范围内。
