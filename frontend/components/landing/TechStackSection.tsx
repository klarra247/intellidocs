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
    <section id="tech-stack" className="py-24 md:py-32" style={{ background: 'var(--bg-secondary)' }}>
      <div
        ref={ref}
        className={`mx-auto max-w-7xl px-6 transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[2.75rem] font-bold" style={{ color: 'var(--text-primary)' }}>
            Powered by
          </h2>
          <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
            검증된 기술 스택으로 구축했습니다.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {stack.map((tech, i) => (
            <div
              key={tech.name}
              className="group rounded-[12px] p-5 text-center transition-all duration-300 hover:-translate-y-0.5"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                boxShadow: 'var(--shadow-sm)',
                transitionDelay: isVisible ? `${i * 40}ms` : '0ms',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <span className="text-2xl leading-none">{tech.icon}</span>
              <p className="mt-2.5 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {tech.name}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{tech.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
