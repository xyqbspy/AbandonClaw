export const metadata = {
  title: "服务条款 - AbandonClaw",
  description: "AbandonClaw 服务条款与用户行为规范。",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-[15px] leading-7 text-[#1d1d1f]">
      <h1 className="mb-2 text-3xl font-semibold">服务条款</h1>
      <p className="mb-8 text-sm text-[#86868b]">
        最后更新：2026-05-15 ｜ 状态：__待法律审阅__（本文为占位结构，正式条款须经律师审核后替换）
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. 服务范围</h2>
        <p>
          AbandonClaw 是一个英语学习应用，提供场景化学习、表达保存、复习推送、AI 辅助生成等功能。
          本服务以&quot;现状&quot;提供，我们持续改进但不保证服务始终无故障、无中断。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. 用户行为规范</h2>
        <p className="mb-2">使用本服务时，你不得：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>使用脚本、机器人或自动化工具批量调用接口。</li>
          <li>尝试绕过限流、配额或访问控制。</li>
          <li>注册多个账号以规避滥用防护。</li>
          <li>使用本服务从事违法活动或侵犯他人权益。</li>
          <li>对本服务进行未经授权的扫描、压测、渗透测试。</li>
        </ul>
        <p className="mt-3">
          违反上述规范的账号，我们有权采取以下处置措施（详见 access_status 状态机）：
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>generation_limited</strong>：禁止调用 AI / TTS / 生成类高成本接口。
          </li>
          <li>
            <strong>readonly</strong>：禁止写入学习进度、保存表达、提交复习。
          </li>
          <li>
            <strong>disabled</strong>：禁止登录与使用本服务。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. 免责条款</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>本服务的学习内容（包括 AI 生成的解释、练习、场景）仅供参考，不保证语言学绝对准确。</li>
          <li>对因使用本服务的内容造成的学习效果差异、考试成绩、商业决策等，我们不承担责任。</li>
          <li>对因第三方上游服务（Supabase / GLM / Resend / Sentry / Vercel）故障导致的数据丢失、服务中断，我们尽合理努力恢复但不承担额外赔偿。</li>
          <li>对因不可抗力（自然灾害、战争、政府行为、网络中断等）导致的服务中断不承担责任。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. 账号与数据</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>你对账号的所有操作负责，请妥善保管密码。</li>
          <li>你可以随时申请删除账号，详见隐私政策第 4 节。</li>
          <li>账号删除后，相关学习数据将在 30 天后永久删除。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. 知识产权</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>本服务的产品设计、品牌、内置场景、配套素材的知识产权归运营方所有。</li>
          <li>AI 生成内容遵循对应 AI provider 的使用条款。</li>
          <li>你保存的个人学习内容（笔记、自定义场景等）所有权归你。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. 条款变更</h2>
        <p>
          本条款如有重大变更，我们会通过应用内通知或邮件告知你，并在本页更新「最后更新」时间。
          变更生效后继续使用本服务即视为接受新条款；如不同意，可申请删除账号。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">7. 适用法律与争议解决</h2>
        <p>
          本条款适用 __待用户填写__ 法律。如就本条款发生争议，双方应友好协商；
          协商不成的，提交 __待用户填写__ 仲裁/管辖法院解决。
        </p>
      </section>

      <p className="mt-12 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        <strong>免责说明：</strong>
        本页内容为占位模板，未经法律审阅，不构成正式法律承诺。正式上线公开服务前，必须由具有相应资质的律师审阅并签署后替换本页内容。
      </p>
    </article>
  );
}
