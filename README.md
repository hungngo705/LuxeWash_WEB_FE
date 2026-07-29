# React + Vite

## Cấu hình API

Frontend tách hai nhóm backend trong `.env`:

- `VITE_API_BASE_URL`: API nghiệp vụ, mặc định `https://smartwash-be.onrender.com/api/v1`.
- `VITE_AI_API_BASE_URL`: các endpoint phân tích/gợi ý AI chạy local, mặc định `https://localhost:7063/api/v1`.
- `VITE_CAMERA_AI_BASE_URL`: dịch vụ LPR và camera local, mặc định `https://localhost:7063`.

Máy chạy frontend cần tin cậy chứng chỉ HTTPS local của backend để trình duyệt gọi được API AI/camera.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
