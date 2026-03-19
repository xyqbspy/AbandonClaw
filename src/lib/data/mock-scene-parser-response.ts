import { SceneParserResponse } from "@/lib/types/scene-parser";

const ex = (en: string, zh: string) => ({ en, zh });
const chunk = (
  key: string,
  translation: string,
  grammarLabel: string,
  meaningInSentence: string,
  usageNote: string,
  examples: Array<{ en: string; zh: string }>,
  pronunciation?: string,
  synonyms?: string[],
) => ({
  key,
  text: key,
  translation,
  grammarLabel,
  meaningInSentence,
  usageNote,
  examples,
  pronunciation,
  synonyms,
});

export const takeTheMorningOffParserResponse: SceneParserResponse = {
  version: "v1",
  scene: {
    id: "scene-7",
    slug: "take-the-morning-off",
    title: "Take the Morning Off",
    subtitle: "A low-energy morning and a practical recovery plan.",
    description: "Mixes familiar chunks with a few new high-frequency blocks.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 0,
    tags: ["health", "work"],
    dialogue: [
      {
        id: "tmo-1",
        speaker: "A",
        text: "You look like you're running on empty this morning.",
        translation: "你今天早上看起来像电量见底。",
        tts: "You look like you're running on empty this morning.",
        chunks: [
          chunk(
            "running on empty",
            "靠最后一口气硬撑",
            "High-frequency chunk",
            "A vivid way to describe very low energy.",
            "Very common in fatigue-related conversations.",
            [
              ex("I'm running on empty today.", "我今天全靠硬撑。"),
              ex("She was running on empty all week.", "她这周都在硬撑。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-2",
        speaker: "B",
        text: "I am. I stayed up too late and barely slept.",
        translation: "是啊，我熬太晚了，几乎没睡。",
        tts: "I am. I stayed up too late and barely slept.",
        chunks: [
          chunk(
            "barely slept",
            "几乎没睡",
            "High-frequency chunk",
            "Stronger than 'slept badly'.",
            "'Barely + verb' means almost did not do it.",
            [
              ex("I barely slept last night.", "我昨晚几乎没睡。"),
              ex("He barely slept before the exam.", "他考前几乎没睡。"),
            ],
          ),
          chunk(
            "stayed up too late",
            "熬夜太晚",
            "Reusable chunk",
            "Explains why energy is low.",
            "Useful across work and lifestyle contexts.",
            [
              ex("I stayed up too late again.", "我又熬夜太晚。"),
              ex("She stayed up too late studying.", "她学习熬夜太晚。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-3",
        speaker: "A",
        text: "Why don't you take the morning off?",
        translation: "你要不早上请个半天假？",
        tts: "Why don't you take the morning off?",
        chunks: [
          chunk(
            "take the morning off",
            "早上请半天假",
            "Work phrase",
            "A concrete recovery suggestion.",
            "'take ... off' is very common in workplace English.",
            [
              ex("I might take tomorrow off.", "我可能明天请假。"),
              ex("Take the afternoon off.", "下午请个假吧。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-4",
        speaker: "B",
        text: "I can't. I have two meetings, and I just need to get through the day.",
        translation: "不行，我有两个会，只能先把今天扛过去。",
        tts: "I can't. I have two meetings, and I just need to get through the day.",
        chunks: [
          chunk(
            "get through the day",
            "把这一天熬过去",
            "High-frequency chunk",
            "Focus is surviving the day, not being productive.",
            "Very practical for low-energy days.",
            [
              ex("I'm just trying to get through the day.", "我只想把今天撑过去。"),
              ex("Coffee helps me get through the day.", "咖啡帮我把这天熬过去。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-5",
        speaker: "A",
        text: "At least skip the late call tonight.",
        translation: "至少把今晚晚会跳过吧。",
        tts: "At least skip the late call tonight.",
        chunks: [
          chunk(
            "at least",
            "至少",
            "Reusable chunk",
            "Find the minimum workable adjustment.",
            "High frequency in suggestions and reassurance.",
            [
              ex("At least eat first.", "至少先吃点。"),
              ex("At least leave on time.", "至少按时下班。"),
            ],
          ),
          chunk(
            "skip the late call",
            "跳过晚间会议",
            "Scenario phrase",
            "A specific way to reduce load.",
            "'skip' is common in schedule management.",
            [
              ex("Can I skip this call?", "这个会我可以不参加吗？"),
              ex("Let's skip the optional meeting.", "我们跳过可选会议吧。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-6",
        speaker: "B",
        text: "Good idea. I'll call it a day right after dinner.",
        translation: "好主意，我晚饭后就收工。",
        tts: "Good idea. I'll call it a day right after dinner.",
        chunks: [
          chunk(
            "call it a day",
            "今天就到这",
            "Reusable chunk",
            "Explicitly ends work for today.",
            "A common wrap-up expression.",
            [
              ex("Let's call it a day.", "今天就到这吧。"),
              ex("I'm calling it a day now.", "我现在收工。"),
            ],
          ),
        ],
      },
      {
        id: "tmo-7",
        speaker: "A",
        text: "Then get some sleep and get back on track tomorrow.",
        translation: "然后补点觉，明天再回到正轨。",
        tts: "Then get some sleep and get back on track tomorrow.",
        chunks: [
          chunk(
            "get back on track",
            "回到正轨",
            "Reusable chunk",
            "Connect recovery with next-step execution.",
            "Natural with 'tomorrow' or 'this week'.",
            [
              ex("Let's get back on track tomorrow.", "我们明天回到节奏。"),
              ex("I need to get back on track this week.", "我这周得回到正轨。"),
            ],
          ),
        ],
      },
    ],
    sections: [
      {
        id: "scene-7-sec-1",
        title: "Take the Morning Off",
        summary: "How to survive a depleted morning.",
        sentences: [
          {
            id: "tmo-1",
            text: "You look like you're running on empty this morning.",
            translation: "你今天早上看起来像电量见底。",
            chunks: [
              chunk(
                "running on empty",
                "靠最后一口气硬撑",
                "High-frequency chunk",
                "A vivid way to describe very low energy.",
                "Very common in fatigue-related conversations.",
                [
                  ex("I'm running on empty today.", "我今天全靠硬撑。"),
                  ex("She was running on empty all week.", "她这周都在硬撑。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-2",
            text: "I am. I stayed up too late and barely slept.",
            translation: "是啊，我熬太晚了，几乎没睡。",
            chunks: [
              chunk(
                "barely slept",
                "几乎没睡",
                "High-frequency chunk",
                "Stronger than 'slept badly'.",
                "'Barely + verb' means almost did not do it.",
                [
                  ex("I barely slept last night.", "我昨晚几乎没睡。"),
                  ex("He barely slept before the exam.", "他考前几乎没睡。"),
                ],
              ),
              chunk(
                "stayed up too late",
                "熬夜太晚",
                "Reusable chunk",
                "Explains why energy is low.",
                "Useful across work and lifestyle contexts.",
                [
                  ex("I stayed up too late again.", "我又熬夜太晚。"),
                  ex("She stayed up too late studying.", "她学习熬夜太晚。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-3",
            text: "Why don't you take the morning off?",
            translation: "你要不早上请个半天假？",
            chunks: [
              chunk(
                "take the morning off",
                "早上请半天假",
                "Work phrase",
                "A concrete recovery suggestion.",
                "'take ... off' is very common in workplace English.",
                [
                  ex("I might take tomorrow off.", "我可能明天请假。"),
                  ex("Take the afternoon off.", "下午请个假吧。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-4",
            text: "I can't. I have two meetings, and I just need to get through the day.",
            translation: "不行，我有两个会，只能先把今天扛过去。",
            chunks: [
              chunk(
                "get through the day",
                "把这一天熬过去",
                "High-frequency chunk",
                "Focus is surviving the day, not being productive.",
                "Very practical for low-energy days.",
                [
                  ex("I'm just trying to get through the day.", "我只想把今天撑过去。"),
                  ex("Coffee helps me get through the day.", "咖啡帮我把这天熬过去。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-5",
            text: "At least skip the late call tonight.",
            translation: "至少把今晚晚会跳过吧。",
            chunks: [
              chunk(
                "at least",
                "至少",
                "Reusable chunk",
                "Find the minimum workable adjustment.",
                "High frequency in suggestions and reassurance.",
                [
                  ex("At least eat first.", "至少先吃点。"),
                  ex("At least leave on time.", "至少按时下班。"),
                ],
              ),
              chunk(
                "skip the late call",
                "跳过晚间会议",
                "Scenario phrase",
                "A specific way to reduce load.",
                "'skip' is common in schedule management.",
                [
                  ex("Can I skip this call?", "这个会我可以不参加吗？"),
                  ex("Let's skip the optional meeting.", "我们跳过可选会议吧。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-6",
            text: "Good idea. I'll call it a day right after dinner.",
            translation: "好主意，我晚饭后就收工。",
            chunks: [
              chunk(
                "call it a day",
                "今天就到这",
                "Reusable chunk",
                "Explicitly ends work for today.",
                "A common wrap-up expression.",
                [
                  ex("Let's call it a day.", "今天就到这吧。"),
                  ex("I'm calling it a day now.", "我现在收工。"),
                ],
              ),
            ],
          },
          {
            id: "tmo-7",
            text: "Then get some sleep and get back on track tomorrow.",
            translation: "然后补点觉，明天再回到正轨。",
            chunks: [
              chunk(
                "get back on track",
                "回到正轨",
                "Reusable chunk",
                "Connect recovery with next-step execution.",
                "Natural with 'tomorrow' or 'this week'.",
                [
                  ex("Let's get back on track tomorrow.", "我们明天回到节奏。"),
                  ex("I need to get back on track this week.", "我这周得回到正轨。"),
                ],
              ),
            ],
          },
        ],
      },
    ],
    glossary: [
      {
        key: "running on empty",
        text: "running on empty",
        translation: "靠最后一口气硬撑",
        explanation: "A vivid metaphor for very low energy.",
        examples: ["I'm running on empty today.", "She was running on empty all week."],
        exampleTranslations: ["我今天全靠硬撑。", "她这周都在硬撑。"],
        breakdown: ["fatigue", "metaphor"],
        pronunciation: "/ˈrʌnɪŋ ɑːn ˈempti/",
        grammarLabel: "Chunk",
      },
      {
        key: "take the morning off",
        text: "take the morning off",
        translation: "早上请半天假",
        explanation: "Used to suggest temporary rest from work.",
        examples: ["Why don't you take the morning off?", "I might take tomorrow off."],
        exampleTranslations: ["你要不早上请个半天假？", "我可能明天请假。"],
        breakdown: ["workplace", "actionable advice"],
        pronunciation: "/teɪk ðə ˈmɔːrnɪŋ ɔːf/",
        grammarLabel: "Work phrase",
      },
    ],
  },
};
