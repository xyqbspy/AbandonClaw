import { AIExplanation, Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";

export const lessons: Lesson[] = [
  {
    id: "scene-1",
    slug: "dinner-plan-cancelled",
    title: "Dinner Plan Cancelled",
    subtitle: "A quick plan changes because of work pressure.",
    description: "Practice natural conversation for canceling plans politely and rescheduling.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 18,
    tags: ["daily conversation", "plans", "work"],
    sections: [
      {
        id: "scene-1-sec-1",
        title: "Dinner Plan Cancelled",
        summary: "A casual dinner plan is canceled at the last minute.",
        sentences: [
          {
            id: "dpc-1",
            text: "Are we still on for dinner?",
            translation: "我们晚饭的约还算数吗？",
            chunks: ["on for dinner", "still on"],
          },
          {
            id: "dpc-2",
            text: "I was just about to text you, something came up.",
            translation: "我正准备给你发消息，突然有事了。",
            chunks: ["about to", "came up"],
          },
          {
            id: "dpc-3",
            text: "Let me guess, working again?",
            translation: "我猜猜，又在加班？",
            chunks: ["let me guess", "working again"],
          },
          {
            id: "dpc-4",
            text: "Yeah, I'm stuck at the office.",
            translation: "是啊，我还被困在办公室。",
            chunks: ["stuck at", "the office"],
          },
          {
            id: "dpc-5",
            text: "You've been crazy busy lately.",
            translation: "你最近真的忙疯了。",
            chunks: ["crazy busy", "lately"],
          },
          {
            id: "dpc-6",
            text: "I know, rain check?",
            translation: "我知道，要不改天？",
            chunks: ["rain check", "I know"],
          },
          {
            id: "dpc-7",
            text: "Sure, we'll do it another time.",
            translation: "行，我们改天再约。",
            chunks: ["another time", "we'll do it"],
          },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-2",
    slug: "long-day-at-work",
    title: "Long Day at Work",
    subtitle: "Share frustration after an unproductive afternoon.",
    description: "Learn how to describe tiredness, meetings, and emotional reactions naturally.",
    difficulty: "Intermediate",
    estimatedMinutes: 9,
    completionRate: 0,
    tags: ["office", "small talk", "feelings"],
    sections: [
      {
        id: "scene-2-sec-1",
        title: "Long Day at Work",
        summary: "Talking about a draining day and setting boundaries after work.",
        sentences: [
          {
            id: "ldw-1",
            text: "You look exhausted. Long day?",
            translation: "你看起来很累，今天很漫长吧？",
            chunks: ["look exhausted", "long day"],
          },
          {
            id: "ldw-2",
            text: "Meetings all afternoon, nothing got decided.",
            translation: "整个下午都在开会，结果什么都没定下来。",
            chunks: ["all afternoon", "got decided"],
          },
          {
            id: "ldw-3",
            text: "That's the worst, talking for hours and going nowhere.",
            translation: "这最折磨人了，说了几个小时却毫无进展。",
            chunks: ["the worst", "going nowhere"],
          },
          {
            id: "ldw-4",
            text: "Exactly, by the end everyone just wanted to leave.",
            translation: "就是，到最后大家只想赶紧走。",
            chunks: ["by the end", "wanted to leave"],
          },
          {
            id: "ldw-5",
            text: "At least that's over now.",
            translation: "至少现在都结束了。",
            chunks: ["at least", "over now"],
          },
          {
            id: "ldw-6",
            text: "True, I'm not opening my laptop tonight.",
            translation: "也是，我今晚绝不再打开电脑。",
            chunks: ["true", "not opening my laptop"],
          },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-3",
    slug: "stayed-up-too-late",
    title: "Stayed Up Too Late",
    subtitle: "A realistic chat about poor sleep and low energy.",
    description: "Use practical spoken English for habits, regret, and recovering from tiredness.",
    difficulty: "Intermediate",
    estimatedMinutes: 11,
    completionRate: 0,
    tags: ["sleep", "habits", "daily life"],
    sections: [
      {
        id: "scene-3-sec-1",
        title: "Stayed Up Too Late",
        summary: "A casual check-in after a night of little sleep.",
        sentences: [
          {
            id: "sutl-1",
            text: "You look tired today.",
            translation: "你今天看起来很累。",
            chunks: ["look tired", "today"],
          },
          {
            id: "sutl-2",
            text: "Yeah, I stayed up too late last night.",
            translation: "是啊，我昨晚睡得太晚了。",
            chunks: ["stayed up too late", "last night"],
          },
          {
            id: "sutl-3",
            text: "Working or messing around?",
            translation: "在工作，还是在瞎刷？",
            chunks: ["messing around", "working"],
          },
          {
            id: "sutl-4",
            text: "Honestly, just watching videos and scrolling.",
            translation: "老实说，就是在看视频和刷手机。",
            chunks: ["honestly", "scrolling"],
          },
          {
            id: "sutl-5",
            text: "That happens. Did you at least get some sleep?",
            translation: "这种情况很常见。你至少睡了一点吗？",
            chunks: ["that happens", "at least"],
          },
          {
            id: "sutl-6",
            text: "Not really, about five hours.",
            translation: "也没怎么睡，大概五个小时。",
            chunks: ["not really", "about five hours"],
          },
          {
            id: "sutl-7",
            text: "No wonder you're exhausted.",
            translation: "难怪你这么疲惫。",
            chunks: ["no wonder", "exhausted"],
          },
          {
            id: "sutl-8",
            text: "Exactly, I'm grabbing coffee and calling it a day.",
            translation: "可不是嘛，我先去买杯咖啡，今天就这样了。",
            chunks: ["grabbing coffee", "calling it a day"],
          },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-4",
    slug: "subway-commute-morning",
    title: "Subway Commute Morning",
    subtitle: "Complain about a packed commute and low morning energy.",
    description: "Understand natural back-and-forth conversation about commuting stress.",
    difficulty: "Intermediate",
    estimatedMinutes: 12,
    completionRate: 0,
    tags: ["commute", "morning", "daily conversation"],
    sections: [
      {
        id: "scene-4-sec-1",
        title: "Subway Commute Morning",
        summary: "A short dialogue after a crowded subway ride.",
        sentences: [
          {
            id: "scm-1",
            text: "You look exhausted today.",
            translation: "你今天看起来很疲惫。",
            chunks: ["look exhausted", "today"],
          },
          {
            id: "scm-2",
            text: "Yeah, the subway was packed again.",
            translation: "是啊，地铁今天又挤爆了。",
            chunks: ["packed again", "the subway"],
          },
          {
            id: "scm-3",
            text: "Didn't get a seat?",
            translation: "没抢到座位吗？",
            chunks: ["get a seat"],
          },
          {
            id: "scm-4",
            text: "Not this time.",
            translation: "这次没坐上。",
            chunks: ["not this time"],
          },
          {
            id: "scm-5",
            text: "That commute is brutal.",
            translation: "那段通勤真是折磨人。",
            chunks: ["commute", "brutal"],
          },
          {
            id: "scm-6",
            text: "Tell me about it.",
            translation: "可不是嘛。",
            chunks: ["tell me about it"],
          },
          {
            id: "scm-7",
            text: "How long does it take now?",
            translation: "现在要花多久？",
            chunks: ["how long", "take now"],
          },
          {
            id: "scm-8",
            text: "Almost an hour door to door.",
            translation: "门到门差不多一个小时。",
            chunks: ["door to door", "almost an hour"],
          },
          {
            id: "scm-9",
            text: "No wonder you're tired.",
            translation: "难怪你这么累。",
            chunks: ["no wonder", "tired"],
          },
          {
            id: "scm-10",
            text: "Yeah, I need coffee before anything else.",
            translation: "是啊，我得先喝杯咖啡再说。",
            chunks: ["before anything else", "need coffee"],
          },
        ],
      },
    ],
    explanations: [],
  },
];

export const scenes = lessons;

const explanationSeed: AIExplanation[] = [
  {
    key: "rain check",
    text: "rain check",
    translation: "改天再约",
    explanation: "用于礼貌地表示这次先取消，改到别的时间再进行。",
    examples: ["Can we take a rain check?", "Let's do a rain check for Friday."],
    breakdown: ["口语高频", "用于改期", "语气友好"],
    pronunciation: "/reɪn tʃek/",
  },
  {
    key: "by the end",
    text: "by the end",
    translation: "到最后",
    explanation: "表示某个过程推进到末尾时的状态或结果。",
    examples: ["By the end, everyone was tired.", "By the end of the week, we finished it."],
    breakdown: ["时间短语", "常与过去时搭配"],
    pronunciation: "/baɪ ði end/",
  },
  {
    key: "stayed up too late",
    text: "stayed up too late",
    translation: "熬夜太晚",
    explanation: "表示睡觉时间严重延后，导致休息不足。",
    examples: ["I stayed up too late again.", "She stayed up too late studying."],
    breakdown: ["stay up", "描述昨晚状态"],
    pronunciation: "/steɪd ʌp tuː leɪt/",
  },
  {
    key: "door to door",
    text: "door to door",
    translation: "门到门",
    explanation: "指从出发地门口到目的地门口的完整通勤耗时。",
    examples: ["It's 50 minutes door to door.", "Door to door takes almost an hour."],
    breakdown: ["通勤语境高频", "强调全程时间"],
    pronunciation: "/dɔːr tə dɔːr/",
  },
];

for (const lesson of lessons) {
  lesson.explanations = explanationSeed;
}

export const getLessonBySlug = (slug: string) => lessons.find((lesson) => lesson.slug === slug);

export const getSceneBySlug = (slug: string) => getLessonBySlug(slug);

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
    "on for dinner": {
      translation: "晚饭约仍然有效",
      meaningInSentence: "这里在确认原本的晚饭安排是否还按计划进行。",
      usageNote: "be on 常用于确认活动、约会、会议是否照常进行。",
      examples: [
        "Is the meeting still on for tomorrow?",
        "Are we still on for lunch?",
      ],
    },
    "came up": {
      translation: "突然有事",
      meaningInSentence: "这里表示临时出现了打乱计划的事情。",
      usageNote: "come up 常用于日常对话，表示突发情况或临时问题。",
      examples: [
        "Sorry, something came up at work.",
        "Can we reschedule? Something came up.",
      ],
    },
    "stuck at": {
      translation: "被困在",
      meaningInSentence: "这里表示人还被工作困在办公室，无法离开。",
      usageNote: "stuck at + 地点/状态，用于表达无法脱身的语感。",
      examples: ["I'm stuck at the airport.", "She was stuck at work late."],
    },
    "rain check": {
      translation: "改天再约",
      meaningInSentence: "这里是礼貌提议把这次见面改到下次。",
      usageNote: "口语中用于临时取消后提出延期，语气轻松不生硬。",
      examples: ["Can we do a rain check?", "Rain check for this weekend?"],
      pronunciation: "/reɪn tʃek/",
    },
    "got decided": {
      translation: "被定下来",
      meaningInSentence: "这里表示开了很久会，但没有任何事项真正拍板。",
      usageNote: "get decided 常见于会议语境，强调结果是否被确定。",
      examples: [
        "Nothing got decided in the meeting.",
        "We need this to get decided today.",
      ],
    },
    "by the end": {
      translation: "到最后",
      meaningInSentence: "这里强调会开到后段时，大家都已疲惫。",
      usageNote: "用于描述过程推进到末尾时的状态变化。",
      examples: ["By the end, everyone went quiet.", "By the end, I was done."],
      pronunciation: "/baɪ ði end/",
    },
    "stayed up too late": {
      translation: "熬夜太晚",
      meaningInSentence: "这里表示昨晚睡得过晚，直接影响今天精神状态。",
      usageNote: "用于描述睡眠不足的原因，日常表达非常高频。",
      examples: ["I stayed up too late gaming.", "He stayed up too late again."],
      pronunciation: "/steɪd ʌp tuː leɪt/",
    },
    "messing around": {
      translation: "瞎刷打发时间",
      meaningInSentence: "这里表示并非认真工作，而是在随意消磨时间。",
      usageNote: "mess around 常用于轻松语境，表示做事不专注或随便玩。",
      examples: ["I was just messing around online.", "Stop messing around and start."],
    },
    "calling it a day": {
      translation: "今天就到这",
      meaningInSentence: "这里表示决定结束当天安排，不再继续忙下去。",
      usageNote: "常用于工作、学习结束时，语气自然、口语化。",
      examples: ["Let's call it a day.", "I'm calling it a day after this."],
    },
    "packed again": {
      translation: "又很拥挤",
      meaningInSentence: "这里说明地铁早高峰再次挤满了人。",
      usageNote: "packed 常用于交通、场馆、人群密集场景。",
      examples: ["The train was packed this morning.", "It gets packed after 8 a.m."],
    },
    "door to door": {
      translation: "门到门",
      meaningInSentence: "这里表示从家门到公司门口全程将近一小时。",
      usageNote: "用于估算完整通勤时间，比单程车程更完整。",
      examples: ["It's an hour door to door.", "Door to door takes 45 minutes."],
      pronunciation: "/dɔːr tə dɔːr/",
    },
    "before anything else": {
      translation: "先把这件事做了",
      meaningInSentence: "这里强调在做其他事情前，先喝咖啡恢复状态。",
      usageNote: "用于表达优先级，常见于日常安排和工作语境。",
      examples: ["I need water before anything else.", "Stretch before anything else."],
    },
    "no wonder": {
      translation: "难怪",
      meaningInSentence: "这里用于顺着前文原因，得出合理结果。",
      usageNote: "口语里用于表示理解或恍然大悟，语气自然。",
      examples: ["No wonder you're late.", "No wonder she looked tired."],
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
