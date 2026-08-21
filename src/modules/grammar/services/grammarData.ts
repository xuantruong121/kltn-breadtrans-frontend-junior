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
        youtubeId: "10r9ke8Gg3Y",
        keyFormula: "S + V(s/es) + O | S + do/does not + V_inf | Do/Does + S + V_inf?",
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
          {
            id: "q3",
            question: "The train to Da Nang ______ at 8:00 PM tonight.",
            options: ["depart", "departs", "departed", "departing"],
            correctAnswer: "departs",
            explanation: "Hiện tại đơn dùng để diễn tả lịch trình tàu xe, máy bay cố định.",
          },
        ],
      },
      {
        id: "past-simple",
        title: "Thì Quá Khứ Đơn (Past Simple)",
        duration: "12:40",
        youtubeId: "q3_Y-H-lR9A",
        keyFormula: "S + V2/V-ed + O | S + did not + V_inf | Did + S + V_inf?",
        summaryNotes: [
          "Dùng để diễn tả hành động đã xảy ra và kết thúc hoàn toàn trong quá khứ.",
          "Dấu hiệu nhận biết: yesterday, last night, last week, ago, in 2020.",
        ],
        questions: [
          {
            id: "q4",
            question: "We ______ a great movie yesterday evening.",
            options: ["watch", "watched", "watching", "watches"],
            correctAnswer: "watched",
            explanation: "Có dấu hiệu 'yesterday' nên động từ chia ở thì Quá khứ đơn (thêm -ed).",
          },
          {
            id: "q5",
            question: "Did you ______ the contract to the client this morning?",
            options: ["send", "sent", "sending", "sends"],
            correctAnswer: "send",
            explanation: "Trong câu nghi vấn có trợ động từ 'Did', động từ chính giữ nguyên mẫu: send.",
          },
        ],
      },
      {
        id: "present-perfect",
        title: "Thì Hiện Tại Hoàn Thành (Present Perfect)",
        duration: "14:15",
        youtubeId: "j9Yd_0G63bU",
        keyFormula: "S + have/has + V3/V-ed + O | S + have/has not + V3/V-ed",
        summaryNotes: [
          "Diễn tả hành động bắt đầu trong quá khứ và vẫn còn tiếp diễn hoặc để lại kết quả ở hiện tại.",
          "Dấu hiệu nhận biết: since, for, already, yet, just, ever, never, so far.",
        ],
        questions: [
          {
            id: "q6",
            question: "Mr. Nam has worked at this company ______ over ten years.",
            options: ["since", "for", "in", "from"],
            correctAnswer: "for",
            explanation: "'for' đi với khoảng thời gian (for over ten years).",
          },
          {
            id: "q7",
            question: "Have you submitted the financial report ______?",
            options: ["already", "yet", "since", "just"],
            correctAnswer: "yet",
            explanation: "'yet' đứng ở cuối câu hỏi hoặc câu phủ định trong thì Hiện tại hoàn thành.",
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
        youtubeId: "10r9ke8Gg3Y",
        keyFormula: "Adj + Noun | Verb + Noun | Prep + Noun | Article + Noun",
        summaryNotes: [
          "Các đuôi danh từ phổ biến: -tion, -sion, -ment, -ness, -ity, -ance, -ence, -er, -or.",
          "Danh từ thường đứng sau mạo từ (a, an, the), tính từ sở hữu (my, your, his), hoặc sau tính từ.",
        ],
        questions: [
          {
            id: "q8",
            question: "Customer ______ is our company's top priority.",
            options: ["satisfy", "satisfaction", "satisfactory", "satisfied"],
            correctAnswer: "satisfaction",
            explanation: "Đứng sau danh từ 'Customer' cần một danh từ ghép 'Customer satisfaction' (Sự hài lòng của khách hàng).",
          },
          {
            id: "q9",
            question: "The new manager showed great ______ during the crisis.",
            options: ["leader", "leadership", "lead", "leading"],
            correctAnswer: "leadership",
            explanation: "Sau tính từ 'great' cần một danh từ trừu tượng 'leadership' (khả năng lãnh đạo).",
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
        title: "Cấu Trúc Bị Động Cơ Bản Trong TOEIC",
        duration: "14:20",
        youtubeId: "nkA_K_h7KjY",
        keyFormula: "S + be + V3/V-ed + (by O)",
        summaryNotes: [
          "Được sử dụng khi chủ ngữ là đối tượng tiếp nhận hành động thay vì người thực hiện hành động.",
          "Thì của câu bị động phụ thuộc vào thì của động từ 'to be'.",
        ],
        questions: [
          {
            id: "q10",
            question: "The annual financial report ______ by the accounting department yesterday.",
            options: ["prepared", "was prepared", "is preparing", "prepares"],
            correctAnswer: "was prepared",
            explanation: "Chủ ngữ 'report' là vật và có 'yesterday' nên chia bị động quá khứ đơn: was prepared.",
          },
          {
            id: "q11",
            question: "All employees ______ to attend the safety workshop tomorrow.",
            options: ["are required", "require", "requiring", "have required"],
            correctAnswer: "are required",
            explanation: "Cấu trúc bị động 'be required to do something' (được yêu cầu làm gì).",
          },
        ],
      },
    ],
  },
  {
    id: "conditionals",
    title: "Câu Điều Kiện (Conditionals)",
    level: "Nâng cao",
    icon: "🎯",
    color: "from-amber-400 to-orange-500",
    lessons: [
      {
        id: "conditional-type1-2",
        title: "Câu Điều Kiện Loại 1 & Loại 2",
        duration: "11:50",
        youtubeId: "1k7sYF_oG9w",
        keyFormula: "Loại 1: If + S + V(s/es), S + will + V_inf | Loại 2: If + S + V2/V-ed, S + would + V_inf",
        summaryNotes: [
          "Loại 1: Diễn tả điều kiện có thể xảy ra ở hiện tại hoặc tương lai.",
          "Loại 2: Diễn tả điều kiện giả định trái ngược với thực tế ở hiện tại (Động từ to be dùng 'were' cho mọi ngôi).",
        ],
        questions: [
          {
            id: "q12",
            question: "If it rains tomorrow, we ______ the outdoor team building event.",
            options: ["cancel", "will cancel", "canceled", "would cancel"],
            correctAnswer: "will cancel",
            explanation: "Mệnh đề 'If' chia hiện tại đơn (rains), mệnh đề chính dùng 'will + V_inf' (will cancel).",
          },
          {
            id: "q13",
            question: "If I ______ more time, I would learn a third language.",
            options: ["have", "had", "will have", "having"],
            correctAnswer: "had",
            explanation: "Mệnh đề chính dùng 'would learn' (loại 2), nên mệnh đề If chia quá khứ đơn: had.",
          },
        ],
      },
    ],
  },
];
