# HW3 AI Failure Audit

## Kết quả review

Đã xác minh được **2 lỗi thật trên 3 lỗi yêu cầu** bằng Git history, đọc diff và chạy lại các test. Không tìm đủ bằng chứng cho lỗi thứ ba nên không tạo thêm lỗi giả. Review này không dùng DevTools breakpoint.

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

## Lỗi thứ ba chưa được xác minh

Không có thêm lỗi nào trong Git history hiện tại có cả bằng chứng về hành vi sai và commit sửa tương ứng. Slice 3 kiểm tra gửi lặp và payload XSS đều đạt; không ghi chúng thành lỗi đã xảy ra. Để tiếp tục tìm lỗi thật, nên review thêm các đường biên chưa được kiểm tra trực tiếp trên trình duyệt: nhập payload rồi quan sát DOM/console trong DevTools, kích hoạt submit bằng Enter và click liên tục, và fault-injection cho lỗi callback ở từng chuyển trạng thái form. Các bước DevTools này chưa được thực hiện trong audit hiện tại.
