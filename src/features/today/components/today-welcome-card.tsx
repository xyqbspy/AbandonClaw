import {
  TODAY_SECTION_CLASSNAME,
  TODAY_WELCOME_MESSAGE_CLASSNAME,
  TODAY_WELCOME_STREAK_BADGE_CLASSNAME,
  TODAY_WELCOME_STREAK_CONTENT_CLASSNAME,
  TODAY_WELCOME_STREAK_ICON_CLASSNAME,
  TODAY_WELCOME_STREAK_LABEL_CLASSNAME,
  TODAY_WELCOME_STREAK_UNIT_CLASSNAME,
  TODAY_WELCOME_STREAK_VALUE_CLASSNAME,
  TODAY_WELCOME_TITLE_CLASSNAME,
} from "@/features/today/components/today-page-styles";

export function TodayWelcomeCard({
  displayName,
  streakDays,
}: {
  displayName: string;
  streakDays: number;
}) {
  return (
    <section className={`${TODAY_SECTION_CLASSNAME} py-[var(--mobile-space-lg)]`}>
      <div className="flex items-center justify-between gap-[var(--mobile-space-md)]">
        <div className="min-w-0 flex-1">
          <h2 className={TODAY_WELCOME_TITLE_CLASSNAME}>欢迎回来，{displayName}</h2>
          <p className={TODAY_WELCOME_MESSAGE_CLASSNAME}>
            每天进步一点点，把输入真正变成自己的表达。
          </p>
        </div>
        <div className={TODAY_WELCOME_STREAK_BADGE_CLASSNAME}>
          <div className={TODAY_WELCOME_STREAK_CONTENT_CLASSNAME}>
            <span className={TODAY_WELCOME_STREAK_ICON_CLASSNAME}>🔥</span>
            <div className="leading-tight">
              <p className={TODAY_WELCOME_STREAK_VALUE_CLASSNAME}>
                {streakDays} <span className={TODAY_WELCOME_STREAK_UNIT_CLASSNAME}>天</span>
              </p>
              <p className={TODAY_WELCOME_STREAK_LABEL_CLASSNAME}>连续学习</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
