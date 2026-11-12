// 서비스명 표기: 빨간 점 + AX + 이름 (예: .AX 커머스)
export default function AxName({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`ax-name ${className ?? ""}`}>
      <span className="dot" aria-hidden="true">.</span>AX {name}
    </span>
  );
}
