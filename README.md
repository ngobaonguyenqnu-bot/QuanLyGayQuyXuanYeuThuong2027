# Quản lý gây quỹ Xuân Yêu Thương 2027

Bộ mã nguồn Google Apps Script Web App, sử dụng Google Sheets hiện tại làm nơi lưu trữ dữ liệu. Giao diện `Index.html` gọi trực tiếp các hàm trong `Code.gs` qua `google.script.run`.

## Thành phần

- `Code.gs`: đăng nhập, xác thực phiên, đọc/ghi Google Sheets, tổng hợp số liệu, sửa/xóa buổi gây quỹ và các khoản chi.
- `Index.html`: giao diện web responsive hiện tại, gồm tổng quan, nhập gây quỹ theo tuyến, nhập khoản chi, chi riêng, lịch sử Gây quỹ/Chi, xem chi tiết, sửa/xóa.
- `appsscript.json`: cấu hình Apps Script V8 và múi giờ Việt Nam.

## Cấu hình dữ liệu

Mã nguồn đang trỏ đến Spreadsheet ID đã có trong phiên bản hiện tại:

`16AHwL8dfkVD4XU2q6Bzpf5OBY7shvPHFDCiwEOn8fxg`

Các tab được sử dụng:

| Tab | Các cột theo thứ tự |
|---|---|
| `BuoiGayQuy` | `ID, NgayGayQuy, TongTienMat, TongChuyenKhoan, TongThu, TongChi, TienConLai, GhiChu, CapNhatLuc` |
| `TuyenDuong` | `ID, BuoiID, NgayGayQuy, TenTuyen, TienMat, ChuyenKhoan, TongThu, GhiChu, CapNhatLuc` |
| `ChiTieu` | `ID, BuoiID, NgayGayQuy, NoiDung, SoTien, NgayGioMua, GhiChu, CapNhatLuc` |
| `ChiRieng` | `ID, NgayChi, NoiDung, SoTien, NgayGioChi, GhiChu, CapNhatLuc` |

**Lưu ý bảo toàn dữ liệu:** `setupSystem()` chỉ thêm tab nếu thiếu và chỉ ghi hàng tiêu đề khi tab đó đang trống; không xóa dữ liệu hiện có. Tuy nhiên, hãy sao lưu Google Sheets trước khi triển khai phiên bản mới. Không đổi tên tab hoặc thứ tự cột hiện tại nếu chưa cập nhật phần ánh xạ trong `Code.gs`.

## Triển khai lên Google Apps Script

1. Mở [Google Apps Script](https://script.google.com/) bằng tài khoản có quyền chỉnh sửa Google Sheets dữ liệu.
2. Tạo project mới (hoặc mở project đang chạy website).
3. Tạo/tải lên tệp `Code.gs` và tệp HTML tên chính xác là `Index` (nội dung lấy từ `Index.html`).
4. Trong **Project Settings**, bật hiển thị `appsscript.json` nếu cần; thay nội dung manifest bằng tệp đi kèm.
5. Kiểm tra `SPREADSHEET_ID` ở đầu `Code.gs` trùng với bảng tính đang sử dụng.
6. Chạy hàm `setupSystem()` một lần trong trình chỉnh sửa Apps Script. Cấp quyền truy cập bảng tính khi Google yêu cầu. Hàm này cũng khởi tạo tài khoản quản trị mặc định nếu project chưa có thông tin tài khoản.
7. Chọn **Deploy → New deployment → Web app**.
8. Chọn **Execute as: Me**. Chọn phạm vi truy cập phù hợp với nhóm vận hành; chỉ cấp quyền truy cập rộng khi thực sự cần thiết.
9. Nhấn **Deploy**, cấp quyền và mở URL Web App được cấp.

Khi cập nhật mã sau này, dùng **Deploy → Manage deployments → Edit → New version → Deploy** để cập nhật bản Web App đang dùng.

## Tài khoản quản trị lần đầu

Nếu project chưa từng khởi tạo tài khoản, mã nguồn tạo thông tin mặc định:

- Tên đăng nhập: `admin`
- Mật khẩu ban đầu: `Xyt2027@Admin`

Đổi mật khẩu ngay sau lần đăng nhập đầu tiên. Backend có hàm `changeAdminPassword(token, oldPassword, newPassword)`; mật khẩu mới tối thiểu 10 ký tự. Tài khoản và mã băm được lưu trong Script Properties, không lưu mật khẩu rõ trong Google Sheets.

Nếu project hiện tại đã có tài khoản được khởi tạo, `setupSystem()` giữ nguyên tài khoản đó.

## Đưa mã nguồn lên GitHub

1. Tạo repository GitHub mới, ví dụ `xuan-yeu-thuong-2027`.
2. Giải nén gói mã nguồn và tải toàn bộ tệp trong thư mục lên repository.
3. Không đưa `.clasp.json`, `.clasprc.json`, token đăng nhập hoặc thông tin bí mật lên GitHub.
4. GitHub dùng để lưu trữ/quản lý phiên bản mã nguồn; website vẫn được chạy bởi Google Apps Script Web App, không phải GitHub Pages.

### Đồng bộ bằng clasp (tùy chọn)

Cài Node.js và clasp, sau đó đăng nhập Google:

```bash
npm install -g @google/clasp
clasp login
```

Trong thư mục dự án, liên kết với Apps Script project hiện có (lấy Script ID tại **Project Settings**):

```bash
clasp clone YOUR_SCRIPT_ID
```

Sao chép các tệp nguồn vào thư mục vừa clone, sau đó đẩy mã lên Apps Script:

```bash
clasp push
```

`clasp push` cập nhật mã nguồn trong Apps Script; để website công khai nhận mã mới, vẫn cần tạo phiên bản triển khai mới trong **Deploy → Manage deployments**.

## Ghi chú vận hành

- Không xóa hoặc đổi tên các tab/cột dữ liệu khi website đang hoạt động.
- Không chạy `setupSystem()` trên một bảng tính khác nếu chưa kiểm tra lại `SPREADSHEET_ID`.
- Nên tạo bản sao dự phòng Google Sheets trước mỗi đợt cập nhật lớn.
- Mọi thao tác ghi dữ liệu được thực hiện trực tiếp vào Google Sheets hiện tại.
