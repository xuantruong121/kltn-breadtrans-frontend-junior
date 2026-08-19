import { GrammarTopic } from "../types";

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: "tenses",
    title: "Các Thì Cơ Bản (Tenses)",
    level: "Cơ bản",
    icon: "⏳",
    color: "from-blue-400 to-sky-500",
    lessons: [
      {
        id: "present-simple",
        title: "Thì Hiện Tại Đơn (Present Simple)",
        duration: "10:25",
        youtubeId: "dQw4w9WgXcQ", // Placeholder or curated grammar video
        keyFormula: "S + V(s/es) + O | S + do/does not + V_inf",
        summaryNotes: [
          "Dùng để diễn tả một thói quen hoặc hành động lặp đi lặp lại ở hiện tại.",
          "Diễn tả một chân lý, sự thật hiển nhiên (Ví dụ: The sun rises in the east).",
          "Dấu hiệu nhận biết: always, usually, often, sometimes, everyday, every week.",
        ],
        questions: [
          {
            id: "q1",
            question: "She usually ______ to school by bus every morning.",
            options: ["go", "goes", "going", "went"],
            correctAnswer: "goes",
            explanation: "Chủ ngữ là 'She' (ngôi thứ 3 số ít) và có trạng từ 'usually' nên động từ 'go' thêm 'es' thành 'goes'.",
          },
          {
            id: "q2",
            question: "They ______ like spicy food.",
            options: ["doesn't", "don't", "aren't", "isn't"],
            correctAnswer: "don't",
            explanation: "Chủ ngữ là 'They' nên ta dùng trợ động từ 'do not' ('don't') ở thể phủ định.",
          },
        ],
      },
      {
        id: "past-simple",
        title: "Thì Quá Khứ Đơn (Past Simple)",
        duration: "12:40",
        youtubeId: "kJQP7kiw5Fk",
        keyFormula: "S + V2/V-ed + O | S + did not + V_inf",
        summaryNotes: [
          "Dùng để diễn tả hành động đã xảy ra và kết thúc hoàn toàn trong quá khứ.",
          "Dấu hiệu nhận biết: yesterday, last night, last week, ago, in 2020.",
        ],
        questions: [
          {
            id: "q3",
            question: "We ______ a great movie yesterday evening.",
            options: ["watch", "watched", "watching", "watches"],
            correctAnswer: "watched",
            explanation: "Có dấu hiệu 'yesterday' nên động từ chia ở thì Quá khứ đơn (thêm -ed).",
          },
        ],
      },
    ],
  },
  {
    id: "parts-of-speech",
    title: "Từ Loại trong đề TOEIC (Parts of Speech)",
    level: "Trung cấp",
    icon: "🧩",
    color: "from-emerald-400 to-teal-500",
    lessons: [
      {
        id: "nouns-suffixes",
        title: "Dấu Hiệu Nhận Biết Danh Từ (Noun Suffixes)",
        duration: "08:15",
        youtubeId: "L_LUpnjgPso",
        keyFormula: "Adj + Noun | Verb + Noun | Prep + Noun",
        summaryNotes: [
          "Các đuôi danh từ phổ biến: -tion, -sion, -ment, -ness, -ity, -ance, -ence, -er, -or.",
          "Danh từ thường đứng sau mạo từ (a, an, the), tính từ sở hữu (my, your, his), hoặc sau tính từ.",
        ],
        questions: [
          {
            id: "q4",
            question: "Customer ______ is our company's top priority.",
            options: ["satisfy", "satisfaction", "satisfactory", "satisfied"],
            correctAnswer: "satisfaction",
            explanation: "Đứng sau danh từ 'Customer' cần một danh từ ghép 'Customer satisfaction' (Sự hài lòng của khách hàng).",
          },
        ],
      },
    ],
  },
  {
    id: "passive-voice",
    title: "Câu Bị Động (Passive Voice)",
    level: "Trung cấp",
    icon: "🔄",
    color: "from-purple-400 to-indigo-500",
    lessons: [
      {
        id: "passive-basics",
        title: "Cấu Trúc Bị Động Cơ Bản",
        duration: "14:20",
        youtubeId: "fJ9rUzIMcZQ",
        keyFormula: "S + be + V3/V-ed + (by O)",
        summaryNotes: [
          "Được sử dụng khi chủ ngữ là đối tượng tiếp nhận hành động thay vì người thực hiện hành động.",
          "Thì của câu bị động phụ thuộc vào thì của động từ 'to be'.",
        ],
        questions: [
          {
            id: "q5",
            question: "The new report ______ by the marketing manager tomorrow.",
            options: ["will present", "will be presented", "is presenting", "presents"],
            correctAnswer: "will be presented",
            explanation: "Báo cáo không thể tự thuyết trình mà phải 'được thuyết trình' (bị động tương lai đơn: will be + V3).",
          },
        ],
      },
    ],
  },
];
