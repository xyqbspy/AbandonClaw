import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">验证邮箱</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          账号已创建。请先打开注册邮箱里的验证邮件，完成验证后再进入学习主应用。
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        如果已经完成验证，请重新登录。没有收到邮件时，可以先检查垃圾邮件或稍后重试。
      </div>
      <Link className="text-sm text-foreground underline underline-offset-4" href="/login">
        去登录
      </Link>
    </div>
  );
}
