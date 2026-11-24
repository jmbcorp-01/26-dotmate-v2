"use client";

// 목록 아래 페이지 이동. 현재 페이지 앞뒤 2쪽과 처음·끝을 보여줍니다.
export default function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label="페이지">
      <button className="btn ghost small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </button>
      {nums.map((n, i) => (
        <span key={n} className="row" style={{ gap: 4 }}>
          {i > 0 && n - nums[i - 1] > 1 && <span className="muted">…</span>}
          <button className={`btn small ${n === page ? "" : "ghost"}`} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
            {n}
          </button>
        </span>
      ))}
      <button className="btn ghost small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        다음
      </button>
    </nav>
  );
}
