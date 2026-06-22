interface SlideHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export default function SlideHeader({
  title,
  subtitle,
  className = "",
}: SlideHeaderProps) {
  return (
    <div className={`mb-6 shrink-0 ${className}`.trim()}>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
      <h2 className="text-xl text-slate-600 mb-3">{subtitle}</h2>
      <div className="w-full h-0.5 bg-blue-600" />
    </div>
  );
}
