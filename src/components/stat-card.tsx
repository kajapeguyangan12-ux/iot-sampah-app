type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  accent?: "brand" | "warning" | "danger" | "neutral";
};

const accentTone: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "from-brand/16 via-brand-soft to-white",
  warning: "from-warning/18 via-[#fff1cf] to-white",
  danger: "from-danger/16 via-[#fde8e1] to-white",
  neutral: "from-[#efe7d6] via-white to-white",
};

export function StatCard({
  label,
  value,
  detail,
  accent = "neutral",
}: StatCardProps) {
  return (
    <article
      className={`rounded-[1.75rem] border border-line bg-linear-to-br ${accentTone[accent]} p-5 shadow-sm backdrop-blur`}
    >
      <p className="text-sm uppercase tracking-[0.16em] text-foreground/58">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand-strong">{value}</p>
      <p className="mt-2 text-sm text-foreground/68">{detail}</p>
    </article>
  );
}
