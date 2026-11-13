// 개인정보 처리방침과 진단 신청 폼 동의 안내에서 함께 쓰는 값.
// 보호책임자, 보관 기간이 바뀌면 여기만 고치면 두 곳에 같이 반영됩니다.
export const privacy = {
  company: "닷메이트",
  bizNo: "328-31-00498",
  email: "dotmate@dotmate.co.kr",
  // TODO: 보호책임자 성명·직책 확인 후 입력 (배포 전 필수)
  officer: { name: "", title: "", phone: "" },
  effectiveDate: "2026년 11월 13일",
  purpose: "무료 .AX 진단 신청 접수, 상담 연락, 진단 결과 안내",
  required: ["회사명", "담당자 이름", "연락처(휴대전화 등)", "이메일"],
  optional: ["지금 가장 불편한 점(자유 기재)"],
  retention: "상담 종료 후 1년",
};
