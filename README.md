# Quản lý gây quỹ Xuân Yêu Thương 2027 — Vercel + Google Apps Script

## Kiến trúc

- **Vercel** host giao diện `index.html` và API proxy `api/gas.js`.
- **Google Apps Script Web App** xử lý nghiệp vụ và đọc/ghi Google Sheets.
- **Google Sheets hiện tại** tiếp tục là nơi lưu dữ liệu. Không tạo database mới.

## 1. Cấu hình Google Apps Script

1. Mở dự án Apps Script đang gắn với Google Sheets hiện tại.
2. Thay nội dung `Code.gs` bằng tệp `Code.gs` trong repository này. Không xóa các sheet hiện có.
3. Trong Project Settings, bật hiển thị `appsscript.json` nếu cần; đối chiếu cấu hình `appsscript.json`.
4. Chạy `setupSystem()` một lần bằng tài khoản có quyền chỉnh sửa spreadsheet để cấp quyền. Hàm này chỉ tạo sheet nếu thiếu và thêm tiêu đề khi sheet đang trống.
5. Chọn **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Deploy và sao chép URL kết thúc bằng `/exec`.

> Web App được để Anyone vì Vercel cần gọi API server-to-server. Các thao tác dữ liệu vẫn yêu cầu token đăng nhập do backend kiểm tra. Không chia sẻ URL triển khai như một bí mật.

## 2. Đưa mã nguồn lên GitHub

1. Tạo repository mới, tốt nhất đặt **Private**.
2. Upload toàn bộ thư mục này lên repository (giữ nguyên thư mục `api/`).
3. Không đưa mật khẩu, token hay dữ liệu Google Sheets vào GitHub.

## 3. Deploy Vercel

1. Vào Vercel, chọn **Add New → Project** và Import repository GitHub.
2. Framework Preset: **Other**.
3. Root Directory: thư mục gốc repository.
4. Thêm Environment Variable:
   - Name: `GAS_WEB_APP_URL`
   - Value: URL Web App Apps Script kết thúc bằng `/exec`
5. Deploy.

Không đặt URL Apps Script trong HTML; Vercel Function giữ URL ở phía server.

## 4. Tài khoản và bảo mật

Mã backend gốc khởi tạo tài khoản mặc định `admin` / `Xyt2027@Admin` nếu chưa có thông tin quản trị trong Script Properties. Đăng nhập lần đầu và đổi mật khẩu ngay; không dùng mật khẩu mặc định lâu dài. Repository nên để Private.

## 5. Cập nhật phiên bản

- Sửa giao diện/API proxy: push lên GitHub để Vercel tự deploy.
- Sửa `Code.gs`: cập nhật dự án Apps Script, tạo **New version** trong Manage deployments và deploy lại. URL `/exec` có thể giữ nguyên khi cập nhật deployment hiện có.
- Không xóa sheet hoặc đổi tên cột đang được backend sử dụng.

## Lưu ý

Giao diện giữ nguyên các lời gọi `google.script.run` cũ thông qua một lớp tương thích trình duyệt. Lớp này gọi `/api/gas`; Vercel chuyển tiếp yêu cầu tới `doPost(e)` của Apps Script. `doPost` chỉ cho phép danh sách hàm nghiệp vụ được khai báo trong mã.
