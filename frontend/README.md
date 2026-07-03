# Agent System 前端

本目录是 Agent System 的前端项目，基于 Vue 3 和 Vite 构建，提供学生端、教师端、管理端以及公开展示页面。

## 推荐开发环境

- Node.js 20.19+ 或 22.12+
- VS Code 或 WebStorm
- Vue 官方插件
- Chromium 内核浏览器或 Firefox

## 项目安装

```sh
npm install
```

## 本地开发

```sh
npm run dev
```

默认开发地址通常为：

```text
http://localhost:5173
```

前端默认请求后端：

```text
http://localhost:8080
```

如需修改后端地址，可配置环境变量：

```text
VITE_API_BASE_URL=http://localhost:8080
```

## 生产构建

```sh
npm run build
```

## 本地预览构建结果

```sh
npm run preview
```

## Remotion 视频模块

如需调试教学资源视频生成模块：

```sh
npm run remotion:studio
```

如需渲染视频：

```sh
npm run remotion:render
```

## 主要目录

| 目录 | 说明 |
| --- | --- |
| `src/api` | 前后端接口封装 |
| `src/router` | 页面路由与角色访问控制 |
| `src/views` | 页面视图 |
| `src/components` | 通用组件与业务组件 |
| `src/stores` | Pinia 状态管理 |
| `src/model-center-react` | 模型中心 React 迁移页面 |
| `src/remotion` | 教学资源视频渲染模块 |
