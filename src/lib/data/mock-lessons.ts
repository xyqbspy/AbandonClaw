import { AIExplanation, Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";

export const lessons: Lesson[] = [
  {
    id: "scene-1",
    slug: "dinner-plan-cancelled",
    title: "Dinner Plan Cancelled（晚餐计划取消）",
    subtitle: "A quick plan change because of work pressure.",
    description: "Practice natural conversation for canceling plans politely and rescheduling.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 18,
    tags: ["daily conversation", "plans", "work"],
    sections: [
      {
        id: "scene-1-sec-1",
        title: "Dinner Plan Cancelled（晚餐计划取消）",
        summary: "A casual dinner plan is canceled at the last minute.",
        sentences: [
          {
            id: "dpc-1",
            text: "Are we still on for dinner?",
            translation: "我们晚饭的约还算数吗？",
            chunks: ["still on", "on for dinner"],
            chunkDetails: [
              {
                text: "still on",
                translation: "还照常进行",
                grammarLabel: "固定搭配 / 状态确认",
                meaningInSentence: "这里用来确认原本的安排现在是不是还有效。",
                usageNote: "be still on 常用于确认约会、会议、计划是否继续进行。",
                examples: [
                  { en: "Is the meeting still on?", zh: "会议还照常开吗？" },
                  { en: "Are we still on for tomorrow?", zh: "我们明天的安排还照旧吗？" },
                ],
                pronunciation: "/stɪl ɑːn/",
                synonyms: ["still happening", "still scheduled"],
              },
              {
                text: "on for dinner",
                translation: "晚饭约还在",
                grammarLabel: "固定搭配 / 约定表达",
                meaningInSentence: "表示晚饭这件事仍然按计划进行。",
                usageNote: "be on for + 活动，表示某活动照常进行。",
                examples: [
                  { en: "Are we on for lunch?", zh: "我们午饭还约吗？" },
                  { en: "The date is still on for Friday.", zh: "周五的约会还照常。" },
                ],
                pronunciation: "/ɑːn fər ˈdɪnər/",
              },
            ],
          },
          {
            id: "dpc-2",
            text: "I was just about to text you, something came up.",
            translation: "我正准备给你发消息，突然有事了。",
            chunks: ["about to", "came up"],
            chunkDetails: [
              {
                text: "about to",
                translation: "正要；马上就要",
                grammarLabel: "语法 chunk / be about to do",
                meaningInSentence: "表示某个动作即将发生，这里是“正准备给你发消息”。",
                usageNote: "be about to do 用于表示‘马上要做某事’，很口语也很高频。",
                examples: [
                  { en: "I’m about to leave.", zh: "我正要走。" },
                  { en: "She was about to call you.", zh: "她刚刚正要给你打电话。" },
                ],
                pronunciation: "/əˈbaʊt tuː/",
              },
              {
                text: "came up",
                translation: "突然发生；临时有事",
                grammarLabel: "动词短语 / come up",
                meaningInSentence: "这里表示突然出现了一个打乱计划的事情。",
                usageNote: "something came up 是口语里极高频的临时取消理由。",
                examples: [
                  { en: "Sorry, something came up at work.", zh: "抱歉，工作上突然有事。" },
                  { en: "Can we talk later? Something came up.", zh: "我们晚点聊吧，突然有点事。" },
                ],
                pronunciation: "/keɪm ʌp/",
                synonyms: ["happened", "turned up unexpectedly"],
              },
            ],
          },
          {
            id: "dpc-3",
            text: "Let me guess, working again?",
            translation: "我猜猜，又在加班？",
            chunks: ["let me guess", "working again"],
            chunkDetails: [
              {
                text: "let me guess",
                translation: "我猜猜看",
                grammarLabel: "口语起手句",
                meaningInSentence: "说话人先抛出一个半开玩笑的猜测。",
                usageNote: "常用于熟人之间，表示你大概知道答案了。",
                examples: [
                  { en: "Let me guess, you forgot again?", zh: "我猜猜，你又忘了？" },
                  { en: "Let me guess, traffic was bad?", zh: "我猜猜，路上堵车了？" },
                ],
                pronunciation: "/let mi ɡes/",
              },
              {
                text: "working again",
                translation: "又在工作；又在加班",
                grammarLabel: "现在分词短语 / 状态追问",
                meaningInSentence: "这里省略了完整句，实际语气是“你又在工作吗？”",
                usageNote: "口语中常用这种简短省略句，语气更自然。",
                examples: [
                  { en: "Studying again?", zh: "又在学习啊？" },
                  { en: "Late again?", zh: "又晚了啊？" },
                ],
              },
            ],
          },
          {
            id: "dpc-4",
            text: "Yeah, I'm stuck at the office.",
            translation: "是啊，我还被困在办公室。",
            chunks: ["stuck at", "the office"],
            chunkDetails: [
              {
                text: "stuck at",
                translation: "被困在；脱不开身",
                grammarLabel: "固定搭配 / stuck at + 地点",
                meaningInSentence: "这里不是字面上的困住，而是指因为工作走不开。",
                usageNote: "stuck at 常表示因为某种原因无法离开某地。",
                examples: [
                  { en: "I’m stuck at work.", zh: "我被工作困住了，走不开。" },
                  { en: "She’s stuck at the airport.", zh: "她被困在机场了。" },
                ],
                pronunciation: "/stʌk æt/",
              },
              {
                text: "the office",
                translation: "办公室",
                grammarLabel: "高频场景名词",
                meaningInSentence: "这里强调说话人还在办公室，没法赴约。",
                usageNote: "office 在职场口语中非常高频，常和 at / in 搭配。",
                examples: [
                  { en: "I’m still at the office.", zh: "我还在办公室。" },
                  { en: "He left the office late.", zh: "他很晚才离开办公室。" },
                ],
              },
            ],
          },
          {
            id: "dpc-5",
            text: "You've been crazy busy lately.",
            translation: "你最近真的忙疯了。",
            chunks: ["crazy busy", "lately"],
            chunkDetails: [
              {
                text: "crazy busy",
                translation: "忙疯了；特别忙",
                grammarLabel: "程度表达 / 口语强化",
                meaningInSentence: "crazy 在这里是加强语气，不是真的‘疯狂’。",
                usageNote: "crazy + 形容词 是口语里很自然的强调方式。",
                examples: [
                  { en: "I’ve been crazy busy this week.", zh: "我这周忙疯了。" },
                  { en: "Things are crazy busy right now.", zh: "最近事情特别多。" },
                ],
                pronunciation: "/ˈkreɪzi ˈbɪzi/",
              },
              {
                text: "lately",
                translation: "最近",
                grammarLabel: "时间副词",
                meaningInSentence: "表示这一段时间持续如此。",
                usageNote: "lately 常和现在完成时连用，表示最近一段时间。",
                examples: [
                  { en: "I haven’t slept well lately.", zh: "我最近睡得不太好。" },
                  { en: "She’s been stressed lately.", zh: "她最近压力很大。" },
                ],
                pronunciation: "/ˈleɪtli/",
              },
            ],
          },
          {
            id: "dpc-6",
            text: "I know, rain check?",
            translation: "我知道，要不改天？",
            chunks: ["I know", "rain check"],
            chunkDetails: [
              {
                text: "I know",
                translation: "我知道",
                grammarLabel: "回应句 / 承接情绪",
                meaningInSentence: "这里不是单纯陈述事实，而是承认对方说得对。",
                usageNote: "I know 在口语里常用来接住对方情绪，显得自然。",
                examples: [
                  { en: "I know, it’s been a lot.", zh: "我知道，最近确实很多事。" },
                  { en: "I know, I’ve been terrible at replying.", zh: "我知道，我最近回消息很差劲。" },
                ],
              },
              {
                text: "rain check",
                translation: "改天再约",
                grammarLabel: "固定表达 / 礼貌改期",
                meaningInSentence: "表示这次先取消，但保留以后再约的意思。",
                usageNote: "非常适合约饭、看电影、见面等社交场景。",
                examples: [
                  { en: "Can we take a rain check?", zh: "我们可以改天吗？" },
                  { en: "Rain check for this weekend?", zh: "这个周末改天行吗？" },
                ],
                pronunciation: "/reɪn tʃek/",
              },
            ],
          },
          {
            id: "dpc-7",
            text: "Sure, we'll do it another time.",
            translation: "行，我们改天再约。",
            chunks: ["another time", "we'll do it"],
            chunkDetails: [
              {
                text: "another time",
                translation: "改天；另找时间",
                grammarLabel: "时间表达 / 改期",
                meaningInSentence: "表示不纠结这次，换个时间再做。",
                usageNote: "another time 比 later 更完整，更像正式说‘下次再说’。",
                examples: [
                  { en: "Let’s talk another time.", zh: "我们改天再聊。" },
                  { en: "We can do lunch another time.", zh: "我们可以改天再一起吃午饭。" },
                ],
                pronunciation: "/əˈnʌðər taɪm/",
              },
              {
                text: "we'll do it",
                translation: "我们到时候再做",
                grammarLabel: "未来安排表达",
                meaningInSentence: "这里的 it 指代 dinner plan，表示以后会补上。",
                usageNote: "we’ll do it 是很自然的口语表达，表示以后补做这件事。",
                examples: [
                  { en: "We’ll do it next week.", zh: "我们下周再弄。" },
                  { en: "Don’t worry, we’ll do it soon.", zh: "别担心，我们很快会做的。" },
                ],
              },
            ],
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
    exampleTranslations: ["我们可以改天吗？", "我们改到周五吧。"],
    breakdown: ["口语高频", "用于改期", "语气友好"],
    pronunciation: "/reɪn tʃek/",
    grammarLabel: "固定表达 / 礼貌改期",
  },
  {
    key: "by the end",
    text: "by the end",
    translation: "到最后",
    explanation: "表示某个过程推进到末尾时的状态或结果。",
    examples: ["By the end, everyone was tired.", "By the end of the week, we finished it."],
    exampleTranslations: ["到最后大家都累了。", "到周末时我们把它完成了。"],
    breakdown: ["时间短语", "常与过去时搭配"],
    pronunciation: "/baɪ ði end/",
    grammarLabel: "时间短语",
  },
  {
    key: "stayed up too late",
    text: "stayed up too late",
    translation: "熬夜太晚",
    explanation: "表示睡觉时间严重延后，导致休息不足。",
    examples: ["I stayed up too late again.", "She stayed up too late studying."],
    exampleTranslations: ["我又熬夜太晚了。", "她为了学习熬夜太晚。"],
    breakdown: ["stay up", "描述昨晚状态"],
    pronunciation: "/steɪd ʌp tuː leɪt/",
    grammarLabel: "动词短语 / 睡眠表达",
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
      grammarLabel: explanation?.grammarLabel,
      meaningInSentence: picked.meaningInSentence,
      usageNote: picked.usageNote,
      examples: picked.examples.slice(0, 2),
      exampleTranslations: explanation?.exampleTranslations?.slice(0, 2),
      notes: picked.notes ?? explanation?.breakdown,
    };
  }

  if (explanation) {
    return {
      text: chunkText,
      translation: explanation.translation,
      pronunciation: explanation.pronunciation,
      grammarLabel: explanation.grammarLabel,
      meaningInSentence: `这里可以理解为：${sentence.translation}`,
      usageNote:
        "常用于口语和写作中表达状态、动作或语气变化，建议结合真实语境反复接触。",
      examples: explanation.examples.slice(0, 2),
      exampleTranslations: explanation.exampleTranslations.slice(0, 2),
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
  const localChunk = sentence.chunkDetails?.find(
    (item) => item.text.toLowerCase() === chunkText.toLowerCase(),
  );

  if (localChunk) {
    return {
      text: localChunk.text,
      translation: localChunk.translation,
      pronunciation: localChunk.pronunciation,
      grammarLabel: localChunk.grammarLabel,
      meaningInSentence: localChunk.meaningInSentence,
      usageNote: localChunk.usageNote,
      examples: localChunk.examples.map((item) => item.en),
      exampleTranslations: localChunk.examples.map((item) => item.zh),
      notes: localChunk.synonyms ?? [],
    };
  }

  const explanation = lesson.explanations.find(
    (item) => item.key.toLowerCase() === chunkText.toLowerCase(),
  );

  return toChunkLayer(explanation, sentence, chunkText);
};
