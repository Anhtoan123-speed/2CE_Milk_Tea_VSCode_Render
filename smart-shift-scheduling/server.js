/**
 * ==============================================================================
 * 2CE COFFEE ROASTERY · PRODUCTION BACKEND RESTFUL API & AUTOMATION ENGINE
 * ==============================================================================
 * Node.js & Express.js Backend:
 * - Kiến trúc Clean Architecture (Router -> Controller -> Service)
 * - Tích hợp Supabase (PostgreSQL) & RBAC Phân quyền chặt chẽ
 * - Tự động hóa State Machine BPMN qua node-cron & Thuật toán AI Xếp ca tự động
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');
const shiftRoutes = require('./src/routes/shift.routes');
const leaveRoutes = require('./src/routes/leave.routes');
const systemRoutes = require('./src/routes/system.routes');

const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');
const { initCronJobs } = require('./src/jobs/cronEngine');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Chỉ công khai các tệp giao diện; không phục vụ src/, data/ hoặc cấu hình.
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));

// Gắn kết các API Routes RESTful
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/system', systemRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: '2CE Coffee Scheduling Backend',
    timestamp: new Date().toISOString()
  });
});

// Middleware xử lý 404 & Lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

let server = null;
if (require.main === module) {
  // Khởi động Automation Cron Engine khi chạy server độc lập
  initCronJobs();

  // Khởi chạy HTTP Server
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ☕ ==============================================================
  🚀 2CE COFFEE ROASTERY · BACKEND API RESTFUL ĐÃ KHỞI CHẠY THÀNH CÔNG!
  📡 Server URL: http://localhost:${PORT}
  📑 Health Check: http://localhost:${PORT}/api/health
  ⚙️  Cron Engine: Bật tự động 4 Giai đoạn BPMN (Thứ 7 / Chủ Nhật)
  ==============================================================
    `);
  });
}

module.exports = { app, server, initCronJobs };
