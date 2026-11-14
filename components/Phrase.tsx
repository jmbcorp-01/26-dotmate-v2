import { Fragment } from "react";

// 한국어 개행 규칙: 단어 중간에서 끊지 않고(keep-all), 헤드라인은 "|"로 표시한 의미 묶음 단위로 줄을 바꿉니다.
// 예) "상품 하나 올리는 데|반나절, 아직도요?" → 화면이 좁으면 "|" 위치에서 먼저 줄이 바뀝니다.
export default function Phrase({ text }: { text: string }) {
  const parts = text.split("|");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {/* 띄어쓰기는 묶음 밖에 둡니다. inline-block 안 끝 공백은 브라우저가 지워서 단어가 붙어 보입니다. */}
          {i > 0 ? " " : null}
          <span className="phrase">{p}</span>
        </Fragment>
      ))}
    </>
  );
}
