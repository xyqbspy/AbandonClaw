import { AIExplanation, Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";

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
        title: "醒来与起步",
        summary: "从闹钟响起到进入清晨节奏。",
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
        ],
      },
      {
        id: "sec-2",
        title: "早餐与专注",
        summary: "先把身体状态稳定下来，再切换到工作模式。",
        sentences: [
          {
            id: "s-3",
            text: "If I skip breakfast, I lose focus before my first meeting.",
            translation: "如果不吃早餐，我在第一场会前就会开始分心。",
            chunks: ["skip breakfast", "lose focus"],
          },
          {
            id: "s-4",
            text: "A simple breakfast helps me stay steady before I start planning my day.",
            translation: "一顿简单早餐能让我在开始安排一天前保持稳定状态。",
            chunks: ["lose focus"],
          },
        ],
      },
      {
        id: "sec-3",
        title: "通勤与输入",
        summary: "在通勤路上用短内容积累可复用表达。",
        sentences: [
          {
            id: "s-5",
            text: "On the train, I read short articles so I can pick up useful expressions in context.",
            translation:
              "在地铁上我会读短文，这样能在语境里习得实用表达。",
            chunks: ["pick up", "in context"],
          },
          {
            id: "s-6",
            text: "I pick up new phrases faster when I review them in context on my phone.",
            translation: "在手机上按语境回看时，我通常能更快掌握新短语。",
            chunks: ["pick up", "in context"],
          },
        ],
      },
      {
        id: "sec-4",
        title: "到达与进入状态",
        summary: "完成从日常节奏到工作节奏的切换。",
        sentences: [
          {
            id: "s-7",
            text: "As soon as I sit down at my desk, I write a short plan for the morning.",
            translation: "我一坐到工位上，就会先写一份简短的上午计划。",
            chunks: ["as soon as"],
          },
          {
            id: "s-8",
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
    translation: "过去常常",
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
    translation: "逐步掌握",
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

export const getSentenceById = (lesson: Lesson, sentenceId: string) => {
  for (const section of lesson.sections) {
    const found = section.sentences.find((sentence) => sentence.id === sentenceId);
    if (found) return found;
  }
  return undefined;
};

export const getFirstSentence = (lesson: Lesson): LessonSentence | undefined =>
  lesson.sections[0]?.sentences[0];

export const findMatchingChunkInSentence = (
  sentence: LessonSentence,
  selectedText: string,
) => {
  const selected = selectedText.trim().toLowerCase();
  if (!selected) return undefined;

  return sentence.chunks.find((chunk) => chunk.toLowerCase() === selected);
};

const toChunkLayer = (
  explanation: AIExplanation | undefined,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  const key = chunkText.toLowerCase();
  const curated: Record<
    string,
    {
      translation: string;
      meaningInSentence: string;
      usageNote: string;
      examples: string[];
      notes?: string[];
      pronunciation?: string;
    }
  > = {
    "lose focus": {
      translation: "分心；不专注",
      meaningInSentence: "这里表示在第一场会议前就开始分心，难以保持专注。",
      usageNote:
        "表示注意力从当前任务上移开，常用于学习、工作、开会等需要持续专注的场景。",
      examples: [
        "I lose focus when my phone keeps buzzing.",
        "He lost focus halfway through the presentation.",
      ],
      notes: ["常和 when / during 等时间语境连用"],
    },
    "used to": {
      translation: "过去常常",
      meaningInSentence: "这里表示她以前有按贪睡键的习惯，现在已经改变。",
      usageNote:
        "用于描述过去经常发生、现在不再持续的习惯或状态，后面通常接动词原形。",
      examples: [
        "I used to drink coffee at night.",
        "They used to live near the station.",
      ],
      pronunciation: "/juːst tə/",
    },
    "as soon as": {
      translation: "一……就……",
      meaningInSentence: "这里表示闹钟一响，她就马上起床。",
      usageNote:
        "用于连接两个连续动作，强调后一个动作几乎立刻发生。",
      examples: [
        "Call me as soon as you arrive.",
        "She left as soon as the meeting ended.",
      ],
      pronunciation: "/əz suːn əz/",
    },
    "goes off": {
      translation: "响起",
      meaningInSentence: "这里表示闹钟开始响起的那个瞬间。",
      usageNote:
        "常用于闹钟、警报、计时器等设备发出声音或触发提醒的场景。",
      examples: [
        "My alarm goes off at 6:30.",
        "The fire alarm went off suddenly.",
      ],
    },
    "skip breakfast": {
      translation: "不吃早餐",
      meaningInSentence: "这里表示她早上不吃早餐，导致后续状态变差。",
      usageNote:
        "用于描述因为赶时间或习惯原因而省略早餐这一行为。",
      examples: [
        "I never skip breakfast on weekdays.",
        "She skipped breakfast and felt tired by 10 a.m.",
      ],
    },
    "has become": {
      translation: "已经变成",
      meaningInSentence: "这里表示做咖啡已经逐渐变成固定习惯。",
      usageNote:
        "表示某件事经历变化后形成稳定状态，常用于描述习惯、角色或关系变化。",
      examples: [
        "Reading has become part of my morning routine.",
        "This café has become our team’s favorite spot.",
      ],
    },
    "easing into": {
      translation: "慢慢进入",
      meaningInSentence: "这里强调以平缓方式进入一天的节奏。",
      usageNote:
        "常用于描述逐步进入某种状态，语气比 start 更柔和自然。",
      examples: [
        "I’m easing into the new schedule.",
        "She likes easing into work with music.",
      ],
    },
    "pick up": {
      translation: "逐步掌握",
      meaningInSentence: "这里表示通过阅读在语境里慢慢学会实用表达。",
      usageNote:
        "常用于描述在反复接触中自然学会语言、技巧或习惯。",
      examples: [
        "I picked up useful phrases from podcasts.",
        "Kids pick up accents quickly.",
      ],
      pronunciation: "/pɪk ʌp/",
    },
    "in context": {
      translation: "在语境中",
      meaningInSentence: "这里强调不是孤立记词，而是在完整语境中理解表达。",
      usageNote:
        "常用于语言学习和内容理解场景，强调结合上下文获取准确含义。",
      examples: [
        "Try to learn vocabulary in context.",
        "The phrase is clearer in context.",
      ],
    },
    "by the time": {
      translation: "到……时候",
      meaningInSentence: "这里表示到达办公室时，前面的准备已基本完成。",
      usageNote:
        "用于描述两个时间点的先后关系，强调某个时点前结果已出现。",
      examples: [
        "By the time I got home, dinner was ready.",
        "By the time we arrived, the show had started.",
      ],
    },
    "warmed up": {
      translation: "进入状态",
      meaningInSentence: "这里表示大脑已经从清晨状态切换到工作状态。",
      usageNote:
        "常用于描述身体或思维从冷启动到活跃状态的过程。",
      examples: [
        "After a short walk, I felt warmed up.",
        "My brain gets warmed up after reading for 15 minutes.",
      ],
    },
  };

  const picked = curated[key];
  if (picked) {
    return {
      text: chunkText,
      translation: picked.translation,
      pronunciation: picked.pronunciation ?? explanation?.pronunciation,
      meaningInSentence: picked.meaningInSentence,
      usageNote: picked.usageNote,
      examples: picked.examples.slice(0, 2),
      notes: picked.notes ?? explanation?.breakdown,
    };
  }

  if (explanation) {
    return {
      text: chunkText,
      translation: explanation.translation,
      pronunciation: explanation.pronunciation,
      meaningInSentence: `这里可以理解为：${sentence.translation}`,
      usageNote:
        "常用于口语和写作中表达状态、动作或语气变化，建议结合真实语境反复接触。",
      examples: explanation.examples.slice(0, 2),
      notes: explanation.breakdown,
    };
  }

  return {
    text: chunkText,
    translation: "常用表达",
    meaningInSentence: "这里表示该句子里的关键语义点。",
    usageNote:
      "常用于日常交流中补充动作细节或状态变化，建议放进完整句子里记忆。",
    examples: [
      `Try using "${chunkText}" in your own sentence.`,
      `I saved "${chunkText}" for review.`,
    ],
    notes: ["优先记忆短语与完整句子搭配"],
  };
};

export const getChunkLayerFromLesson = (
  lesson: Lesson,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  const explanation = lesson.explanations.find(
    (item) => item.key.toLowerCase() === chunkText.toLowerCase(),
  );

  return toChunkLayer(explanation, sentence, chunkText);
};
