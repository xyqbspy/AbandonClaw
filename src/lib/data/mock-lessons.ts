import { AIExplanation, Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { takeTheMorningOffParserResponse } from "@/lib/data/mock-scene-parser-response";

const ex = (en: string, zh: string) => ({ en, zh });
const cd = (
  text: string,
  translation: string,
  grammarLabel: string,
  meaningInSentence: string,
  usageNote: string,
  examples: Array<{ en: string; zh: string }>,
  pronunciation?: string,
  synonyms?: string[],
) => ({
  text,
  translation,
  grammarLabel,
  meaningInSentence,
  usageNote,
  examples,
  pronunciation,
  synonyms,
});

export const lessons: Lesson[] = [
  {
    id: "scene-7",
    slug: "take-the-morning-off",
    title: "Take the Morning Off（早上请半天假）",
    subtitle: "A low-energy morning and a practical recovery plan.",
    description: "Mixes familiar chunks with a few new high-frequency blocks.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 0,
    tags: ["health", "work"],
    sections: [
      {
        id: "scene-7-sec-1",
        title: "Take the Morning Off（早上请半天假）",
        summary: "How to survive a depleted morning.",
        sentences: [
          { id: "tmo-1", text: "You look like you're running on empty this morning.", translation: "你今天早上看起来像电量见底。", chunks: ["running on empty"], chunkDetails: [cd("running on empty", "靠最后一口气硬撑", "新高频块", "形象表达精力快耗尽。", "疲劳语境很常用。", [ex("I'm running on empty today.", "我今天全靠硬撑。"), ex("She was running on empty all week.", "她这周都在硬撑。")])] },
          { id: "tmo-2", text: "I am. I stayed up too late and barely slept.", translation: "是啊，我熬太晚了，几乎没睡。", chunks: ["barely slept", "stayed up too late"], chunkDetails: [cd("barely slept", "几乎没睡", "新高频块", "比 slept badly 更强。", "barely + 动词 表示几乎没有。", [ex("I barely slept last night.", "我昨晚几乎没睡。"), ex("He barely slept before the exam.", "他考前几乎没睡。")]), cd("stayed up too late", "熬夜太晚", "复用块", "说明低能量的原因。", "多场景重复强化记忆。", [ex("I stayed up too late again.", "我又熬夜太晚。"), ex("She stayed up too late studying.", "她学习熬夜太晚。")])] },
          { id: "tmo-3", text: "Why don't you take the morning off?", translation: "你要不早上请个半天假？", chunks: ["take the morning off"], chunkDetails: [cd("take the morning off", "早上请半天假", "场景搭配", "给出可执行休整方案。", "take ... off 在职场很高频。", [ex("I might take tomorrow off.", "我可能明天请假。"), ex("Take the afternoon off.", "下午请个假吧。")])] },
          { id: "tmo-4", text: "I can't. I have two meetings, and I just need to get through the day.", translation: "不行，我有两个会，只能先把今天扛过去。", chunks: ["get through the day"], chunkDetails: [cd("get through the day", "把这一天熬过去", "新高频块", "目标是撑过去而非高效率。", "低能量日非常实用。", [ex("I'm just trying to get through the day.", "我只想把今天撑过去。"), ex("Coffee helps me get through the day.", "咖啡帮我把这天熬过去。")])] },
          { id: "tmo-5", text: "At least skip the late call tonight.", translation: "至少把今晚晚会跳过吧。", chunks: ["at least", "skip the late call"], chunkDetails: [cd("at least", "至少", "复用块", "在限制条件下找最小可行调整。", "at least 在建议中高频。", [ex("At least eat first.", "至少先吃点。"), ex("At least leave on time.", "至少按时下班。")]), cd("skip the late call", "跳过晚间会议", "新场景搭配", "具体减少负荷。", "skip 在时间管理语境很常见。", [ex("Can I skip this call?", "这个会我可以不参加吗？"), ex("Let's skip the optional meeting.", "我们跳过可选会议吧。")])] },
          { id: "tmo-6", text: "Good idea. I'll call it a day right after dinner.", translation: "好主意，我晚饭后就收工。", chunks: ["call it a day"], chunkDetails: [cd("call it a day", "今天就到这", "复用高频块", "明确结束当天任务。", "收尾表达高复用。", [ex("Let's call it a day.", "今天就到这吧。"), ex("I'm calling it a day now.", "我现在收工。")])] },
          { id: "tmo-7", text: "Then get some sleep and get back on track tomorrow.", translation: "然后补点觉，明天再回到正轨。", chunks: ["get back on track"], chunkDetails: [cd("get back on track", "回到正轨", "复用高频块", "把恢复动作和后续执行连接。", "与 tomorrow/this week 搭配自然。", [ex("Let's get back on track tomorrow.", "我们明天回到节奏。"), ex("I need to get back on track this week.", "我这周得回到正轨。")])] },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-1",
    slug: "dinner-plan-cancelled",
    title: "Dinner Plan Cancelled（晚餐计划取消）",
    subtitle: "A dinner plan changes because work suddenly comes up.",
    description: "Practice how to cancel plans politely and keep it friendly.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 18,
    tags: ["plans", "work"],
    sections: [
      {
        id: "scene-1-sec-1",
        title: "Dinner Plan Cancelled（晚餐计划取消）",
        summary: "A last-minute schedule change between friends.",
        sentences: [
          { id: "dpc-1", text: "Are we still on for dinner?", translation: "我们晚饭的约还照常吗？", chunks: ["still on", "on for dinner"], chunkDetails: [cd("still on", "还照常", "固定搭配", "确认计划是否继续。", "still on 用于确认安排。", [ex("Is it still on?", "还照常吗？"), ex("Are we still on for Friday?", "我们周五还照常吗？")]), cd("on for dinner", "晚饭约照常", "场景搭配", "确认晚饭安排是否有效。", "be on for + 活动 很高频。", [ex("Are we on for lunch?", "我们午饭还约吗？"), ex("We are on for drinks.", "我们喝一杯照常。")])]},
          { id: "dpc-2", text: "I was just about to text you. Something came up at work.", translation: "我刚正要给你发消息，工作上突然有事了。", chunks: ["about to", "came up"], chunkDetails: [cd("about to", "正要", "语法骨架", "表示动作即将发生。", "be about to do 非常常见。", [ex("I am about to leave.", "我正要走。"), ex("She was about to call.", "她刚正要打电话。")], "/əˈbaʊt tuː/"), cd("came up", "临时有事", "动词短语", "表示突发情况。", "something came up 是改约高频理由。", [ex("Sorry, something came up.", "抱歉，突然有事。"), ex("A meeting came up.", "临时来了个会。")], "/keɪm ʌp/")]},
          { id: "dpc-3", text: "Let me guess, working again?", translation: "我猜猜，又在工作？", chunks: ["let me guess"], chunkDetails: [cd("let me guess", "我猜猜", "高频口语块", "先给出猜测。", "熟人对话中非常自然。", [ex("Let me guess, traffic?", "我猜猜，又堵车？"), ex("Let me guess, overtime again?", "我猜猜，又加班？")])]},
          { id: "dpc-4", text: "Yeah, I'm stuck at the office.", translation: "是啊，我还被困在办公室。", chunks: ["stuck at"], chunkDetails: [cd("stuck at", "被困在；走不开", "场景搭配", "因现实原因无法离开。", "stuck at + 地点 很高频。", [ex("I am stuck at work.", "我被工作困住了。"), ex("She is stuck at the airport.", "她被困在机场。")], "/stʌk æt/")]},
          { id: "dpc-5", text: "You've been crazy busy lately.", translation: "你最近真的忙疯了。", chunks: ["crazy busy", "lately"], chunkDetails: [cd("crazy busy", "特别忙", "高频口语块", "加强 busy 的程度。", "crazy + adj 口语常见。", [ex("This week is crazy busy.", "这周忙疯了。"), ex("Work has been crazy busy.", "工作最近特别忙。")]), cd("lately", "最近", "时间副词", "表示近一段时间。", "常与现在完成时搭配。", [ex("I have been tired lately.", "我最近很累。"), ex("She has been quiet lately.", "她最近话不多。")], "/ˈleɪtli/")]},
          { id: "dpc-6", text: "I know, rain check?", translation: "我知道，要不改天？", chunks: ["rain check"], chunkDetails: [cd("rain check", "改天再约", "高频口语块", "礼貌取消并保留下次。", "社交场景高频表达。", [ex("Can we take a rain check?", "我们改天可以吗？"), ex("Rain check for this weekend?", "这个周末改天行吗？")], "/reɪn tʃek/")]},
          { id: "dpc-7", text: "Sure, we'll do it another time.", translation: "行，我们改天再约。", chunks: ["another time"], chunkDetails: [cd("another time", "改天", "时间表达", "表示延期而非取消。", "another time 比 later 更完整。", [ex("Let's do it another time.", "我们改天做。"), ex("We can talk another time.", "我们改天聊。")], "/əˈnʌðər taɪm/")]},
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-2",
    slug: "long-day-at-work",
    title: "Long Day at Work（漫长工作日）",
    subtitle: "A realistic chat after an unproductive afternoon.",
    description: "Useful chunks for meetings and work fatigue.",
    difficulty: "Intermediate",
    estimatedMinutes: 9,
    completionRate: 0,
    tags: ["office", "fatigue"],
    sections: [
      {
        id: "scene-2-sec-1",
        title: "Long Day at Work（漫长工作日）",
        summary: "Two coworkers debrief after long meetings.",
        sentences: [
          { id: "ldw-1", text: "You look exhausted. Long day?", translation: "你看起来很累，今天很漫长吧？", chunks: ["long day"], chunkDetails: [cd("long day", "漫长的一天", "高频口语块", "用于表达疲惫。", "Long day? 是自然寒暄。", [ex("Long day today?", "今天很累吧？"), ex("Yeah, long day.", "是啊，今天很漫长。")])] },
          { id: "ldw-2", text: "Meetings all afternoon, and nothing got decided.", translation: "整个下午都在开会，结果什么都没定下来。", chunks: ["got decided"], chunkDetails: [cd("got decided", "被定下来", "语法骨架", "强调没有形成结论。", "nothing got decided 在会议语境很高频。", [ex("Nothing got decided again.", "又什么都没定。"), ex("When will this get decided?", "这事什么时候能定？")])] },
          { id: "ldw-3", text: "That's the worst, talking for hours and going nowhere.", translation: "这最糟了，聊了几个小时却毫无进展。", chunks: ["that's the worst"], chunkDetails: [cd("that's the worst", "这最糟了", "高频口语块", "表达强烈负面感受。", "常用于共情吐槽。", [ex("Ugh, that's the worst.", "哎，这最糟了。"), ex("Commuting in rain is the worst.", "下雨通勤最难受。")])] },
          { id: "ldw-4", text: "Exactly. By the end, everyone just wanted to leave.", translation: "就是。到最后大家只想赶紧走。", chunks: ["by the end"], chunkDetails: [cd("by the end", "到最后", "时间短语", "表示过程末尾的状态。", "复盘表达里很常见。", [ex("By the end, I was done.", "到最后我彻底没电了。"), ex("By the end of the day, we gave up.", "到下班时我们放弃了。")], "/baɪ ði end/")] },
          { id: "ldw-5", text: "At least that's over now.", translation: "至少现在结束了。", chunks: ["at least"], chunkDetails: [cd("at least", "至少", "高频口语块", "在负面情境中找一个正向点。", "at least 常用于自我安慰。", [ex("At least we tried.", "至少我们试过。"), ex("At least it's done.", "至少做完了。")])] },
          { id: "ldw-6", text: "True. I'm not opening my laptop tonight.", translation: "确实，我今晚不再开电脑。", chunks: ["true"], chunkDetails: [cd("true", "确实", "回应块", "用于认同对方观点。", "比 yes 更口语。", [ex("True, I need rest.", "确实，我得休息。"), ex("True, enough for today.", "对，今天够了。")])] },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-3",
    slug: "stayed-up-too-late",
    title: "Stayed Up Too Late（熬夜太晚）",
    subtitle: "A practical chat about poor sleep and low energy.",
    description: "Reusable chunks for sleep, habits, and recovery.",
    difficulty: "Intermediate",
    estimatedMinutes: 11,
    completionRate: 0,
    tags: ["sleep", "habits"],
    sections: [
      {
        id: "scene-3-sec-1",
        title: "Stayed Up Too Late（熬夜太晚）",
        summary: "Morning check-in after a bad night.",
        sentences: [
          { id: "sutl-1", text: "You look tired today.", translation: "你今天看起来很累。", chunks: ["look tired"], chunkDetails: [cd("look tired", "看起来很累", "状态描述", "观察对方状态。", "look + 形容词 是高频骨架。", [ex("You look tired.", "你看起来很累。"), ex("You look stressed today.", "你今天看起来压力很大。")])] },
          { id: "sutl-2", text: "I stayed up too late last night.", translation: "我昨晚熬夜太晚了。", chunks: ["stayed up too late"], chunkDetails: [cd("stayed up too late", "熬夜太晚", "高频口语块", "说明疲惫原因。", "生活场景高频。", [ex("I stayed up too late again.", "我又熬夜太晚了。"), ex("She stayed up too late studying.", "她学习熬夜太晚。")], "/steɪd ʌp tuː leɪt/")] },
          { id: "sutl-3", text: "Working or just messing around?", translation: "在工作，还是只是瞎刷？", chunks: ["messing around"], chunkDetails: [cd("messing around", "瞎刷；磨蹭", "高频口语块", "表示不专注地耗时间。", "口语里很自然。", [ex("I was messing around online.", "我当时在网上瞎刷。"), ex("Stop messing around.", "别瞎磨蹭了。")])] },
          { id: "sutl-4", text: "Just watching videos and scrolling.", translation: "就是看视频和刷手机。", chunks: ["watching videos"], chunkDetails: [cd("watching videos", "看视频", "日常动作", "描述具体行为。", "和 scrolling 常一起出现。", [ex("I kept watching videos.", "我一直在看视频。"), ex("No videos before bed.", "睡前别看视频。")])] },
          { id: "sutl-5", text: "That happens. Did you at least get some sleep?", translation: "这很常见。你至少睡到一点吗？", chunks: ["at least"], chunkDetails: [cd("at least", "至少", "高频口语块", "追问最低限度是否达到。", "at least 在安慰与追问中都常见。", [ex("Did you at least eat?", "你至少吃饭了吗？"), ex("At least get some rest.", "至少休息一下。")])] },
          { id: "sutl-6", text: "Not really, about five hours.", translation: "也没有，大概五小时。", chunks: ["not really"], chunkDetails: [cd("not really", "也不太算", "回应块", "比 no 更柔和的否定。", "口语回应高频。", [ex("Did it help? Not really.", "有帮助吗？也没有。"), ex("Are you okay? Not really.", "你还好吗？也不太好。")])] },
          { id: "sutl-7", text: "No wonder you're exhausted.", translation: "难怪你这么累。", chunks: ["no wonder"], chunkDetails: [cd("no wonder", "难怪", "高频口语块", "根据原因给出自然结论。", "口语因果反应非常高频。", [ex("No wonder you're late.", "难怪你迟到。"), ex("No wonder she looked tired.", "难怪她看起来很累。")])] },
          { id: "sutl-8", text: "Exactly. I'm grabbing coffee and calling it a day.", translation: "就是，我先买杯咖啡，然后今天就到这了。", chunks: ["calling it a day"], chunkDetails: [cd("calling it a day", "今天就到这", "高频口语块", "表示今天不再继续。", "工作学习收尾都可用。", [ex("Let's call it a day.", "今天就到这吧。"), ex("I'm calling it a day now.", "我现在收工了。")])] },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-4",
    slug: "crowded-subway-commute",
    title: "Crowded Subway Commute（拥挤地铁通勤）",
    subtitle: "Commuting stress and body strain in real life.",
    description: "Daily commute chunks with practical body-condition language.",
    difficulty: "Intermediate",
    estimatedMinutes: 11,
    completionRate: 0,
    tags: ["commute", "health"],
    sections: [
      {
        id: "scene-4-sec-1",
        title: "Crowded Subway Commute（拥挤地铁通勤）",
        summary: "A realistic complaint about long subway rides.",
        sentences: [
          { id: "csc-1", text: "I'm starting to like this plan, but I spend too much time on the subway every morning.", translation: "我开始喜欢这个安排了，但每天早上在地铁上花太多时间。", chunks: ["too much time on the subway"], chunkDetails: [cd("too much time on the subway", "在地铁上花太多时间", "场景搭配", "强调通勤时间成本过高。", "通勤抱怨高频搭配。", [ex("I spend too much time on the subway.", "我在地铁上花太多时间。"), ex("I lose too much time commuting.", "我通勤浪费太多时间。")])] },
          { id: "csc-2", text: "There are too many people, so I can't get a seat.", translation: "人太多了，所以我抢不到座位。", chunks: ["get a seat"], chunkDetails: [cd("get a seat", "抢到座位", "场景搭配", "在拥挤通勤里是否有座。", "can't get a seat 是高频通勤句。", [ex("I couldn't get a seat today.", "我今天没抢到座位。"), ex("If I get a seat, I'm fine.", "只要有座位我就还好。")])] },
          { id: "csc-3", text: "That's why I was exhausted this morning.", translation: "所以我今天早上才这么累。", chunks: ["exhausted this morning"], chunkDetails: [cd("exhausted this morning", "今天早上特别疲惫", "状态表达", "把疲惫和时间绑定。", "可复用到其他时间词。", [ex("I felt exhausted this morning.", "我今早很疲惫。"), ex("She looked exhausted this morning.", "她今早看起来很累。")])] },
          { id: "csc-4", text: "If I manage to get one, my back feels much better.", translation: "要是抢到一个座位，我背会舒服很多。", chunks: ["manage to"], chunkDetails: [cd("manage to", "设法做到", "语法骨架", "强调不容易但做到了。", "manage to do 很常见。", [ex("I managed to catch the train.", "我总算赶上了地铁。"), ex("She managed to finish on time.", "她总算按时做完。")])] },
          { id: "csc-5", text: "Honestly, this commute is starting to take a toll on my lower back.", translation: "说实话，这种通勤开始消耗我的下背部。", chunks: ["take a toll on", "lower back"], chunkDetails: [cd("take a toll on", "对……造成持续消耗", "场景搭配", "表达长期负面影响。", "健康与压力语境都高频。", [ex("Night shifts take a toll on me.", "夜班很伤我。"), ex("Stress is taking a toll on him.", "压力正在消耗他。")], "/teɪk ə toʊl ɑːn/"), cd("lower back", "下背部", "身体部位", "描述腰背不适部位。", "久坐久站语境常用。", [ex("My lower back hurts.", "我腰疼。"), ex("I need to stretch my lower back.", "我得拉伸下腰。")])] },
          { id: "csc-6", text: "If the commute wasn't so long, I'd actually like this job.", translation: "要是通勤没这么长，我其实会喜欢这份工作。", chunks: ["if ... wasn't so ...", "I'd actually like"], chunkDetails: [cd("if ... wasn't so ...", "要是……没那么……", "语法骨架", "虚拟条件表达。", "if + 过去式, I'd ... 高频实用。", [ex("If work wasn't so busy, I'd cook.", "要是工作没这么忙，我会做饭。"), ex("If it wasn't so far, I'd go more.", "要是没这么远，我会更常去。")]), cd("I'd actually like", "我其实会喜欢", "态度表达", "说明核心问题不在对象本身。", "actually 可突出真实想法。", [ex("I'd actually stay if I could.", "要是可以我其实会留下。"), ex("I actually like the team.", "其实我挺喜欢团队。")])] },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-5",
    slug: "quick-dinner-after-work",
    title: "Quick Dinner After Work（下班后快吃一口）",
    subtitle: "Simple dinner choices after a long day.",
    description: "Old chunks in a familiar but practical new scene.",
    difficulty: "Intermediate",
    estimatedMinutes: 9,
    completionRate: 0,
    tags: ["food", "after work"],
    sections: [
      {
        id: "scene-5-sec-1",
        title: "Quick Dinner After Work（下班后快吃一口）",
        summary: "Both are tired and want to keep dinner simple.",
        sentences: [
          { id: "qda-1", text: "Long day today?", translation: "今天也很累吧？", chunks: ["long day"], chunkDetails: [cd("long day", "漫长的一天", "高频口语块", "快速共情。", "下班寒暄常见。", [ex("Long day today?", "今天很累吧？"), ex("Yeah, long day.", "是啊，今天很累。")])] },
          { id: "qda-2", text: "Yeah, I stayed late again.", translation: "是啊，我又加班到很晚。", chunks: ["stayed late again"], chunkDetails: [cd("stayed late again", "又加班到很晚", "工作表达", "说明重复出现的晚下班。", "stay late 是职场高频。", [ex("I had to stay late again.", "我又得加班。"), ex("She stayed late to finish it.", "她加班把它做完了。")])] },
          { id: "qda-3", text: "Did you finish the report?", translation: "报告做完了吗？", chunks: ["finish the report"], chunkDetails: [cd("finish the report", "完成报告", "任务搭配", "询问任务完成度。", "finish + 任务 是工作核心结构。", [ex("Did you finish the deck?", "汇报稿做完了吗？"), ex("I need to finish this report.", "我得把报告做完。")])] },
          { id: "qda-4", text: "Almost. I'll send it tomorrow morning.", translation: "差不多了，我明早发。", chunks: ["tomorrow morning"], chunkDetails: [cd("tomorrow morning", "明天早上", "时间安排", "给出明确时间承诺。", "安排类表达高频。", [ex("I'll check it tomorrow morning.", "我明早看。"), ex("Let's talk tomorrow morning.", "我们明早聊。")])] },
          { id: "qda-5", text: "Want to grab something quick to eat?", translation: "要不要随便吃点快的？", chunks: ["grab something quick to eat"], chunkDetails: [cd("grab something quick to eat", "随便吃点快的", "场景搭配", "低成本解决一顿饭。", "下班场景非常实用。", [ex("Let's grab something quick.", "我们随便吃点吧。"), ex("I need something quick to eat.", "我得赶紧吃点。")])] },
          { id: "qda-6", text: "Yeah, I'm too tired to cook.", translation: "好，我累到不想做饭。", chunks: ["too tired to"], chunkDetails: [cd("too tired to", "太累而无法……", "语法骨架", "状态导致无法执行动作。", "too + adj + to do 高迁移。", [ex("I'm too tired to think.", "我累得没法思考。"), ex("She's too tired to go out.", "她累得不想出门。")])] },
          { id: "qda-7", text: "How about a sandwich and coffee?", translation: "那三明治加咖啡怎么样？", chunks: ["how about"], chunkDetails: [cd("how about", "……怎么样", "提议骨架", "引出替代方案。", "How about + 名词/动名词 高频。", [ex("How about noodles?", "吃面怎么样？"), ex("How about leaving now?", "现在走怎么样？")])] },
          { id: "qda-8", text: "Sounds good. Let's keep it simple.", translation: "听起来不错，就简单点吧。", chunks: ["keep it simple"], chunkDetails: [cd("keep it simple", "简单一点", "高频口语块", "降低决策成本。", "疲惫场景非常实用。", [ex("Let's keep it simple tonight.", "今晚就简单点。"), ex("Keep it simple and move on.", "简单处理继续往前。")])] },
        ],
      },
    ],
    explanations: [],
  },
  {
    id: "scene-6",
    slug: "getting-back-on-track",
    title: "Getting Back on Track（找回学习状态）",
    subtitle: "A reset conversation after a low-focus period.",
    description: "Reuses familiar chunks while building restart momentum.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    completionRate: 0,
    tags: ["study", "reset"],
    sections: [
      {
        id: "scene-6-sec-1",
        title: "Getting Back on Track（找回学习状态）",
        summary: "From feeling off to starting small again.",
        sentences: [
          { id: "gbt-1", text: "I went to bed pretty late yesterday.", translation: "我昨天睡得挺晚。", chunks: ["went to bed pretty late"], chunkDetails: [cd("went to bed pretty late", "睡得挺晚", "习惯表达", "说明状态偏差的背景。", "pretty late 口语自然。", [ex("I went to bed pretty late.", "我睡得挺晚。"), ex("She went to bed late again.", "她又睡晚了。")])] },
          { id: "gbt-2", text: "I kept watching videos instead of studying English.", translation: "我一直在刷视频，没有学英语。", chunks: ["instead of"], chunkDetails: [cd("instead of", "而不是", "对比骨架", "对比本该做与实际做。", "instead of + 名词/动名词 高频。", [ex("I slept instead of working.", "我睡觉了而没工作。"), ex("She walked instead of taking a taxi.", "她走路了没打车。")])] },
          { id: "gbt-3", text: "Over the past couple of weeks, I've been really busy with Chinese New Year plans.", translation: "过去这几周我一直在忙春节安排。", chunks: ["over the past couple of weeks", "I've been really busy"], chunkDetails: [cd("over the past couple of weeks", "过去这几周", "时间框架", "用于总结近期状态。", "over the past ... 复盘高频。", [ex("Over the past few days, I've been swamped.", "过去几天我都忙爆了。"), ex("Over the past month, I've been traveling.", "过去一个月我一直在出差。")]), cd("I've been really busy", "我最近一直很忙", "语法骨架", "表示从过去持续到现在。", "have been doing/adj 高频。", [ex("I've been really busy lately.", "我最近一直很忙。"), ex("I've been working nonstop.", "我一直没停地在工作。")])] },
          { id: "gbt-4", text: "I haven't been in a good state lately.", translation: "我最近状态不太好。", chunks: ["not in a good state"], chunkDetails: [cd("not in a good state", "状态不太好", "状态表达", "描述整体状态而非单一情绪。", "学习和工作语境都能用。", [ex("I'm not in a good state for studying.", "我现在不太适合学习。"), ex("He hasn't been in a good state lately.", "他最近状态不太好。")])] },
          { id: "gbt-5", text: "But I hope I can slowly get back on track starting today.", translation: "但我希望从今天开始，能慢慢回到正轨。", chunks: ["get back on track"], chunkDetails: [cd("get back on track", "回到正轨", "高频口语块", "从偏离状态回到稳定节奏。", "习惯建设语境高频。", [ex("I need to get back on track.", "我得回到正轨。"), ex("Let's get back on track tomorrow.", "我们明天重回节奏。")])] },
          { id: "gbt-6", text: "Good call. Small steps are easier to keep.", translation: "这主意不错。小步走更容易坚持。", chunks: ["small steps"], chunkDetails: [cd("small steps", "小步推进", "策略表达", "强调可持续执行。", "小步策略更容易形成习惯。", [ex("Let's start with small steps.", "我们先从小步开始。"), ex("Small steps work better for me.", "小步推进对我更有效。")])] },
        ],
      },
    ],
    explanations: [],
  },
];

const parsedTakeTheMorningOffLesson = mapParsedSceneToLesson(takeTheMorningOffParserResponse);
const parsedTakeTheMorningOffIndex = lessons.findIndex(
  (lesson) => lesson.slug === parsedTakeTheMorningOffLesson.slug,
);
if (parsedTakeTheMorningOffIndex >= 0) {
  lessons[parsedTakeTheMorningOffIndex] = parsedTakeTheMorningOffLesson;
}

export const scenes = lessons;

const explanationSeed: AIExplanation[] = [
  { key: "still on", text: "still on", translation: "还照常", explanation: "确认安排是否继续。", examples: ["Is it still on?", "Are we still on for Friday?"], exampleTranslations: ["还照常吗？", "我们周五还照常吗？"], breakdown: ["确认安排", "口语高频"], pronunciation: "/stɪl ɑːn/", grammarLabel: "固定搭配" },
  { key: "about to", text: "about to", translation: "正要", explanation: "表示动作即将发生。", examples: ["I am about to leave.", "She was about to call."], exampleTranslations: ["我正要走。", "她刚正要打电话。"], breakdown: ["语法骨架", "高频"], pronunciation: "/əˈbaʊt tuː/", grammarLabel: "be about to do" },
  { key: "came up", text: "came up", translation: "临时有事", explanation: "表示突发情况。", examples: ["Sorry, something came up.", "A meeting came up."], exampleTranslations: ["抱歉，临时有事。", "临时来了个会。"], breakdown: ["突发事件", "改约高频"], pronunciation: "/keɪm ʌp/", grammarLabel: "动词短语" },
  { key: "rain check", text: "rain check", translation: "改天再约", explanation: "礼貌改期表达。", examples: ["Can we take a rain check?", "Rain check for this weekend?"], exampleTranslations: ["我们改天可以吗？", "这个周末改天约吗？"], breakdown: ["社交高频", "礼貌"], pronunciation: "/reɪn tʃek/", grammarLabel: "固定表达" },
  { key: "long day", text: "long day", translation: "漫长的一天", explanation: "表达工作或生活很累。", examples: ["Long day today?", "Yeah, long day."], exampleTranslations: ["今天很累吧？", "是啊，今天很累。"], breakdown: ["共情开场", "高频"], pronunciation: "/lɔːŋ deɪ/", grammarLabel: "口语块" },
  { key: "got decided", text: "got decided", translation: "被定下来", explanation: "用于会议结果表达。", examples: ["Nothing got decided.", "When will this get decided?"], exampleTranslations: ["什么都没定下来。", "这事什么时候能定？"], breakdown: ["会议场景", "被动结果"], pronunciation: "/ɡɑːt dɪˈsaɪdɪd/", grammarLabel: "语法骨架" },
  { key: "by the end", text: "by the end", translation: "到最后", explanation: "表示过程末尾状态。", examples: ["By the end, I was done.", "By the end of the day, we gave up."], exampleTranslations: ["到最后我没电了。", "到下班我们放弃了。"], breakdown: ["时间框架", "复盘"], pronunciation: "/baɪ ði end/", grammarLabel: "时间短语" },
  { key: "stayed up too late", text: "stayed up too late", translation: "熬夜太晚", explanation: "描述晚睡导致疲劳。", examples: ["I stayed up too late again.", "She stayed up too late studying."], exampleTranslations: ["我又熬夜太晚。", "她学习熬夜太晚。"], breakdown: ["睡眠场景", "高频"], pronunciation: "/steɪd ʌp tuː leɪt/", grammarLabel: "口语块" },
  { key: "messing around", text: "messing around", translation: "瞎刷；磨蹭", explanation: "表示不专注地耗时间。", examples: ["I was messing around online.", "Stop messing around."], exampleTranslations: ["我在网上瞎刷。", "别再磨蹭。"], breakdown: ["行为描述", "口语高频"], pronunciation: "/ˈmesɪŋ əˈraʊnd/", grammarLabel: "口语块" },
  { key: "no wonder", text: "no wonder", translation: "难怪", explanation: "听到原因后的自然反应。", examples: ["No wonder you're tired.", "No wonder he was late."], exampleTranslations: ["难怪你这么累。", "难怪他迟到。"], breakdown: ["因果反应", "高频"], pronunciation: "/noʊ ˈwʌndər/", grammarLabel: "口语块" },
  { key: "calling it a day", text: "calling it a day", translation: "今天就到这", explanation: "表示决定结束当天任务。", examples: ["Let's call it a day.", "I'm calling it a day now."], exampleTranslations: ["今天就到这吧。", "我现在收工。"], breakdown: ["收尾表达", "高频"], pronunciation: "/ˈkɔːlɪŋ ɪt ə deɪ/", grammarLabel: "口语块" },
  { key: "get back on track", text: "get back on track", translation: "回到正轨", explanation: "从偏离状态恢复到稳定节奏。", examples: ["I need to get back on track.", "Let's get back on track tomorrow."], exampleTranslations: ["我得回到正轨。", "我们明天回到节奏。"], breakdown: ["重启计划", "习惯建设"], pronunciation: "/ɡet bæk ɑːn træk/", grammarLabel: "口语块" },
  { key: "take a toll on", text: "take a toll on", translation: "对……造成持续消耗", explanation: "表示长期压力的负面影响。", examples: ["Commuting takes a toll on my back.", "Stress is taking a toll on him."], exampleTranslations: ["通勤正在消耗我的背。", "压力正在消耗他。"], breakdown: ["健康场景", "长期影响"], pronunciation: "/teɪk ə toʊl ɑːn/", grammarLabel: "场景搭配" },
  { key: "take the morning off", text: "take the morning off", translation: "早上请半天假", explanation: "用于表达临时休整安排。", examples: ["Why don't you take the morning off?", "I might take tomorrow off."], exampleTranslations: ["你要不请个半天假？", "我可能明天请假。"], breakdown: ["职场实用", "恢复策略"], pronunciation: "/teɪk ðə ˈmɔːrnɪŋ ɔːf/", grammarLabel: "场景搭配" },
  { key: "running on empty", text: "running on empty", translation: "靠最后一口气硬撑", explanation: "形象表达精力快耗尽。", examples: ["I'm running on empty today.", "She was running on empty all week."], exampleTranslations: ["我今天全靠硬撑。", "她这周都在硬撑。"], breakdown: ["低能量状态", "新高频"], pronunciation: "/ˈrʌnɪŋ ɑːn ˈempti/", grammarLabel: "口语块" },
];

for (const lesson of lessons) {
  if (lesson.explanations.length === 0) {
    lesson.explanations = explanationSeed;
  }
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

export const getFirstSentence = (lesson: Lesson): LessonSentence | undefined => lesson.sections[0]?.sentences[0];

export const findMatchingChunkInSentence = (sentence: LessonSentence, selectedText: string) => {
  const selected = selectedText.trim().toLowerCase();
  if (!selected) return undefined;
  return sentence.chunks.find((chunk) => chunk.toLowerCase() === selected);
};

const toChunkLayer = (explanation: AIExplanation | undefined, sentence: LessonSentence, chunkText: string): SelectionChunkLayer => {
  if (explanation) {
    return {
      text: chunkText,
      translation: explanation.translation,
      grammarLabel: explanation.grammarLabel,
      pronunciation: explanation.pronunciation,
      meaningInSentence: `这里可以理解为：${sentence.translation}`,
      usageNote: "建议先掌握这个 chunk 在当前句中的作用，再迁移到自己的表达里。",
      examples: explanation.examples.slice(0, 2).map((en, index) => ({ en, zh: explanation.exampleTranslations[index] ?? "" })),
      notes: explanation.breakdown,
    };
  }

  return {
    text: chunkText,
    translation: "常用表达",
    meaningInSentence: "这里是句子中的核心语义单元。",
    usageNote: "先记 chunk，再放回整句复述。",
    examples: [ex(`Try using "${chunkText}" in your own sentence.`, `试着在自己的句子里用“${chunkText}”。`), ex(`I saved "${chunkText}" for review.`, `我把“${chunkText}”加入复习了。`)],
    notes: ["优先记忆“chunk + 整句”组合"],
  };
};

export const getChunkLayerFromLesson = (lesson: Lesson, sentence: LessonSentence, chunkText: string): SelectionChunkLayer => {
  const localChunk = sentence.chunkDetails?.find((item) => item.text.toLowerCase() === chunkText.toLowerCase());
  if (localChunk) {
    return {
      text: localChunk.text,
      translation: localChunk.translation,
      grammarLabel: localChunk.grammarLabel,
      pronunciation: localChunk.pronunciation,
      meaningInSentence: localChunk.meaningInSentence,
      usageNote: localChunk.usageNote,
      examples: localChunk.examples.slice(0, 2),
      notes: localChunk.synonyms ?? [],
    };
  }

  const explanation = lesson.explanations.find((item) => item.key.toLowerCase() === chunkText.toLowerCase());
  return toChunkLayer(explanation, sentence, chunkText);
};
