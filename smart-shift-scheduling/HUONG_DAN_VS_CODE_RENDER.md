# Hướng dẫn thay code, chạy VS Code và deploy Render

## 1. Chuẩn bị bản mới

1. Giữ lại thư mục code cũ làm bản sao lưu. Không xóa dịch vụ Render hoặc database.
2. Giải nén ZIP đã chỉnh vào một thư mục mới, ví dụ `D:\2CE-new\smart-shift-scheduling`.
3. Mở VS Code → File → Open Folder → chọn thư mục có `package.json`, `server.js`, `index.html`.
4. Terminal → New Terminal. Chạy lần lượt:

```powershell
node -v
npm -v
npm ci
Copy-Item .env.example .env
```

Cài Node.js 24.x và mở lại VS Code nếu không nhận lệnh node/npm. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd ci` và `npm.cmd start`, hoặc đổi Terminal sang Command Prompt.

5. Mở `.env`: thay JWT_SECRET bằng secret riêng; giữ trống Supabase/SMTP để thử local. Muốn dùng database của nhóm thì lấy đúng cấu hình của nhóm, không chép nhầm project cũ.
6. Chạy:

```powershell
npm start
```

7. Mở http://localhost:5000. Không chọn Go Live. Thử `QL` và `NV01` ở hai cửa sổ trình duyệt độc lập. Mật khẩu demo theo README; không dùng cơ chế demo cho vận hành thật.
8. Đối chiếu tab có tên “2CE Milk Tea & Tea”, logo 2CE, rồi mở http://localhost:5000/api/health.
9. Dừng bằng Ctrl+C. Nếu cổng 5000 đã có tiến trình khác, dừng server cũ hoặc đổi PORT trong `.env`, rồi mở đúng cổng mới.

## 2. Hiểu chỗ sửa tên và logo

Trong `<head>` của `index.html` đã có:

```html
<title>2CE Milk Tea &amp; Tea</title>
<link rel="icon" type="image/png" href="/assets/logo-2ce.png?v=1">
```

`&amp;` hiển thị thành dấu `&` trên tab. File ảnh nằm tại `assets/logo-2ce.png`. Đây là favicon trên tab, không thay toàn bộ ảnh banner hoặc nội dung thương hiệu bên trong trang.

Nếu logo chưa đổi: mở `/assets/logo-2ce.png?v=1` để xem có đúng ảnh không, đóng tab cũ, mở lại hoặc thử cửa sổ riêng tư. Khi thay ảnh lần nữa, tăng `v=1` thành `v=2`.

## 3. Đưa bản mới lên GitHub

VS Code là nơi mở/sửa/chạy code. Render lấy code từ GitHub; chỉ lưu file trong VS Code chưa làm web online thay đổi.

### Nếu tiếp tục repo đang kết nối Render

1. Dùng một bản clone mới nhất của repo cũ và một nhánh cập nhật riêng. Trong VS Code có thể dùng Ctrl+Shift+P → Git: Clone → dán URL repo của chính bạn. Không dùng URL ví dụ của README mẫu.
2. Sao lưu/commit các thay đổi đang có trước khi thay code. Không ghi đè thay đổi chưa lưu của thành viên khác.
3. Chép toàn bộ mã nguồn bản mới vào bản clone. Giữ thư mục `.git` của repo. Không chép `node_modules` hoặc `.env` thật. So sánh và loại tệp ứng dụng cũ đã bị thay thế; đừng chỉ chép ba tệp giao diện vì backend cũng đã đổi.
4. Bảo đảm `.gitignore` mới có mặt. Nếu trước đây đã đưa `.env`/node_modules lên Git, cần ngừng theo dõi các mục đó và thay key đã lộ.
5. Mở Source Control, xem diff trước khi stage. Kiểm tra không có key thật, thư mục dependency hoặc các tệp riêng ngoài dự án.
6. Commit, Push nhánh cập nhật và merge vào nhánh mà Render theo dõi sau khi kiểm tra. Nếu dùng terminal, chỉ stage các đường dẫn đã xem, tránh `git add .` khi chưa biết có gì trong thư mục.

### Nếu dùng repo mới cho bản viết lại

1. Tạo repository GitHub riêng tư mới, ví dụ `2ce-milk-tea-scheduling`.
2. Trong thư mục mới, Source Control → Initialize Repository; kiểm tra danh sách rồi commit và Publish Branch lên repo riêng tư đó.
3. Chưa kèm `.env` và `node_modules`; README đã nằm ở gốc thư mục dự án.
4. Trên Render, đổi Repository của dịch vụ hiện có nếu giao diện cho phép, hoặc tạo Web Service mới nối repo này. Không cần xóa dịch vụ cũ trước.

## 4. Cấu hình Render

1. Mở https://dashboard.render.com. Để cập nhật web cũ, chọn đúng dịch vụ → kiểm tra repository và branch trong Settings.
2. Chọn Web Service chạy Node, không phải Static Site. Nếu dịch vụ cũ là Static Site thì tạo Web Service cho bản backend này.
3. Root Directory phải trỏ đến thư mục có package.json. Nếu package.json nằm ngay gốc repo thì để trống. Nếu nó nằm trong thư mục `smart-shift-scheduling/` thì nhập tên thư mục đó.
4. Build Command: `npm ci`. Start Command: `npm start`. Health Check Path: `/api/health`.
5. Environment: đặt NODE_ENV=production, TZ=Asia/Ho_Chi_Minh và JWT_SECRET riêng. Không cần cố định PORT=5000 trên Render.
6. Nếu dùng Supabase: điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY đúng project. Đảm bảo các bảng đã sẵn sàng. Không chạy schema seed vào database đang dùng nếu chưa sao lưu và kiểm tra.
7. Email là phần riêng: Render Free chặn các cổng SMTP phổ biến trong cấu hình mẫu. Không coi đăng nhập được là email gửi được.
8. Chọn Manual Deploy → Deploy latest commit nếu cần triển khai thủ công. Nếu đã bật auto deploy, lần push vào nhánh theo dõi sẽ kích hoạt triển khai.
9. Đọc Logs. Khi chạy thành công, mở URL Render cấp và `/api/health`; thử đăng nhập nhân viên/quản lý, đăng ký và tải lại, xếp ca và kiểm tra dữ liệu đã lưu đúng nơi.
10. Chỉ coi là lưu bền khi xác minh bản ghi thực sự trong Supabase và dữ liệu còn sau restart/redeploy. Health check không kiểm chứng database hoặc SMTP.

## 5. Đặt địa chỉ theo tên yêu cầu

Tên người dùng yêu cầu: **2CEMILKTEDANANG**. Phần địa chỉ tương ứng viết thường: **2cemilktedanang**. Giữ nguyên cách viết này; không tự sửa thành một tên khác.

Với dịch vụ mới: Name đặt `2cemilktedanang`. Địa chỉ mong muốn là `https://2cemilktedanang.onrender.com` nếu còn trống và Render cấp đúng tên. Luôn dùng URL thực tế hiện trong Dashboard, vì Render có thể thêm hậu tố nếu trùng tên.

Với dịch vụ cũ: kiểm tra Settings và URL hiện có. Không suy ra việc đổi tên hiển thị dịch vụ đã đổi URL. Nếu URL vẫn cũ và không có tùy chọn đổi subdomain, có thể tạo Web Service mới cùng repo với tên mong muốn, cấu hình lại môi trường và kiểm tra trước khi ngừng dịch vụ cũ. Không cần xóa database.

Nếu hai dịch vụ dùng chung database, tránh để cả hai cron chạy đồng thời: thử bản mới bằng database staging hoặc dùng thời điểm chuyển đổi có kiểm soát. Khi bản mới ổn, chuyển người dùng sang link mới và ngừng dịch vụ cũ để không chạy xếp lịch hai lần.

Muốn tên miền riêng như `2cemilktedanang.com` thì cần đăng ký tên miền đó, thêm trong Settings → Custom Domains và cấu hình DNS theo chỉ dẫn Render. Chuỗi `2CEMILKTEDANANG` tự nó chưa phải tên miền đầy đủ.

## 6. Phạm vi đã kiểm tra

Đã kiểm tra local: HTTP trang, tài nguyên, favicon, health, đăng nhập demo và chặn tải trực tiếp các tệp backend/data. Chưa deploy vào tài khoản Render của bạn. Bộ test nghiệp vụ có sẵn thất bại ở trường hợp ca sáng có thêm nhân viên Bếp; xem README. Xác thực demo, lưu JSON tạm và cron khi Render Free ngủ cần được xử lý trước vận hành thật.
