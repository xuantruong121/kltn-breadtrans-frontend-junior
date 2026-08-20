import { FlashcardBook } from "../types";

export const FLASHCARD_BOOKS: FlashcardBook[] = [
  {
    id: 1,
    name: "TOEIC Starter: Trường học & Đời sống",
    category: "Căn bản",
    coverColor: "from-sky-400 to-blue-500",
    icon: "🎒",
    totalWords: 15,
    lessons: [
      {
        id: 1,
        title: "Bài 1: Lớp học & Đồ dùng học tập",
        description: "Từ vựng thường gặp trong môi trường học đường và bài thi TOEIC Part 1.",
        words: [
          { id: "w1", word: "Schedule", ipa: "/ˈʃedʒ.uːl/", mean: "Lịch trình, thời khóa biểu", type: "noun", exampleEn: "I need to check my class schedule.", exampleVi: "Tôi cần kiểm tra lại lịch học của mình." },
          { id: "w2", word: "Assignment", ipa: "/əˈsaɪn.mənt/", mean: "Bài tập, nhiệm vụ", type: "noun", exampleEn: "The teacher gave us a reading assignment.", exampleVi: "Giáo viên giao cho chúng tôi một bài đọc." },
          { id: "w3", word: "Presentation", ipa: "/ˌprez.ənˈteɪ.ʃən/", mean: "Bài thuyết trình", type: "noun", exampleEn: "Her presentation was very interesting.", exampleVi: "Bài thuyết trình của cô ấy rất thú vị." },
          { id: "w4", word: "Library", ipa: "/ˈlaɪ.brər.i/", mean: "Thư viện", type: "noun", exampleEn: "Students can borrow books from the library.", exampleVi: "Học sinh có thể mượn sách từ thư viện." },
          { id: "w5", word: "Semester", ipa: "/sɪˈmes.tər/", mean: "Học kỳ", type: "noun", exampleEn: "This semester is going to be challenging.", exampleVi: "Học kỳ này sẽ khá thử thách." },
          { id: "w6", word: "Register", ipa: "/ˈredʒ.ɪ.stər/", mean: "Đăng ký", type: "verb", exampleEn: "You must register before Friday.", exampleVi: "Bạn phải đăng ký trước thứ Sáu." },
        ],
      },
      {
        id: 2,
        title: "Bài 2: Giao tiếp hàng ngày & Bạn bè",
        description: "Các mẫu câu và từ vựng chào hỏi, kết bạn trong bài thi TOEIC Part 2 & 3.",
        words: [
          { id: "w7", word: "Introduce", ipa: "/ˌɪn.trəˈdʒuːs/", mean: "Giới thiệu", type: "verb", exampleEn: "Let me introduce my new classmate.", exampleVi: "Để tôi giới thiệu bạn học mới của tôi." },
          { id: "w8", word: "Conversation", ipa: "/ˌkɒn.vəˈseɪ.ʃən/", mean: "Cuộc trò chuyện", type: "noun", exampleEn: "We had a pleasant conversation.", exampleVi: "Chúng tôi đã có một cuộc trò chuyện vui vẻ." },
          { id: "w9", word: "Invitation", ipa: "/ˌɪn.vɪˈteɪ.ʃən/", mean: "Lời mời", type: "noun", exampleEn: "Thank you for the birthday invitation.", exampleVi: "Cảm ơn bạn vì lời mời sinh nhật." },
          { id: "w10", word: "Cooperate", ipa: "/kəʊˈɒp.ər.eɪt/", mean: "Hợp tác, giúp đỡ lẫn nhau", type: "verb", exampleEn: "We should cooperate on this project.", exampleVi: "Chúng ta nên hợp tác trong dự án này." },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "TOEIC Business: Văn phòng & Công sở",
    category: "Trung cấp",
    coverColor: "from-amber-400 to-orange-500",
    icon: "💼",
    totalWords: 15,
    lessons: [
      {
        id: 1,
        title: "Bài 1: Thiết bị & Không gian văn phòng",
        description: "Từ vựng trang thiết bị, văn phòng phẩm phổ biến trong Part 1 và Part 7.",
        words: [
          { id: "w11", word: "Equipment", ipa: "/ɪˈkwɪp.mənt/", mean: "Thiết bị, dụng cụ", type: "noun", exampleEn: "The office ordered new computer equipment.", exampleVi: "Văn phòng đã đặt mua thiết bị máy tính mới." },
          { id: "w12", word: "Colleague", ipa: "/ˈkɒl.iːɡ/", mean: "Đồng nghiệp", type: "noun", exampleEn: "I work well with my colleagues.", exampleVi: "Tôi phối hợp tốt với các đồng nghiệp của mình." },
          { id: "w13", word: "Document", ipa: "/ˈdɒk.jə.mənt/", mean: "Tài liệu, văn bản", type: "noun", exampleEn: "Please sign this document.", exampleVi: "Vui lòng ký vào tài liệu này." },
          { id: "w14", word: "Conference", ipa: "/ˈkɒn.fər.əns/", mean: "Hội nghị, hội thảo", type: "noun", exampleEn: "The annual sales conference is in Tokyo.", exampleVi: "Hội nghị bán hàng thường niên diễn ra ở Tokyo." },
          { id: "w15", word: "Deadline", ipa: "/ˈded.laɪn/", mean: "Hạn chót", type: "noun", exampleEn: "The project deadline is next Monday.", exampleVi: "Hạn chót của dự án là thứ Hai tuần tới." },
        ],
      },
      {
        id: 2,
        title: "Bài 2: Hợp đồng & Đàm phán kinh doanh",
        description: "Từ vựng ký kết hợp đồng, thương thảo thương mại trong TOEIC Part 5, 6.",
        words: [
          { id: "w16", word: "Negotiate", ipa: "/nəˈɡoʊ.ʃi.eɪt/", mean: "Thương lượng, đàm phán", type: "verb", exampleEn: "They negotiated a new contract.", exampleVi: "Họ đã thương lượng một hợp đồng mới." },
          { id: "w17", word: "Agreement", ipa: "/əˈɡriː.mənt/", mean: "Hợp đồng, sự thỏa thuận", type: "noun", exampleEn: "Both parties reached an agreement.", exampleVi: "Cả hai bên đã đạt được thỏa thuận." },
          { id: "w18", word: "Proposal", ipa: "/prəˈpoʊ.zəl/", mean: "Đề xuất, bản đề án", type: "noun", exampleEn: "We submitted the business proposal.", exampleVi: "Chúng tôi đã nộp bản đề xuất kinh doanh." },
          { id: "w19", word: "Signature", ipa: "/ˈsɪɡ.nə.tʃər/", mean: "Chữ ký", type: "noun", exampleEn: "The document requires your signature.", exampleVi: "Văn bản này cần chữ ký của bạn." },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "TOEIC Explorer: Du lịch & Khách sạn",
    category: "Thực tế",
    coverColor: "from-emerald-400 to-teal-500",
    icon: "✈️",
    totalWords: 15,
    lessons: [
      {
        id: 1,
        title: "Bài 1: Sân bay & Phương tiện di chuyển",
        description: "Từ vựng thông báo sân bay, đặt vé tàu xe hay gặp trong Part 4.",
        words: [
          { id: "w20", word: "Passenger", ipa: "/ˈpæs.ən.dʒər/", mean: "Hành khách", type: "noun", exampleEn: "All passengers must fasten their seatbelts.", exampleVi: "Tất cả hành khách phải thắt dây an toàn." },
          { id: "w21", word: "Reservation", ipa: "/ˌrez.əˈveɪ.ʃən/", mean: "Sự đặt chỗ trước", type: "noun", exampleEn: "I have a reservation for two nights.", exampleVi: "Tôi đã đặt phòng trước cho 2 đêm." },
          { id: "w22", word: "Luggage", ipa: "/ˈlʌɡ.ɪdʒ/", mean: "Hành lý", type: "noun", exampleEn: "You can keep your luggage in the hotel lobby.", exampleVi: "Bạn có thể gửi hành lý tại sảnh khách sạn." },
          { id: "w23", word: "Departure", ipa: "/dɪˈpɑː.tʃər/", mean: "Sự khởi hành", type: "noun", exampleEn: "The departure time was delayed.", exampleVi: "Thời gian khởi hành đã bị hoãn lại." },
          { id: "w24", word: "Destination", ipa: "/ˌdes.təˈneɪ.ʃən/", mean: "Điểm đến", type: "noun", exampleEn: "Da Nang is a popular tourist destination.", exampleVi: "Đà Nẵng là điểm đến du lịch nổi tiếng." },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "TOEIC Master: Công nghệ & Đổi mới",
    category: "Nâng cao",
    coverColor: "from-purple-400 to-indigo-500",
    icon: "💻",
    totalWords: 15,
    lessons: [
      {
        id: 1,
        title: "Bài 1: Phần mềm, Bảo mật & AI",
        description: "Từ vựng công nghệ số và chuyển đổi số trong môi trường làm việc 4.0.",
        words: [
          { id: "w25", word: "Innovation", ipa: "/ˌɪn.əˈveɪ.ʃən/", mean: "Sự đổi mới, sáng tạo", type: "noun", exampleEn: "Technological innovation drives growth.", exampleVi: "Đổi mới công nghệ thúc đẩy tăng trưởng." },
          { id: "w26", word: "Security", ipa: "/səˈkjʊr.ə.t̬i/", mean: "An ninh, bảo mật", type: "noun", exampleEn: "Data security is essential for companies.", exampleVi: "Bảo mật dữ liệu là điều tối quan trọng đối với các công ty." },
          { id: "w27", word: "Upgrade", ipa: "/ʌpˈɡreɪd/", mean: "Nâng cấp", type: "verb", exampleEn: "We must upgrade our operating system.", exampleVi: "Chúng ta cần nâng cấp hệ điều hành." },
          { id: "w28", word: "Automate", ipa: "/ˈɑː.t̬ə.meɪt/", mean: "Tự động hóa", type: "verb", exampleEn: "The system automates daily tasks.", exampleVi: "Hệ thống tự động hóa các công việc hàng ngày." },
        ],
      },
    ],
  },
];
