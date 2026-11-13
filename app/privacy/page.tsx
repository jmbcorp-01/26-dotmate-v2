import type { Metadata } from "next";
import Link from "next/link";
import { privacy as p } from "@/lib/privacy";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "닷메이트의 개인정보 처리방침입니다.",
};

const officerName = p.officer.name ? `${p.officer.name}${p.officer.title ? ` (${p.officer.title})` : ""}` : "(확인 중)";

const remedies = [
  { name: "개인정보분쟁조정위원회", tel: "1833-6972", url: "https://www.kopico.go.kr" },
  { name: "개인정보침해신고센터 (한국인터넷진흥원)", tel: "118", url: "https://privacy.kisa.or.kr" },
  { name: "대검찰청 사이버수사과", tel: "1301", url: "https://www.spo.go.kr" },
  { name: "경찰청 사이버수사국", tel: "182", url: "https://ecrm.police.go.kr" },
];

export default function PrivacyPage() {
  return (
    <section className="policy">
      <div className="wrap policy-inner">
        <h1>개인정보 처리방침</h1>
        <p className="policy-lead">
          {p.company}(이하 &lsquo;회사&rsquo;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한
          고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>

        <nav className="policy-toc" aria-label="목차">
          <ol>
            <li><a href="#p1">개인정보의 처리 목적</a></li>
            <li><a href="#p2">처리하는 개인정보 항목</a></li>
            <li><a href="#p3">개인정보의 처리 및 보유 기간</a></li>
            <li><a href="#p4">개인정보의 파기 절차 및 방법</a></li>
            <li><a href="#p5">개인정보의 제3자 제공</a></li>
            <li><a href="#p6">개인정보 처리업무의 위탁</a></li>
            <li><a href="#p7">개인정보의 국외 이전</a></li>
            <li><a href="#p8">정보주체의 권리·의무 및 행사방법</a></li>
            <li><a href="#p9">개인정보의 안전성 확보조치</a></li>
            <li><a href="#p10">개인정보 자동 수집 장치의 설치·운영 및 거부</a></li>
            <li><a href="#p11">개인정보 보호책임자</a></li>
            <li><a href="#p12">권익침해 구제방법</a></li>
            <li><a href="#p13">개인정보 처리방침의 변경</a></li>
          </ol>
        </nav>

        <article className="policy-body">
          <h2 id="p1">제1조 개인정보의 처리 목적</h2>
          <p>회사는 다음 목적을 위해 개인정보를 처리합니다. 처리한 개인정보는 다음 목적 외의 용도로는 이용하지 않으며, 목적이 바뀌는 경우 「개인정보 보호법」 제18조에 따라 별도 동의를 받는 등 필요한 조치를 하겠습니다.</p>
          <ul>
            <li>{p.purpose}</li>
          </ul>

          <h2 id="p2">제2조 처리하는 개인정보 항목</h2>
          <p>회사는 홈페이지의 &lsquo;무료 .AX 진단 신청&rsquo; 양식을 통해 정보주체로부터 직접 다음 항목을 수집합니다. 회원가입 기능은 없습니다.</p>
          <div className="policy-table">
            <table>
              <thead>
                <tr><th scope="col">구분</th><th scope="col">항목</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">필수</th><td>{p.required.join(", ")}</td></tr>
                <tr><th scope="row">선택</th><td>{p.optional.join(", ")}</td></tr>
              </tbody>
            </table>
          </div>
          <p>이 밖에 바꾸고 싶은 시스템 종류(쇼핑몰, ERP 등)를 함께 받지만 이는 개인을 식별하는 정보가 아닙니다. 선택 항목에는 주민등록번호 등 민감한 정보를 적지 않도록 안내하며, 회사는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>

          <h2 id="p3">제3조 개인정보의 처리 및 보유 기간</h2>
          <ul>
            <li>무료 .AX 진단 신청 정보: <strong>{p.retention}</strong> (상담이 진행되지 않은 경우 신청일로부터 1년)</li>
            <li>정보주체가 동의를 철회하거나 삭제를 요청하면 지체 없이 파기합니다.</li>
            <li>다만 다른 법령에 따라 보존해야 하는 경우에는 해당 법령이 정한 기간 동안 보관합니다.</li>
          </ul>

          <h2 id="p4">제4조 개인정보의 파기 절차 및 방법</h2>
          <ul>
            <li>파기 절차: 보유 기간이 지났거나 처리 목적이 달성된 개인정보는 개인정보 보호책임자의 확인을 거쳐 지체 없이(5일 이내) 파기합니다.</li>
            <li>파기 방법: 전자적 파일(접수 메일 등)은 복구할 수 없는 방법으로 영구 삭제하고, 종이 문서는 분쇄하거나 소각합니다.</li>
          </ul>

          <h2 id="p5">제5조 개인정보의 제3자 제공</h2>
          <p>회사는 정보주체의 개인정보를 제1조의 목적 범위에서만 처리하며, 정보주체의 동의나 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우를 제외하고는 제3자에게 제공하지 않습니다.</p>

          <h2 id="p6">제6조 개인정보 처리업무의 위탁</h2>
          <p>회사는 원활한 업무 처리를 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
          <div className="policy-table">
            <table>
              <thead>
                <tr><th scope="col">수탁자</th><th scope="col">위탁 업무</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Amazon Web Services, Inc.</th><td>홈페이지 운영, 신청 정보 전송 및 접수 메일 발송 (서울 리전)</td></tr>
                <tr><th scope="row">Google LLC</th><td>접수 메일 수신 및 보관 (Google Workspace)</td></tr>
              </tbody>
            </table>
          </div>
          <p>회사는 위탁 계약 시 「개인정보 보호법」 제26조에 따라 위탁 업무 목적 외 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지 감독합니다. 위탁 업무의 내용이나 수탁자가 바뀌면 이 처리방침을 통해 공개하겠습니다.</p>

          <h2 id="p7">제7조 개인정보의 국외 이전</h2>
          <p>회사는 접수 메일을 Google Workspace로 수신·보관하며, 이 과정에서 개인정보가 국외에 저장될 수 있습니다.</p>
          <div className="policy-table">
            <table>
              <tbody>
                <tr><th scope="row">이전받는 자</th><td>Google LLC (개인정보 관련 문의: googlekrsupport@google.com)</td></tr>
                <tr><th scope="row">이전 국가</th><td>미국 등 Google 데이터센터 소재 국가</td></tr>
                <tr><th scope="row">이전 일시 및 방법</th><td>진단 신청 시 정보통신망(이메일)을 통해 전송</td></tr>
                <tr><th scope="row">이전 항목</th><td>제2조의 수집 항목 전체</td></tr>
                <tr><th scope="row">이전 목적</th><td>접수 메일 수신 및 보관</td></tr>
                <tr><th scope="row">보유 및 이용 기간</th><td>제3조의 보유 기간과 같음</td></tr>
              </tbody>
            </table>
          </div>
          <p>국외 이전을 원하지 않으시면 진단 신청 양식 대신 전화 등 다른 방법으로 문의하실 수 있습니다. 다만 이 경우 온라인 신청은 이용할 수 없습니다.</p>

          <h2 id="p8">제8조 정보주체의 권리·의무 및 행사방법</h2>
          <ul>
            <li>정보주체는 회사에 대해 언제든지 개인정보 열람, 정정·삭제, 처리정지 및 동의 철회를 요구할 수 있습니다.</li>
            <li>권리 행사는 서면, 전자우편({p.email}) 등으로 하실 수 있으며, 회사는 지체 없이(10일 이내) 조치하겠습니다.</li>
            <li>법정대리인이나 위임을 받은 사람 등 대리인을 통해서도 권리를 행사할 수 있습니다. 이 경우 「개인정보 처리 방법에 관한 고시」 별지 제11호 서식에 따른 위임장을 제출해야 합니다.</li>
            <li>개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 따라 제한될 수 있습니다.</li>
            <li>다른 법령에서 수집 대상으로 명시된 개인정보는 삭제를 요구할 수 없습니다.</li>
            <li>회사는 권리 행사를 요구한 사람이 본인이거나 정당한 대리인인지 확인합니다.</li>
          </ul>

          <h2 id="p9">제9조 개인정보의 안전성 확보조치</h2>
          <ul>
            <li>관리적 조치: 개인정보를 다루는 인원을 최소화하고, 내부 관리 방침에 따라 관리합니다.</li>
            <li>기술적 조치: 신청 정보는 암호화된 통신(HTTPS)으로만 전송하며, 접수 메일 계정과 서버 관리 계정은 접근 권한을 제한하고 2단계 인증 등으로 보호합니다. 신청 정보는 홈페이지 서버에 따로 저장하지 않습니다.</li>
            <li>물리적 조치: 개인정보가 담긴 문서와 기기는 잠금장치가 있는 장소에 보관합니다.</li>
          </ul>

          <h2 id="p10">제10조 개인정보 자동 수집 장치의 설치·운영 및 거부</h2>
          <p>회사 홈페이지는 이용자의 정보를 저장하고 수시로 불러오는 쿠키(cookie)나 방문 분석 도구를 사용하지 않습니다. 앞으로 사용하게 되면 이 처리방침에 그 목적과 거부 방법을 미리 알리겠습니다.</p>

          <h2 id="p11">제11조 개인정보 보호책임자</h2>
          <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다. 개인정보 열람 청구도 아래 담당자에게 하실 수 있습니다.</p>
          <div className="policy-table">
            <table>
              <tbody>
                <tr><th scope="row">개인정보 보호책임자</th><td>{officerName}</td></tr>
                <tr><th scope="row">연락처</th><td><a href={`mailto:${p.email}`}>{p.email}</a>{p.officer.phone ? `, ${p.officer.phone}` : ""}</td></tr>
              </tbody>
            </table>
          </div>

          <h2 id="p12">제12조 권익침해 구제방법</h2>
          <p>정보주체는 개인정보 침해로 인한 구제를 받기 위해 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.</p>
          <ul>
            {remedies.map((r) => (
              <li key={r.name}>
                {r.name}: (국번 없이) {r.tel}, <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url.replace("https://", "")}</a>
              </li>
            ))}
          </ul>
          <p>「개인정보 보호법」 제35조(열람), 제36조(정정·삭제), 제37조(처리정지 등)에 따른 요구에 대해 공공기관의 장이 한 처분이나 부작위로 권리 또는 이익을 침해받은 경우 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다. (중앙행정심판위원회 www.simpan.go.kr, 국번 없이 110)</p>

          <h2 id="p13">제13조 개인정보 처리방침의 변경</h2>
          <p>이 개인정보 처리방침은 <strong>{p.effectiveDate}</strong>부터 적용됩니다. 내용이 바뀌면 시행 7일 전부터 홈페이지를 통해 알리겠습니다.</p>

          <p className="policy-meta">
            {p.company} · 사업자등록번호 {p.bizNo} · <Link href="/diagnosis/">무료 .AX 진단 신청</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
