export const metadata = {
  title: "隐私政策 - AbandonClaw",
  description: "AbandonClaw 隐私政策与个人信息处理说明。",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-[15px] leading-7 text-[#1d1d1f]">
      <h1 className="mb-2 text-3xl font-semibold">隐私政策</h1>
      <p className="mb-8 text-sm text-[#86868b]">
        最后更新：2026-05-15 ｜ 状态：__待法律审阅__（本文为占位结构，正式条款须经律师审核后替换）
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. 我们收集哪些信息</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>账号信息：邮箱地址、用户名、密码（仅服务端存储 hash）。</li>
          <li>学习数据：你在场景中的进度、保存的表达、复习记录、学习时长。</li>
          <li>访问元数据：IP 地址（用于限流与滥用防护）、User-Agent、请求时间。</li>
          <li>会话 cookie：用于保持登录状态。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. 收集目的</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>提供学习功能与个性化推荐。</li>
          <li>账户管理与登录验证。</li>
          <li>滥用防护（限流、邀请码、access_status 处置）。</li>
          <li>服务质量改进与故障排查。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. 数据存储与保留期</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>主数据存储于 Supabase 平台（区域：__待用户填写__）。</li>
          <li>错误追踪数据存储于 Sentry，保留期按 Sentry 计划。</li>
          <li>限流数据存储于 Upstash Redis，按窗口期自动过期。</li>
          <li>账号数据保留至账号删除后 30 天，之后永久删除。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. 你的权利</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>访问权：查看你的账户与学习数据。</li>
          <li>更正权：修改账户信息。</li>
          <li>删除权：申请删除账户与相关学习数据。</li>
          <li>导出权：申请导出你的学习数据（暂不支持自助导出，需联系我们）。</li>
          <li>撤回同意权：你可以随时撤回对本政策的同意，但这意味着你将无法继续使用本服务。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. 数据分享对象</h2>
        <p className="mb-2">
          为了提供服务，你的数据会在最小必要范围内传输给以下第三方：
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Supabase（账号、学习数据存储）。</li>
          <li>Resend（注册验证码邮件发送）。</li>
          <li>GLM（智谱 AI，用于场景生成、解释、练习生成等 AI 功能）。</li>
          <li>Sentry（错误追踪，仅 stack trace 与请求 ID，不含你的个人信息）。</li>
          <li>Vercel（应用部署与 CDN）。</li>
          <li>Upstash（限流缓存，仅短时存储 IP 与用户 ID）。</li>
        </ul>
        <p className="mt-2">
          我们不会出售你的个人信息给广告商或任何其他第三方。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. 联系方式</h2>
        <p>
          如有隐私问题或行使上述权利，请通过 <strong>__待用户填写联系邮箱__</strong> 联系我们。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">7. 政策变更</h2>
        <p>
          本政策如有重大变更，我们会通过应用内通知或邮件告知你，并在本页更新「最后更新」时间。
          继续使用本服务即视为接受最新政策。
        </p>
      </section>

      <p className="mt-12 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        <strong>免责说明：</strong>
        本页内容为占位模板，未经法律审阅，不构成正式法律承诺。正式上线公开服务前，必须由具有相应资质的律师审阅并签署后替换本页内容。
      </p>
    </article>
  );
}
