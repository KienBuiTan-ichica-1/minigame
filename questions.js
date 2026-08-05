// ============================================================
// CÂU HỎI XÃ HỘI CHỦ NGHĨA - TÔN GIÁO VÀ TÍN NGƯỠNG
// c = index đáp án đúng (0=A, 1=B, 2=C, 3=D)
// ============================================================

const questions = [
    {
        q: "Theo quan điểm của chủ nghĩa Mác - Lênin, tôn giáo được định nghĩa là:",
        a: [
            "Một hiện tượng tự nhiên phản ánh đúng bản chất của thế giới khách quan.",
            "Một hình thái ý thức xã hội phản ánh hư ảo hiện thực khách quan, trong đó các lực lượng trần thế mang hình thức siêu trần thế.",
            "Một công cụ chính trị do giai cấp thống trị tạo ra để áp bức nhân dân.",
            "Một khoa học chuyên nghiên cứu về các hiện tượng tâm linh và siêu nhiên."
        ],
        c: 1
    },
    {
        q: "Nguồn gốc nào sau đây KHÔNG được chủ nghĩa Mác - Lênin đề cập khi phân tích nguồn gốc hình thành của tôn giáo?",
        a: [
            "Nguồn gốc tự nhiên và kinh tế - xã hội.",
            "Nguồn gốc nhận thức.",
            "Nguồn gốc tâm lý.",
            "Nguồn gốc pháp lý và hành chính."
        ],
        c: 3
    },
    {
        q: "Quan điểm của Đảng và Nhà nước Việt Nam về sự tồn tại của tín ngưỡng, tôn giáo được khẳng định như thế nào?",
        a: [
            "Tôn giáo là một hiện tượng tiêu cực cần được xóa bỏ nhanh chóng bằng các biện pháp hành chính.",
            "Tín ngưỡng, tôn giáo là nhu cầu tinh thần của một bộ phận nhân dân và sẽ tồn tại lâu dài cùng dân tộc.",
            "Tôn giáo chỉ tồn tại ở các nước kém phát triển và sẽ mất đi khi kinh tế phát triển.",
            "Nhà nước chỉ công nhận một số tôn giáo nhất định, các tôn giáo khác phải hoạt động ngầm."
        ],
        c: 1
    },
    {
        q: "Theo nguyên tắc giải quyết vấn đề tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội, việc phân biệt hai mặt chính trị và tư tưởng của tôn giáo nhằm mục đích gì?",
        a: [
            "Để tách biệt hoàn toàn tôn giáo khỏi các hoạt động chính trị.",
            "Để tránh hai khuynh hướng cực đoan: hoặc vô hiệu hóa mọi hoạt động tôn giáo, hoặc bao che mọi hành vi lợi dụng tôn giáo.",
            "Để hợp pháp hóa mọi hoạt động truyền giáo, kể cả trái pháp luật.",
            "Để các tổ chức tôn giáo tự quản lý mà không cần sự giám sát của Nhà nước."
        ],
        c: 1
    },
    {
        q: "Theo chủ nghĩa Mác - Lênin, nội dung của \"tính lịch sử\" của tôn giáo được hiểu là:",
        a: [
            "Tôn giáo là bất biến, không thay đổi theo thời gian.",
            "Tôn giáo ra đời cùng với loài người và sẽ tồn tại mãi mãi.",
            "Tôn giáo có quá trình hình thành, phát triển và biến đổi cùng sự vận động của xã hội; khi các điều kiện kinh tế - xã hội thay đổi thì tôn giáo cũng thay đổi.",
            "Tôn giáo chỉ thay đổi khi có sự can thiệp bằng vũ lực hoặc mệnh lệnh hành chính."
        ],
        c: 2
    },
    {
        q: "Một trong những nội dung cốt lõi của công tác tôn giáo ở Việt Nam hiện nay là gì?",
        a: [
            "Cấm đoàn toàn bộ các hoạt động truyền đạo.",
            "Đẩy mạnh công tác vận động quần chúng, chăm lo đời sống vật chất và tinh thần cho đồng bào có đạo, từ đó củng cố lòng tin vào Đảng và Nhà nước.",
            "Tập trung xây dựng lực lượng để đấu tranh với tôn giáo.",
            "Chỉ ưu tiên phát triển các tôn giáo nội sinh, hạn chế tôn giáo ngoại nhập."
        ],
        c: 1
    },
    {
        q: "Theo quan điểm của Đảng và Nhà nước, quyền tự do tín ngưỡng, tôn giáo ở Việt Nam được bảo đảm trong khuôn khổ nào?",
        a: [
            "Tự do tuyệt đối, không bị ràng buộc bởi bất kỳ quy định nào.",
            "Trong khuôn khổ pháp luật; các tôn giáo đều bình đẳng và hoạt động theo Hiến pháp và pháp luật.",
            "Chỉ những tôn giáo được Nhà nước công nhận mới có quyền hoạt động.",
            "Người có đạo có thể làm mọi việc nhân danh tôn giáo mà không cần tuân thủ pháp luật."
        ],
        c: 1
    },
    {
        q: "Đặc điểm nổi bật của tôn giáo ở Việt Nam là gì?",
        a: [
            "Chỉ có duy nhất một tôn giáo được phép hoạt động.",
            "Các tôn giáo thường xuyên xảy ra xung đột, chiến tranh tôn giáo.",
            "Đa dạng, đan xen, chung sống hòa bình và không có xung đột tôn giáo lớn trong suốt lịch sử.",
            "Tất cả các tôn giáo đều là tôn giáo nội sinh, không du nhập từ bên ngoài."
        ],
        c: 2
    },
    {
        q: "Theo quan điểm Mác - Lênin, cách thức căn bản để khắc phục ảnh hưởng tiêu cực của tôn giáo là gì?",
        a: [
            "Cấm đoán và đàn áp các hoạt động tôn giáo.",
            "Tuyên truyền để người dân từ bỏ niềm tin tôn giáo một cách nhanh chóng.",
            "Gắn liền với quá trình cải tạo xã hội cũ, xây dựng xã hội mới, nâng cao đời sống vật chất và tinh thần, phát triển khoa học và giáo dục.",
            "Loại bỏ tất cả các chức sắc tôn giáo ra khỏi các vị trí quan trọng."
        ],
        c: 2
    },
    {
        q: "Vì sao Đảng và Nhà nước Việt Nam khẳng định công tác tôn giáo là trách nhiệm của cả hệ thống chính trị?",
        a: [
            "Vì tôn giáo chỉ liên quan đến vấn đề tâm linh, không ảnh hưởng đến kinh tế, văn hóa hay an ninh.",
            "Vì công tác tôn giáo đơn thuần chỉ là công việc của một bộ phận chuyên trách.",
            "Vì tôn giáo liên quan đến nhiều lĩnh vực (kinh tế, văn hóa, an ninh, đối ngoại), nên việc quản lý cần sự phối hợp đồng bộ giữa Đảng, chính quyền, Mặt trận Tổ quốc và các đoàn thể.",
            "Vì các tổ chức tôn giáo ở Việt Nam đều có quan hệ với nước ngoài, nên chỉ cần ngành ngoại giao giải quyết."
        ],
        c: 2
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions;
}
