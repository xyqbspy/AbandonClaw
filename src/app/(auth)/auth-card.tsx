import { ReactNode } from "react";
import { Apple, Chrome, MessageCircle, Wind } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[28px] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] md:min-h-[620px] md:grid-cols-[420px_1fr]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#007AFF_0%,#0051FF_100%)] p-[50px] text-white md:flex md:flex-col md:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1)_0%,transparent_40%)]" />
        <div className="relative">
          <div className="mb-[30px] flex size-12 items-center justify-center rounded-xl bg-white/20">
            <Wind className="size-6" />
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-[1.3] text-white">
            回到你的
            <br />
            英语学习节奏
          </h1>
          <p className="text-base font-light leading-[1.6] text-white/90">
            在真实语境中阅读，保存有用表达，持续稳定学习。构建属于你的语言直觉。
          </p>
        </div>
        <div className="relative text-[13px] text-white/60">
          &copy; 2026 语言空间 · 保持输入
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:px-12 md:px-20 md:py-[60px]">
        <div className="mb-10">
          <h2 className="mb-2 text-[28px] font-semibold leading-tight text-[#1d1d1f]">
            {title}
          </h2>
          <p className="text-[15px] text-[#86868b]">{description}</p>
        </div>

        {children}

        <div className="my-[30px] flex items-center text-center text-xs uppercase tracking-[1px] text-[#d2d2d7] before:mr-[15px] before:flex-1 before:border-b before:border-[#e5e5e7] after:ml-[15px] after:flex-1 after:border-b after:border-[#e5e5e7]">
          或者
        </div>

        <div className="flex justify-center gap-4">
          <SocialButton label="微信">
            <MessageCircle className="size-5" />
          </SocialButton>
          <SocialButton label="Apple">
            <Apple className="size-5" />
          </SocialButton>
          <SocialButton label="Google">
            <Chrome className="size-5" />
          </SocialButton>
        </div>

        <div className="mt-6 text-center text-sm text-[#86868b]">{footer}</div>
      </section>
    </div>
  );
}

export function AuthField({
  id,
  label,
  type = "text",
  name,
  placeholder,
  icon,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  name: string;
  placeholder: string;
  icon: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#1d1d1f]">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-4 text-[#86868b]">{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border-[1.5px] border-[#e5e5e7] bg-white px-4 py-3.5 pl-12 text-[15px] text-[#1d1d1f] transition duration-200 placeholder:text-[#86868b] focus:border-[#007AFF] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10"
        />
      </div>
    </div>
  );
}

function SocialButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-[54px] cursor-pointer items-center justify-center rounded-[14px] border border-[#e5e5e7] bg-white text-[#1d1d1f] transition duration-200 hover:-translate-y-0.5 hover:bg-[#f5f5f7]"
    >
      {children}
    </button>
  );
}
