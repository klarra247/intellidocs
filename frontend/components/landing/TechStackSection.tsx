'use client';

import { useScrollReveal } from './useScrollReveal';

const stack = [
  { name: 'Spring Boot', role: 'API 서버', icon: '🍃' },
  { name: 'LangChain4j', role: 'AI Agent', icon: '🔗' },
  { name: 'OpenAI', role: 'LLM & 임베딩', icon: '🧠' },
  { name: 'Next.js', role: '프론트엔드', icon: '▲' },
  { name: 'Elasticsearch', role: 'BM25 검색', icon: '🔍' },
  { name: 'Qdrant', role: '벡터 검색', icon: '📐' },
  { name: 'PostgreSQL', role: '데이터베이스', icon: '🐘' },
  { name: 'Redis', role: '캐시', icon: '⚡' },
  { name: 'RabbitMQ', role: '메시지 큐', icon: '🐰' },
  { name: 'Docker', role: '컨테이너', icon: '🐳' },
];

export default function TechStackSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="tech-stack" className="bg-slate-50/80 py-24 md:py-32">
      <div
        ref={ref}
        className={`mx-auto max-w-7xl px-6 transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-slate-900">
            Powered by
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            검증된 기술 스택으로 구축했습니다.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {stack.map((tech, i) => (
            <div
              key={tech.name}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-center hover:border-emerald-300/60 hover:shadow-lg hover:shadow-emerald-500/[0.06] transition-all duration-300 hover:-translate-y-0.5"
              style={{
                transitionDelay: isVisible ? `${i * 40}ms` : '0ms',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              <span className="text-2xl leading-none">{tech.icon}</span>
              <p className="mt-2.5 font-semibold text-slate-800 text-sm">
                {tech.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">{tech.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
