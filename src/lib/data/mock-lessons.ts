import { AIExplanation, Lesson } from "@/lib/types";

export const lessons: Lesson[] = [
  {
    id: "lesson-1",
    slug: "morning-routines",
    title: "城市新生活的早晨节奏",
    subtitle: "用自然短语建立日常表达感。",
    description:
      "跟随 Maya 适应新城市的清晨安排，在真实语境中积累可复用表达。",
    difficulty: "Intermediate",
    estimatedMinutes: 12,
    completionRate: 34,
    tags: ["日常生活", "口语表达", "习惯"],
    sections: [
      {
        id: "sec-1",
        title: "开启一天",
        summary: "围绕早晨决策与状态切换的核心表达。",
        sentences: [
          {
            id: "s-1",
            text: "I used to hit the snooze button three times, but now I get up as soon as my alarm goes off.",
            translation:
              "我以前会按三次贪睡，但现在闹钟一响就起床。",
            chunks: ["used to", "as soon as", "goes off"],
          },
          {
            id: "s-2",
            text: "Making coffee has become my way of easing into the day.",
            translation: "做咖啡已经成了我平稳进入一天状态的方式。",
            chunks: ["has become", "easing into"],
          },
          {
            id: "s-3",
            text: "If I skip breakfast, I lose focus before my first meeting.",
            translation: "如果不吃早餐，我在第一场会前就会开始分心。",
            chunks: ["skip breakfast", "lose focus"],
          },
        ],
      },
      {
        id: "sec-2",
        title: "通勤与状态",
        summary: "学习通勤场景和自我调节相关表达。",
        sentences: [
          {
            id: "s-4",
            text: "On the train, I read short articles so I can pick up useful expressions in context.",
            translation:
              "在地铁上我会读短文，这样能在语境里习得实用表达。",
            chunks: ["pick up", "in context"],
          },
          {
            id: "s-5",
            text: "By the time I arrive at the office, I already feel mentally warmed up.",
            translation:
              "到办公室时，我的大脑通常已经进入工作状态。",
            chunks: ["By the time", "warmed up"],
          },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "lesson-2",
    slug: "workplace-feedback",
    title: "自信地给出反馈",
    subtitle: "在职场中说清观点，同时保持礼貌与合作感。",
    description:
      "学习如何在保留友好语气的同时，给出清晰、可执行的反馈意见。",
    difficulty: "Intermediate",
    estimatedMinutes: 15,
    completionRate: 12,
    tags: ["职场", "沟通", "专业表达"],
    sections: [
      {
        id: "sec-3",
        title: "组织反馈句式",
        summary: "在不显得生硬的前提下表达明确意见。",
        sentences: [
          {
            id: "s-6",
            text: "I appreciate the effort, and I think we can make the message clearer for first-time users.",
            translation:
              "我认可这次投入，同时我觉得这段信息还可以对新用户更清晰一点。",
            chunks: ["I appreciate", "first-time users"],
          },
          {
            id: "s-7",
            text: "Could we tighten this section so the main idea stands out right away?",
            translation:
              "这段是否可以再收紧一些，让核心观点更快被看到？",
            chunks: ["tighten this section", "stands out"],
          },
        ],
      },
    ],
    explanations: [],
  },
];

const explanationSeed: AIExplanation[] = [
  {
    key: "used to",
    text: "used to",
    translation: "previously did",
    explanation:
      "表示过去经常发生、但现在不再持续的习惯或状态。",
    examples: [
      "I used to study late at night.",
      "She used to live near the station.",
      "We used to work on weekends.",
    ],
    breakdown: ["used to + 动词原形", "强调过去习惯", "不用于单次事件"],
    pronunciation: "/juːst tə/",
  },
  {
    key: "as soon as",
    text: "as soon as",
    translation: "一……就……",
    explanation:
      "连接两个动作，后一个动作紧接前一个动作发生。",
    examples: [
      "Call me as soon as you arrive.",
      "He smiled as soon as he heard the news.",
    ],
    breakdown: ["连接短语", "谈将来时常配合一般现在时"],
    pronunciation: "/əz suːn əz/",
  },
  {
    key: "pick up",
    text: "pick up",
    translation: "逐步习得",
    explanation:
      "在语言学习中，指通过反复接触在语境里自然学会。",
    examples: [
      "I picked up useful phrases from podcasts.",
      "Children pick up accents quickly.",
    ],
    breakdown: ["动词短语", "口语中非常常见"],
    pronunciation: "/pɪk ʌp/",
  },
];

lessons[0].explanations = explanationSeed;
lessons[1].explanations = explanationSeed;

export const getLessonBySlug = (slug: string) =>
  lessons.find((lesson) => lesson.slug === slug);

export const getExplanationForText = (
  lesson: Lesson,
  selected: string,
): AIExplanation => {
  const lower = selected.toLowerCase();
  const existing = lesson.explanations.find((item) =>
    lower.includes(item.key.toLowerCase()),
  );

  if (existing) return existing;

  return {
    key: lower,
    text: selected,
    translation: "基于语境的含义",
    explanation:
      "这个短语会影响句子语气与表达重点，建议结合上下文一起理解。",
    examples: [
      `I noted the phrase "${selected}" in my reading.`,
      `I will try "${selected}" in my own sentence today.`,
    ],
    breakdown: ["含义依赖语境", "建议结合完整句子记忆"],
    pronunciation: "/点击发音/",
  };
};
