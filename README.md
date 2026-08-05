# Xã Hội Chủ Nghĩa - Multiplayer Quiz 🎮

Quiz trắc nghiệm Xã hội chủ nghĩa phong cách **Kahoot** — hỗ trợ tối đa **150 người chơi** cùng lúc qua QR code.

## 🚀 Cách chạy

### 1. Cài đặt

Mở **Terminal** (Command Prompt / PowerShell) tại thư mục chứa game:

```bash
npm install
```

> Chỉ cần chạy **1 lần duy nhất** sau khi tải code về.

### 2. Khởi động server

```bash
npm start
```

Sau khi chạy, bạn sẽ thấy dòng:

```
Server đang chạy tại: http://localhost:3000
```

> **Giữ nguyên cửa sổ terminal này** — tắt đi là game ngừng chạy.

### 3. Mở giao diện

#### 👨‍🏫 **Màn hình Host** (dành cho người tổ chức — chiếu lên máy chiếu/TV)

Mở trình duyệt (Chrome/Edge/Cốc Cốc) vào địa chỉ:

```
http://localhost:3000
```

- Nhấn **"Bắt đầu"** để tạo phòng
- QR code + mã phòng hiện ra
- Đợi người chơi tham gia → nhấn **"Bắt đầu"** để vào game

#### 👥 **Màn hình Người chơi** (dùng trên điện thoại)

**Cách 1 — Quét QR:** Mở app camera điện thoại → quét mã QR trên màn hình host

**Cách 2 — Nhập URL thủ công:** Mở trình duyệt trên điện thoại, nhập:

```
http://<ĐỊA_CHỈ_IP>:3000/player.html?game=<MÃ_PHÒNG>
```

Ví dụ:

```
http://192.168.1.10:3000/player.html?game=ABC123
```

### 📱 Cách tìm địa chỉ IP để điện thoại kết nối

**Windows:**
```bash
ipconfig
```
Tìm dòng `IPv4 Address` — thường có dạng `192.168.x.x`

> Điện thoại và máy tính phải **cùng chung mạng WiFi**.

### 🌐 Chơi qua Internet (không cần cùng WiFi) bằng ngrok

Khi cần cho người chơi ở **mạng khác** tham gia, dùng **ngrok** để đưa server ra Internet:

**Bước 1 — Tải ngrok** tại: [https://ngrok.com/download](https://ngrok.com/download)

**Bước 2 — Khởi động server** (cửa sổ 1):

```bash
npm start
```

**Bước 3 — Mở tunnel ngrok** (cửa sổ 2):

```bash
ngrok http 3000
```

Sau khi chạy, ngrok hiện ra đường link công khai có dạng:

```
https://abc123.ngrok-free.app
```

**Bước 4 — Mở giao diện Host:**

```
https://abc123.ngrok-free.app
```

Người chơi quét QR hoặc nhập:

```
https://abc123.ngrok-free.app/player.html?game=<MÃ_PHÒNG>
```

> - Nhập địa chỉ `ngrok-free.app` vào trình duyệt có thể hiện **trang cảnh báo** → nhấn **"Visit Site"** để tiếp tục.
> - Giữ nguyên cả 2 cửa sổ terminal (server + ngrok) — tắt đi là mất link.
> - Link ngrok **thay đổi mỗi lần chạy lại** (bản miễn phí).

## 🎮 Luồng chơi

| Bước | Mô tả |
|------|-------|
| 1 | **Host** tạo phòng → QR + mã phòng hiện ra |
| 2 | **Người chơi** quét QR hoặc nhập mã → điền tên |
| 3 | **Host** nhấn "Bắt đầu" → câu hỏi đầu tiên xuất hiện |
| 4 | **Người chơi** chọn đáp án (4 nút màu) trong 20 giây |
| 5 | Hết giờ → hiện đáp án đúng + **Top 10 leaderboard** |
| 6 | **Host** nhấn "Câu tiếp theo" → lặp lại |
| 7 | Hết câu hỏi → podium + bảng xếp hạng **Top 10** |

## 🧩 Tính năng

- ✅ **150 người chơi** cùng lúc qua WebSocket
- ✅ **QR code** tự động tạo cho mỗi phòng
- ✅ **Top 10 leaderboard** real-time (giống Kahoot)
- ✅ 4 nút màu (đỏ 🔴 xanh dương 🔵 vàng 🟡 xanh lá 🟢)
- ✅ Đếm ngược 20 giây mỗi câu
- ✅ Điểm mỗi câu bắt đầu **1000**, giảm dần theo thời gian
- ✅ **⭐ Ngôi sao hi vọng:** trả lời đúng được **x2 điểm**
- ✅ **⚡ Sấm sét:** trả lời đúng → trừ **400 điểm** 3 người trên bạn; trả lời sai → tự bị trừ 400 điểm
- ✅ Podium 3 vị trí cao nhất khi kết thúc
- ✅ Giữ nguyên giao diện, câu hỏi & hiệu ứng từ bản gốc

## 📁 Cấu trúc file

| File | Chức năng |
|------|-----------|
| `server.js` | Server chính (Node.js + WebSocket) |
| `questions.js` | Bộ câu hỏi (dùng chung) |
| `public/host.html` + `host.js` | Giao diện Host |
| `public/player.html` + `player.js` | Giao diện Người chơi |
| `public/style.css` | Định dạng giao diện |
| `nhanvaodaydesudung.html` | Bản cũ (chơi đơn, không cần server) |

## ⚙️ Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) phiên bản 14 trở lên
- Trình duyệt web hiện đại (Chrome, Edge, Cốc Cốc...)
