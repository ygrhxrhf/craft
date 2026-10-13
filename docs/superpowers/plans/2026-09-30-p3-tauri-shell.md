# P3 Tauri 桌面壳 Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 补齐 Windows 桌面壳，见 spec 第8章

## Global Constraints
- debounce 2000ms / 队列50 / 批200 / 2MB / pull 500/1000 / 墓碑30天 / 附件100MB / 预签名 PUT 10min GET 5min / 更新 启动+4h / 退避 [2s..300s] 3次error / ws 30s / 去抖500ms / sync_events 500ms / minInstances≥1
- D7 零视觉改动

## Tasks
- [x] T0 前置检查
- [x] T1 src-tauri 壳（1280x800, single-instance, window-state, tray, shortcut）
- [x] T2 adapter-sqlite 三跑契约
- [x] T3 platform 真接线
- [x] T4 桌面能力 P0/P1
- [x] T5 安全 CSP/capabilities
- [x] T6 打包
- [ ] T7 验收
