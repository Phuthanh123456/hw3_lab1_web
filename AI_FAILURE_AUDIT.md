# HW3 AI Failure Audit

## Kết quả review

Đã xác minh được **3 lỗi thật** bằng Git history, đọc diff, test và kiểm tra trên Chrome thật qua Chrome DevTools Protocol. Lỗi thứ ba được phát hiện khi kiểm tra lại toàn bộ HW1–HW3, sau báo cáo ban đầu chỉ xác minh được hai lỗi. Không dùng DevTools breakpoint.

## Lỗi 1 — Countdown từ chối timestamp có phần giây lẻ dài hơn 3 chữ số

1. **Mô tả và vị trí:** `parseUtcIsoTimestamp()` trong `countdown.js` giới hạn phần thập phân bằng regex `\d{1,3}`. Timestamp như `2026-12-31T23:59:59.123456Z` bị từ chối, dù phần mili giây của đồng hồ chỉ cần lấy ba chữ số đầu.
2. **Cách phát hiện:** Review diff của `6db715e` cho thấy regex giới hạn ba chữ số. Test hồi quy được thêm trong `tests/countdown.test.mjs` tại commit sửa, kiểm tra timestamp sáu chữ số và kết quả đến mili giây; test được xác nhận chạy đạt trong bộ kiểm tra hiện tại.
3. **Sửa và xác nhận:** Regex nhận một hoặc nhiều chữ số thập phân; parser giữ ba chữ số đầu để phù hợp độ chính xác mili giây của `Date.now()`. Test xác nhận `.123456Z` được parse thành `Date.UTC(2026, 11, 31, 23, 59, 59, 123)`. Bộ kiểm tra hiện tại đạt 17/17.
4. **Commit:** Lỗi được đưa vào `6db715e` (`feat: implement drift-free UTC countdown`); sửa ở `db2b336` (`fix(countdown): accept ISO fractional seconds`).

## Lỗi 2 — Lỗi cập nhật trạng thái Success bị nhầm thành lỗi gửi form

1. **Mô tả và vị trí:** Trong `createRegistrationController()` ở `registration.js`, `try/catch` ban đầu bao cả `submitRegistration()` lẫn chuyển trạng thái sang `Success`. Nếu `onTransition(Success)` ném lỗi khi cập nhật giao diện, `catch` coi đó là lỗi gửi, rồi cố chuyển từ `Success` sang `Error` — chuyển trạng thái không hợp lệ và che mất lỗi ban đầu.
2. **Cách phát hiện:** Review diff của `2f1e625` và luồng xử lý trong `registration.js` cho thấy callback Success nằm trong vùng bắt lỗi của submitter. Test hồi quy trong `tests/registration.test.mjs` ném `Status rendering failed.` từ callback Success, xác nhận lỗi được truyền ra mà state vẫn là `Success`.
3. **Sửa và xác nhận:** Chỉ đặt lời gọi `submitRegistration()` trong `try/catch`; chuyển trạng thái Success sau khối đó. Test hồi quy xác nhận lỗi callback không bị biến thành lỗi submit hoặc chuyển state sai. Bộ kiểm tra hiện tại đạt 17/17.
4. **Commit:** Lỗi được đưa vào `2f1e625` (`feat: implement registration form state machine`); sửa ở `03b049f` (`fix(form): isolate submit failures from state notifications`).

## Lỗi 3 — Submit bị từ chối vẫn thay đổi tên trong thông báo Success

1. **Mô tả và vị trí:** Submit handler trong `app.js` chỉ kiểm tra `result.state === Success` trước khi hiển thị tên. Khi controller đã ở Success, lần submit mới trả về `accepted: false` nhưng vẫn có state Success. Vì vậy thay đổi tên rồi gọi `form.requestSubmit()` làm thông báo thành công đổi sang một tên chưa được gửi, dù state guard vẫn ngăn lần gửi mới.
2. **Cách phát hiện:** Trên Chrome thật, gửi form thành công, lưu thông báo, đổi tên thành `Not submitted`, rồi gọi `requestSubmit()` lần nữa. Bộ kiểm tra browser thấy thông báo đổi từ tên đã gửi sang `Not submitted`, trong khi số lần gọi submit mô phỏng vẫn là 1. Sau đó mở rộng `tests/registration-output.test.mjs` với cùng đường đi; chạy test trước bản sửa nhận `AssertionError: rejected submissions must not replace the successful submission's name`. Git diff xác định điều kiện thiếu `result.accepted` được thêm ở `d3cb8fd`.
3. **Sửa và xác nhận:** Chỉ cập nhật thông báo Success khi cả `result.accepted` và state Success đều đúng. Test hồi quy xác nhận lần gửi bị từ chối không tạo timer mới và không đổi thông báo cũ. Bộ test Node đạt 17/17 sau sửa; kiểm tra lại trên Chrome xác nhận tên cũ được giữ nguyên và số lần submit vẫn là 1.
4. **Commit:** Lỗi được đưa vào `d3cb8fd` (`feat: prevent duplicate submits and secure form output`); sửa ở `b165371` (`fix(form): preserve accepted success output on duplicate submits`).

## Các kiểm tra không phát hiện lỗi

- Countdown được kiểm tra UTC, timestamp sai, hết hạn, restart/dispose và tick chậm. Trên Chrome, dịch đồng hồ thêm 90 giây cho thấy lần tick kế tiếp tính lại từ `Date.now()`.
- Tám lần gọi submit nhanh khi đang Submitting chỉ tạo một lần submit mô phỏng, nút bị khóa đúng trạng thái.
- Payload `<img src=x onerror=alert(1)>` được thử trên Chrome thật: thông báo chứa nguyên văn payload, không có node `img` được tạo trong vùng trạng thái, và `alert` không được gọi. Phần hiển thị dùng `textContent`.
- Chuyển trạng thái thành công, lỗi và thử lại được kiểm tra bằng submitter mô phỏng trong test Node. Không gọi dịch vụ ngoài.
