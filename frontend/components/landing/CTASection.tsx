import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 py-24 md:py-32">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.06] rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-white/[0.04] rounded-full translate-y-1/2 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/[0.03] rounded-full blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
          지금 바로 시작하세요
        </h2>
        <p className="mt-5 text-lg text-emerald-50/70">
          문서를 올리고, 물어보세요. 무료입니다.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/register"
            className="inline-block rounded-full bg-white px-8 py-4 text-[15px] font-semibold text-emerald-600 hover:bg-emerald-50 transition-all duration-200 shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:shadow-emerald-900/25"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
