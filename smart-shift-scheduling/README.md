# 2CE Milk Tea & Tea · Đăng ký và xếp lịch ca làm việc

Ứng dụng hỗ trợ nhân viên đăng ký ca, xem lịch làm việc, gửi đơn xin nghỉ và xem tổng hợp giờ được phân công. Quản lý theo dõi đăng ký, chạy xếp ca tự động, kiểm tra nhân sự còn thiếu và xử lý đơn nghỉ. Backend điều phối quy trình bằng bốn giai đoạn và các tác vụ hẹn giờ.
## Công nghệ và cấu trúc

| Thành phần | Công nghệ / vị trí |
| --- | --- |
| Giao diện | HTML, CSS, JavaScript thuần: `index.html`, `style.css`, `app.js` |
| Máy chủ API | Node.js 24.x, Express: `server.js` |
| Xác thực | JWT; tài khoản mẫu trong `src/services/auth.service.js` |
| Cơ sở dữ liệu | Supabase PostgreSQL; cấu trúc và dữ liệu mẫu trong `schema.sql` |
| Chế độ local | Các tệp JSON trong `data/` và danh sách mẫu trong services |
| Tự động hóa | node-cron: `src/jobs/cronEngine.js` |
| Email | Nodemailer: `src/config/email.js`, `src/services/email.service.js` |
| Phân lớp backend | `src/routes/` → `src/controllers/` → `src/services/` |
| Logo tab | `assets/logo-2ce.png` |

## Chạy trên máy bằng VS Code

1. Cài Node.js 24.x. Giải nén và mở thư mục có `package.json` bằng **File → Open Folder** trong VS Code.
2. Mở **Terminal → New Terminal**. Kiểm tra `node -v`, `npm -v`.
3. Cài thư viện bằng `npm ci`.
4. Sao chép `.env.example` thành `.env`. Trong PowerShell dùng `Copy-Item .env.example .env`.
5. Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên riêng. Giữ trống ba biến Supabase để thử local; giữ trống SMTP để không cấu hình gửi email thật.
6. Chạy `npm start` và mở http://localhost:5000.
7. Kiểm tra http://localhost:5000/api/health; kết quả dự kiến có `status: ONLINE`.
### Tài khoản thử

Mã quản lý: `QL`; mã nhân viên: `NV01` đến `NV18`. Bản nguồn hiện hỗ trợ mật khẩu demo `123` hoặc `123456`. Chỉ dùng để thử nghiệm; đây không phải cơ chế xác thực đủ cho vận hành công khai. Alias `admin` hiện trỏ tới quản lý, không chứng minh có màn hình quản trị tài khoản riêng.

## Quy trình và quy tắc trong bản hiện tại

- Có ba bộ phận nhân viên: Bếp, Phục vụ, Pha chế; bộ mẫu gồm 18 nhân viên và một quản lý.
- Có 21 khung ca mỗi tuần: sáng 09:00–13:00 (4 giờ), chiều 13:00–17:00 (4 giờ), tối 17:00–23:00 (6 giờ).
- Giao diện đăng ký ban đầu yêu cầu nhân viên tối thiểu 20 giờ và 2 ca tối. Quản lý có ngoại lệ trong giao diện.
- Định biên khai báo: sáng 1 Pha chế; chiều 1 Bếp và 1–2 Pha chế; tối 2 Bếp, 2 Phục vụ và 2–3 Pha chế.
- Thuật toán xếp ca dựa trên đăng ký, bộ phận và số giờ đã được phân công, ưu tiên người ít giờ hơn. Nhãn “AI” trong giao diện là thuật toán quy tắc, không phải mô hình học máy được huấn luyện.
- Điểm đánh giá lịch được tính từ tỷ lệ ca đạt định biên (60%) và độ cân bằng giờ (40%). Đây là điểm theo công thức nội bộ, không phải xác suất đúng của mô hình.
- Giai đoạn 1 mở đăng ký; giai đoạn 2 xếp ca; nếu cả 21 ca đủ người và điểm ≥80 thì sang giai đoạn 4, nếu chưa đạt thì sang giai đoạn 3 để bổ sung.
- Giai đoạn 3 có thời hạn mặc định 5 giờ (`COUNTDOWN_HOURS`). Khi hết hạn, backend chạy lại xếp ca và chuyển giai đoạn 4; lịch vẫn cần được kiểm tra thiếu người.
- Cron hiện đặt mở đăng ký lúc 07:00 thứ Bảy, đóng đăng ký và xếp ca lúc 07:00 Chủ nhật. Đặt `TZ=Asia/Ho_Chi_Minh` để tiến trình dùng giờ Việt Nam. Cron chỉ chạy khi tiến trình còn hoạt động.
- Có đơn xin nghỉ, duyệt/từ chối và logic tìm người thay thế; có API tổng hợp ca/giờ. Giờ được phân công không phải dữ liệu chấm công thực tế. Chưa có cơ chế tính lương trong bản này.

## Kết nối Supabase

Điền các biến sau vào `.env` ở máy hoặc **Environment** của dịch vụ Render:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Cơ sở dữ liệu có các bảng `users`, `shifts`, `registrations`, `leave_requests`, `system_state`. Với project mới dùng thử: mở SQL Editor của Supabase và chạy `schema.sql`, sau đó kiểm tra đăng nhập, đăng ký, xếp ca và lưu lại dữ liệu. Không chạy seed vào cơ sở dữ liệu đang sử dụng trước khi sao lưu và xem các lệnh cập nhật trong script


## Deploy Render

Dùng **Web Service**, vì dự án có backend Node.js. Các bước chi tiết, cách thay code cũ và kiểm tra sau deploy ở [HUONG_DAN_VS_CODE_RENDER.md](HUONG_DAN_VS_CODE_RENDER.md).

| Trường | Giá trị |
| --- | --- |
| Name đề xuất | `2cemilktedanang` (giữ đúng tên người dùng yêu cầu) |
| Runtime | Node |
| Branch | Nhánh đã đẩy code mới, ví dụ `main` |
| Root Directory | Trống nếu `package.json` ở gốc repo; `smart-shift-scheduling` nếu repo chứa thư mục này |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Đặt `NODE_ENV=production`, `TZ=Asia/Ho_Chi_Minh`, `JWT_SECRET` riêng. Để Render cấp `PORT`; server đã đọc `process.env.PORT` và lắng nghe `0.0.0.0`.

Địa chỉ mong muốn là `https://2cemilktedanang.onrender.com`, chỉ có hiệu lực nếu Render cấp đúng subdomain còn trống. Thay `<title>` hay tên thư mục không thay URL. Tên miền riêng có đuôi `.com`/`.vn` cần sở hữu tên miền và cấu hình DNS.

Render Free có thể ngủ sau 15 phút không có truy cập; cron trong tiến trình không được bảo đảm chạy đúng giờ khi dịch vụ ngủ. Dữ liệu JSON ghi ở ổ đĩa tạm không bền sau restart/redeploy. Các cổng SMTP 25/465/587 bị chặn trên Free, nên Gmail SMTP theo mẫu không gửi được trong cấu hình này. Muốn dùng thật cần lưu trữ bền vững, tiến trình luôn hoạt động hoặc cơ chế hẹn giờ bên ngoài, cùng phương án email tương thích.

Tài liệu nền tảng: [Express trên Render](https://render.com/docs/deploy-node-express-app), [Web Services](https://render.com/docs/web-services), [Giới hạn Free](https://render.com/docs/free), [Custom Domains](https://render.com/docs/custom-domains).

## Kiểm tra và giới hạn đã biết

- Đã kiểm tra local: trang HTML, CSS, JavaScript, logo tab và `/api/health` trả HTTP 200; đăng nhập bằng tài khoản local hoạt động.
- Đã chặn truy cập HTTP trực tiếp vào mã nguồn backend, dữ liệu JSON, schema và cấu hình bằng cách thay phục vụ toàn thư mục bằng danh sách tệp giao diện được phép.
- Chạy `node scratch/test_backend.js`: bộ kiểm thử có sẵn hiện thất bại ở kiểm tra ca sáng thêm người Bếp phải bị từ chối. Đây là mâu thuẫn có sẵn giữa kiểm thử và bộ kiểm tra định biên, chưa được sửa trong phạm vi đổi nhận diện và tài liệu.
- Chưa kiểm chứng trên Render thật, Supabase thật, SMTP thật hoặc đầy đủ quy trình bằng trình duyệt. Không coi kết quả kiểm tra giao diện/API local là xác nhận toàn bộ nghiệp vụ đã đúng.
- Bản hiện tại có tài khoản/mật khẩu seed, chấp nhận mật khẩu demo và secret mặc định trong mã nguồn. Đặt `NODE_ENV=production` không tự vô hiệu hóa các đường đăng nhập này. Cần sửa xác thực trước khi dùng với dữ liệu và nhân sự thật.
- Schema đăng ký chưa có khóa tuần riêng; không áp dụng các cam kết tách dữ liệu nhiều tuần của README tham khảo cho bản này nếu chưa xác minh.






# 2CE Milk Tea & Tea · Đăng ký và xếp ca theo tuần

Ứng dụng giúp nhân viên đăng ký ca rảnh, xem lịch làm việc cá nhân và gửi đơn xin nghỉ. Quản lý theo dõi tiến độ đăng ký, chạy xếp ca tự động, kiểm tra ca còn thiếu người và duyệt/từ chối đơn nghỉ. Backend điều phối quy trình bốn giai đoạn bằng tác vụ hẹn giờ. **Giờ được xếp là giờ theo kế hoạch**. Ứng dụng chưa có chấm công hay tính lương.

## Công nghệ và cấu trúc

| Thành phần | Công nghệ / vị trí |
| --- | --- |
| Giao diện | HTML, CSS, JavaScript thuần: `index.html`, `style.css`, `app.js` |
| Máy chủ API | Node.js, Express: `server.js` |
| Phân lớp backend | `src/routes/` → `src/controllers/` → `src/services/` |
| Xác thực | JWT (hạn 7 ngày); danh sách tài khoản mẫu trong `src/services/auth.service.js` |
| Phân quyền | `verifyToken`, `requireRole` trong `src/middlewares/auth.js` |
| Cơ sở dữ liệu | Supabase PostgreSQL; cấu trúc và dữ liệu mẫu trong `schema.sql` |
| Chế độ local | Tệp JSON trong `data/` và danh sách mẫu trong services |
| Tự động hóa | node-cron: `src/jobs/cronEngine.js` |
| Thuật toán xếp ca | `src/services/aiScheduling.service.js` |
| Email | Nodemailer: `src/config/email.js`, `src/services/email.service.js` |
| Kiểm thử có sẵn | `scratch/test_backend.js` |
| Chạy nhanh trên Windows | `Chay-He-Thong.bat` |

## Chạy demo trên máy

Dùng Node.js 22 trở lên (đã chạy thử trên 22.22) và npm. Giải nén gói, mở thư mục có `package.json` bằng VS Code, rồi chạy trong Terminal:

```sh
npm ci
cp .env.example .env
npm start
```

Trong PowerShell dùng `Copy-Item .env.example .env`. Trên Windows có thể bấm đúp `Chay-He-Thong.bat` để chạy server và tự mở trình duyệt.

Mở **http://localhost:5000** và kiểm tra **http://localhost:5000/api/health**; kết quả mong đợi có `"status":"ONLINE"`. Để trống ba biến `SUPABASE_*` thì server chạy chế độ local và ghi dữ liệu vào `data/*.json`. Để trống `SMTP_*` thì email chỉ được ghi ra console.

**Tài khoản thử.** Ô đăng nhập nhận email đầy đủ hoặc mã nhân sự: `QL` (Quản lý), `NV01`–`NV18`. Mã `quanly` và `admin` đều trỏ tới `QL`. Mật khẩu 6 số của từng tài khoản nằm trong `src/services/auth.service.js`. Ngoài ra mật khẩu `123` và `123456` được chấp nhận cho **mọi** tài khoản mẫu. Chỉ dùng để thử nghiệm. Bộ mẫu có 1 quản lý và 18 nhân viên (6 Bếp, 3 Phục vụ, 9 Pha chế). Chưa có tài khoản Admin; vai trò `Admin` chỉ tồn tại trong schema và kiểm tra quyền.

1. Mở hai cửa sổ: một cửa sổ thường và một cửa sổ riêng tư để giữ hai phiên đăng nhập độc lập. Đăng nhập `NV01` (Bếp) ở một bên và `QL` ở bên còn lại.
2. Ở giai đoạn 1, NV01 chọn các ca mà bộ phận Bếp được phép đăng ký (chiều và tối), tối thiểu 20 giờ và 2 ca tối, rồi gửi đơn. Mỗi lần gửi **thay thế toàn bộ** đăng ký cũ của người đó.
3. Quản lý xem tiến độ nộp lịch của 18 nhân viên, bấm chạy xếp ca, rồi xem điểm đánh giá, số ca thiếu và lịch dạng ma trận.
4. Nhân viên xem lịch cá nhân, chọn một ca đã được xếp để gửi đơn xin nghỉ. Quản lý duyệt hoặc từ chối.

**Trạng thái dữ liệu có sẵn trong gói.** `data/localSystemState.json` đang ở giai đoạn 4 với điểm 100, `data/localRegistrations.json` có 102 dòng (74 dòng đã xếp, 19 người) và `data/localLeaveRequests.json` có 4 đơn. Muốn thử từ đầu, dừng server rồi đặt `current_phase` về `1`, `countdown_end_time` về `null`, và đưa `localRegistrations.json`, `localLeaveRequests.json` về `[]`. Hãy sao lưu các tệp trước khi sửa. Ở chế độ local, dữ liệu **vẫn được giữ sau khi tắt server** vì được ghi ra đĩa.

## Quy tắc của bản hiện tại

- **Ca và định biên.** Mỗi tuần có 21 khung ca (7 ngày × 3 ca): sáng 09:00–13:00 (4 giờ), chiều 13:00–17:00 (4 giờ), tối 17:00–23:00 (6 giờ). Định biên: sáng 1 Pha chế; chiều 1 Bếp và 1–2 Pha chế; tối 2 Bếp, 2 Phục vụ và 2–3 Pha chế. Bộ phận Phục vụ chỉ đăng ký được ca tối, Bếp chỉ chiều và tối, Pha chế được cả ba ca. Quy tắc này được kiểm tra ở mọi giai đoạn đối với nhân viên.
- **Giai đoạn 1 — đăng ký.** Nhân viên gửi đơn cần ≥20 giờ và ≥2 ca tối. Quy tắc 20 giờ/2 ca tối chỉ được kiểm tra ở giai đoạn 1 và nằm ở server.
- **Giai đoạn 2 — xếp ca.** Cổng đăng ký đóng với nhân viên (quản lý vẫn đăng ký được). Hệ thống chạy thuật toán xếp ca. Với từng ca, thuật toán chia ứng viên theo bộ phận rồi chọn người đang có **ít giờ được xếp nhất** trước, tối đa đến mức trần của ca (1 / 1 Bếp + 2 Pha chế / 2 Bếp + 2 Phục vụ + 3 Pha chế). Ca mà quản lý đã đăng ký được thêm vào lịch và cũng được tính là lấp chỗ thiếu của bất kỳ bộ phận nào. Thuật toán **không** xét lại ngưỡng 20 giờ khi xếp. Nhãn "AI" trong giao diện là thuật toán quy tắc kiểu tham lam, không phải mô hình học máy.
- **Điểm đánh giá lịch.** Điểm = 60% tỷ lệ ca đạt định biên tối thiểu + 40% độ cân bằng giờ giữa các nhân viên (tính từ hệ số biến thiên của tổng giờ, giới hạn 0–100). Đây là công thức nội bộ, không phải xác suất đúng của mô hình.
- **Rẽ nhánh sau khi xếp.** Nếu cả 21 ca đủ định biên **và** điểm ≥80 thì sang giai đoạn 4. Nếu không thì sang giai đoạn 3.
- **Giai đoạn 3 — bổ sung.** Có thời hạn mặc định 5 giờ (`COUNTDOWN_HOURS`). Nhân viên gửi thêm ca, các ca này **được ghi thẳng vào lịch chính thức, không cần quản lý duyệt**. Lịch đã xếp trước đó của người đó được giữ nguyên. Khi hết hạn, cron chạy lại xếp ca và chuyển sang giai đoạn 4, **kể cả khi vẫn còn thiếu người**.
- **Giai đoạn 4 — lịch chính thức.** Nhân viên xem lịch và gửi đơn xin nghỉ cho ca mình được xếp. Quản lý duyệt hoặc từ chối. Khi duyệt, hệ thống tìm người thay có tổng giờ thấp nhất và gửi email thông báo. Đơn đã xử lý không xử lý lại được.
- **Quản lý.** Có thể nhận hoặc rút ca của chính mình ở mọi giai đoạn, ca nhận được ghi thẳng vào lịch. Không bị áp quy tắc 20 giờ/2 ca tối.
- **Hẹn giờ.** Cron mở đăng ký lúc 07:00 thứ Bảy; đóng đăng ký và xếp ca lúc 07:00 Chủ nhật; mỗi phút kiểm tra hết hạn của giai đoạn 3. Khi khởi động, server tự bù bước bị lỡ (sang Chủ nhật sau 07:00 mà vẫn ở giai đoạn 1, hoặc giai đoạn 3 đã quá hạn). Cron theo giờ của máy chạy tiến trình, nên đặt `TZ=Asia/Ho_Chi_Minh`. Cron chỉ chạy khi tiến trình còn hoạt động.
- **Bảng tổng hợp giờ.** `GET /api/shifts/timesheet` trả bảng nhân viên × tuần theo giờ được phân công. Tham số mặc định đang cố định là năm 2026, tháng 10. Đây không phải chấm công thực tế.

### API chính

| Phương thức | Đường dẫn | Quyền |
| --- | --- | --- |
| POST | `/api/auth/login` | Công khai |
| GET | `/api/auth/me` | Đã đăng nhập |
| GET | `/api/system/state` | Đã đăng nhập |
| GET | `/api/shifts`, `/api/shifts/registration-progress`, `/api/shifts/timesheet` | Đã đăng nhập |
| POST | `/api/shifts/register` | Đã đăng nhập |
| POST | `/api/shifts/auto-schedule` | Đã đăng nhập, **chưa giới hạn vai trò** |
| GET | `/api/leave/requests` | Đã đăng nhập |
| POST | `/api/leave/request` | Đã đăng nhập |
| PUT | `/api/leave/approve/:id`, `/api/leave/reject/:id` | Manager, Admin |
| GET | `/api/health` | Công khai |

## Kết nối Supabase

1. Tạo project Supabase riêng. Mở **SQL Editor** và chạy `schema.sql`. Script tạo 5 bảng `users`, `shifts`, `registrations`, `leave_requests`, `system_state`, nạp 21 ca và 19 tài khoản mẫu.
2. Điền các biến sau vào `.env` (hoặc phần Environment của dịch vụ triển khai). Lấy ở **Project Settings → API**:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_ANON_KEY=YOUR_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   JWT_SECRET=CHUOI_NGAU_NHIEN_RIENG
   ```

   `SUPABASE_SERVICE_ROLE_KEY` bỏ qua RLS, chỉ đặt ở môi trường server và không đưa lên Git.
3. Khởi động lại `npm start`. Console hết báo chế độ Local / Seed Data nghĩa là đã nhận cấu hình. Kiểm tra đăng nhập, đăng ký, xếp ca và tải lại trang để xác nhận dữ liệu được lưu.
4. **Không chạy `schema.sql` trên cơ sở dữ liệu đang dùng** trước khi sao lưu: script ghi đè quota của 21 ca và cập nhật hồ sơ người dùng khi trùng email.

Lưu ý khi dùng Supabase thật: đăng nhập vẫn đối chiếu với danh sách `SEED_USERS` trong mã, không kiểm tra `password_hash` trong bảng `users`. Bảng `registrations` chưa có cột tuần nên mọi tuần dùng chung một tập đăng ký. Nhiều đoạn ghi dữ liệu bỏ qua lỗi (khối `catch` rỗng), nên một lần ghi Supabase thất bại sẽ không báo lỗi cho người dùng.

## Email

Cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` trong `.env`. Nếu không gửi được, nội dung email được in ra console và API vẫn trả kết quả bình thường. Email được gửi khi có đơn xin nghỉ mới và khi đơn được duyệt hoặc từ chối. Với tài khoản mẫu, địa chỉ email của đa số nhân viên là địa chỉ giả; chỉ một số ít là địa chỉ thật.

## Kiểm thử và triển khai

```sh
node scratch/test_backend.js
```

Bộ kiểm thử có sẵn hiện **thất bại** ở kiểm tra "Ca Sáng có thêm Bếp phải không hợp lệ". Nguyên nhân: `isShiftQuotaMet` chỉ xét định biên **tối thiểu**, còn kiểm thử mong đợi định biên đúng bằng. Cần quyết định theo quy tắc nghiệp vụ rồi sửa mã hoặc sửa kiểm thử. Chưa có kiểm thử cho giao diện, cron, email, Supabase thật hay luồng đơn nghỉ.

Để triển khai, cần dịch vụ chạy tiến trình Node liên tục (ví dụ Render Web Service): Build Command `npm ci`, Start Command `npm start`, Health Check `/api/health`, đặt `NODE_ENV=production`, `TZ=Asia/Ho_Chi_Minh`, `JWT_SECRET` riêng và để nền tảng cấp `PORT`. Gói này chưa có cấu hình triển khai và chưa có bằng chứng triển khai thật. Gói miễn phí có thể cho dịch vụ ngủ khi không có truy cập, khi đó cron không đảm bảo chạy đúng giờ. Dữ liệu JSON ghi trên ổ đĩa tạm sẽ mất khi khởi động lại, vì vậy chạy thật cần Supabase. Nhiều nền tảng miễn phí chặn cổng SMTP, cần kiểm tra trước khi dựa vào email.
//thay kiểm thử bằng này hợp lý hân//
- Đã kiểm tra local: trang HTML, CSS, JavaScript, logo tab và `/api/health` trả HTTP 200; đăng nhập bằng tài khoản local hoạt động.
- Đã chặn truy cập HTTP trực tiếp vào mã nguồn backend, dữ liệu JSON, schema và cấu hình bằng cách thay phục vụ toàn thư mục bằng danh sách tệp giao diện được phép.
- Chạy `node scratch/test_backend.js`: bộ kiểm thử có sẵn hiện thất bại ở kiểm tra ca sáng thêm người Bếp phải bị từ chối. Đây là mâu thuẫn có sẵn giữa kiểm thử và bộ kiểm tra định biên, chưa được sửa trong phạm vi đổi nhận diện và tài liệu.
- Chưa kiểm chứng trên Render thật, Supabase thật, SMTP thật hoặc đầy đủ quy trình bằng trình duyệt. Không coi kết quả kiểm tra giao diện/API local là xác nhận toàn bộ nghiệp vụ đã đúng.
- Bản hiện tại có tài khoản/mật khẩu seed, chấp nhận mật khẩu demo và secret mặc định trong mã nguồn. Đặt `NODE_ENV=production` không tự vô hiệu hóa các đường đăng nhập này. Cần sửa xác thực trước khi dùng với dữ liệu và nhân sự thật.
- Schema đăng ký chưa có khóa tuần riêng; không áp dụng các cam kết tách dữ liệu nhiều tuần của README tham khảo cho bản này nếu chưa xác minh.
