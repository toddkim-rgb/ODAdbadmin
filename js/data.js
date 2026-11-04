/* 데모 데이터 생성기 — 같은 시드에서 항상 같은 데이터를 만든다.
   사업 기본정보(사업명·국가·분야·유형·연도·금액)는 seed-projects.js 원천자료(공개 사업DB 119건)를 그대로 쓰고,
   공모·심의 시나리오, 입찰·계약·집행·일정·문서·성과·결재 데이터는 시연용으로 생성한다.
   단계 구분·주체·추적조사 규칙은 '사업 전 주기 로드맵' 제안 시안을 따른다. */
(function () {
  const K = (window.KIDC = window.KIDC || {});

  /* ── 날짜 유틸 ─────────────────────────────── */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diffD = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const dt = (y, m, d) => `${y}-${pad(m)}-${pad(Math.min(d, 28))}`;
  const stamp = (d, h = 9, mi = 0) => `${d} ${pad(h)}:${pad(mi)}`;
  const nowStamp = () => { const d = new Date(); return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const yfrac = s => { const d = parse(s), y = d.getFullYear(); return y + (d - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1)); };
  K.u = { pad, ymd, parse, addD, diffD, dt, stamp, nowStamp, yfrac, today: () => ymd(new Date()) };

  /* ── 시드 난수 ─────────────────────────────── */
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const round = (v, unit) => Math.round(v / unit) * unit;

  /* ── 추진단계 · 세부상태 ─────────────────────── */
  K.STAGES = [
    { k: 'DISCOVERED', n: '발굴', y: 'N-2' },
    { k: 'PRELIM', n: '예비', y: 'N-1' },
    { k: 'HELD', n: '보류', y: '' },
    { k: 'REJECTED', n: '미선정', y: '' },
    { k: 'CONFIRMED', n: '확정', y: 'N' },
    { k: 'CONTRACTED', n: '계약체결', y: 'N' },
    { k: 'ONGOING', n: '수행', y: '' },
    { k: 'CLOSED', n: '종료', y: '' },
    { k: 'FOLLOWUP', n: '추적조사', y: '' },
  ];
  K.FLOW = ['DISCOVERED', 'PRELIM', 'CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED', 'FOLLOWUP'];
  K.SUBS = { DISCOVERED: ['접수', '서류심사', '고도화', '위원회 상정', '선정'], PRELIM: ['편입', '상정', '의결'] };
  K.stageName = k => (K.STAGES.find(s => s.k === k) || {}).n || k;
  K.TRACK = tp => ({ 프로젝트: 5, 연수: 1 })[tp] ?? 3;
  /* 센터 밖에서 결정되는 단계 변경 — 결재 없이 결정기관·근거만 기록 */
  K.EXT = {
    DISCOVERED: [
      { id: 'pass', label: '서류심사 통과 → 고도화 대상', to: 'DISCOVERED', sub: '고도화', body: '국제개발협력센터 (공모 서류심사)', when: p => ['접수', '서류심사'].includes(p.sub) },
      { id: 'adv', label: '고도화 완료 → 자문위원회 상정', to: 'DISCOVERED', sub: '위원회 상정', body: '고도화 전문기관', when: p => p.sub === '고도화' },
      { id: 'sel', label: '선정', to: 'DISCOVERED', sub: '선정', body: '발굴 자문위원회', when: p => p.sub === '위원회 상정' },
      { id: 'hold', label: '보류', to: 'HELD', sub: '@', body: '발굴 자문위원회', reason: 1, when: p => p.sub !== '선정' },
      { id: 'rej', label: '미선정', to: 'REJECTED', sub: '@', body: '발굴 자문위원회', reason: 1, when: p => p.sub !== '선정' },
    ],
    PRELIM: [
      { id: 'res', label: '의결', to: 'PRELIM', sub: '의결', body: '국토교통 국제개발협력위원회', when: p => p.sub === '상정' },
      { id: 'hold', label: '보류', to: 'HELD', sub: '예비 심의', body: '국토교통 국제개발협력위원회', reason: 1, when: p => p.sub === '상정' },
      { id: 'rej', label: '미의결 (미선정)', to: 'REJECTED', sub: '예비 심의', body: '국토교통 국제개발협력위원회', reason: 1, when: p => p.sub === '상정' },
      { id: 'conf', label: '신규사업 확정', to: 'CONFIRMED', sub: '', body: '외교부 검토 → 국제개발협력위원회', when: p => p.sub === '의결' },
    ],
    HELD: [
      { id: 'sel', label: '재검토 결과 선정', to: 'DISCOVERED', sub: '선정', body: '발굴 자문위원회', when: p => p.sub !== '예비 심의' },
      { id: 'res', label: '재상정 결과 의결', to: 'PRELIM', sub: '의결', body: '국토교통 국제개발협력위원회', when: p => p.sub === '예비 심의' },
      { id: 'rej', label: '미선정', to: 'REJECTED', sub: '@', body: '발굴 자문위원회 / 국토교통 국제개발협력위원회', reason: 1, when: () => true },
    ],
  };
  /* 센터 내부 처리 — 결재 후 반영 */
  K.INT = {
    DISCOVERED: [{ to: 'PRELIM', sub: '편입', label: '예비사업 편입', when: p => p.sub === '선정' }],
    PRELIM: [{ to: 'PRELIM', sub: '상정', label: '국토교통 국제개발협력위원회 심의 상정', when: p => p.sub === '편입' }],
    CONTRACTED: [{ to: 'ONGOING', sub: '', label: '착수 (착수계 접수)', when: () => true }],
    ONGOING: [{ to: 'CLOSED', sub: '', label: '사업 종료 (종료평가·정산·인계 완료)', when: () => true }],
    CLOSED: [{ to: 'FOLLOWUP', sub: '', label: '추적조사 단계 전환', when: p => p.endYear >= 2023 }],
  };
  /* 사업 전 주기 10단계 — 단계별 주관·작성·결정 주체 (로드맵 시안 '단계별 주체') */
  K.LIFE = [
    { n: '발굴 (공모 또는 기획연구)', w: ['센터 (공모 시행 · 기획연구 의뢰)', '제안기관 (공공·민간) · 고도화 전문기관', '자문위원회 자문 · 고도화 실시계획 국토부 보고'], src: '공모·고도화 결과 또는 기획연구 산출물', ref: '발굴 제6~9·11조' },
    { n: '심의', w: ['센터 (심의 자료 제출)', '센터', '국토교통 국제개발협력위원회 의결'], src: '외교부 사업시행계획서 제출 여부 의결', ref: '발굴 제10·12조' },
    { n: '확정', w: ['센터', '센터 (외교부 사업시행계획서)', '외교부 검토 → 국제개발협력위원회 확정'], src: '신규사업 확정', ref: '발굴 제2조' },
    { n: '조달 · 계약', w: ['센터 (조달계획 → 국토부 보고, 공고·계약)', '입찰자 (제안서)', '기술평가위원회 평가 · 센터 계약'], src: '조달계획 · 입찰공고 · 계약', ref: '사관26 제5~9조, 기평' },
    { n: '수행', w: ['수행기관', '수행기관 (보고서·하도급·예산변경 신청)', '센터 감독·승인 · 중요 계약변경 국토부 승인'], src: '착수·중간·최종보고, 예산변경', ref: '사관26 제10~31조' },
    { n: '종료평가 · 정산 · 인계', w: ['센터', '수행기관 (최종·성과평가보고서, 정산서) · 회계법인', '성과평가위원회 등급 · 센터 정산 승인 · 수원국 최종보고회'], src: '종료 1개월 전 성과평가 · 보완 2개월 · 정산 승인 · 반납 7영업일 · 수원국 최종보고회 인계', ref: '성평위 제8~13조, 사관26 제32~37조' },
    { n: '인계 후 운영', w: ['수원국 (산출물 관리권)', '수행기관 (사후관리 계획 이행)', '-'], src: '수원국 자체 운영 · 사후관리 계획 이행 (프로젝트 5년 · 개발컨설팅 3년)', ref: '사관26 제37조, 성평위 별표1' },
    { n: '추적조사', w: ['센터 (접수·분석 → 국토부 보고)', '수행기관 (매년 2월 보고서)', '센터 (면제 판단)'], src: '산출물 운영·제도 반영·현지 자립·후속사업 필요 여부 점검', ref: '성관 제26조' },
    { n: '자체평가 · 사후평가', w: ['센터', '평가자 · 사후평가 용역사', '평가전문위 의결 (평가계획)'], src: 'DAC 기준 자체평가 · 현지조사 포함 사후평가 · 보고서 홈페이지 공개', ref: '성관 제4~19조' },
    { n: '환류 → 다음 발굴', w: ['센터 (평가계획·환류과제)', '센터 (성과요인·환류 분석)', '국토부 협의'], src: '평가환류과제 이행 · 후속·연계사업이 필요하면 신규 발굴 후보로', ref: '성관 제18조' },
  ];
  K.TRACK_ITEMS = [
    ['keep', 'PDM 핵심 성과 달성·유지', ''], ['use', '핵심 산출물 활용 현황', ''], ['aftercare', '사후관리 이행 상태', ''], ['linkage', '사업연계성과', ''],
    ['settle', '성과정착도 · 중장기 효과', '지침 제26조'], ['need', '후속·연계사업 필요성 · 가능성', '지침 제26조'], ['spread', '성과 확산 · 지원 필요성', '지침 제26조'],
    ['side', '의도하지 않은 긍정·부정 영향', ''], ['orders', '국내 기업 관련 사업 수주', ''],
  ];

  const CONTINENT = { 동남아: '아시아', 서남아: '아시아', 중앙아: '아시아', 아시아: '아시아', 중동: '아시아', 중남미: '아메리카', 아프리카: '아프리카', 북아프리카: '아프리카', 동유럽: '유럽', 유라시아: '유럽' };
  const COUNTRY_EN = {
    라오스: 'Lao PDR', 미얀마: 'Myanmar', 방글라데시: 'Bangladesh', 베트남: 'Vietnam', 인도네시아: 'Indonesia', 캄보디아: 'Cambodia',
    태국: 'Thailand', 필리핀: 'Philippines', 우크라이나: 'Ukraine', 이집트: 'Egypt', 튀니지: 'Tunisia', 네팔: 'Nepal', 스리랑카: 'Sri Lanka',
    인도: 'India', 가나: 'Ghana', 나이지리아: 'Nigeria', 르완다: 'Rwanda', 모잠비크: 'Mozambique', 보츠와나: 'Botswana', 에티오피아: 'Ethiopia',
    코트디부아르: "Côte d'Ivoire", 탄자니아: 'Tanzania', 니카라과: 'Nicaragua', 볼리비아: 'Bolivia', 엘살바도르: 'El Salvador', 칠레: 'Chile',
    코스타리카: 'Costa Rica', 콜롬비아: 'Colombia', 파라과이: 'Paraguay', 페루: 'Peru', 요르단: 'Jordan', 몽골: 'Mongolia',
    우즈베키스탄: 'Uzbekistan', 키르기스탄: 'Kyrgyzstan', 타지키스탄: 'Tajikistan', 케냐: 'Kenya', 에콰도르: 'Ecuador',
  };
  const INCOME = {
    '최빈개도국': ['라오스', '미얀마', '방글라데시', '캄보디아', '네팔', '르완다', '모잠비크', '에티오피아', '탄자니아'],
    '하위중소득국': ['베트남', '필리핀', '인도', '스리랑카', '우즈베키스탄', '키르기스탄', '타지키스탄', '몽골', '가나', '나이지리아', '코트디부아르', '이집트', '튀니지', '니카라과', '볼리비아', '케냐', '요르단'],
    '상위중소득국': ['인도네시아', '태국', '콜롬비아', '페루', '파라과이', '코스타리카', '보츠와나', '엘살바도르', '우크라이나', '에콰도르'],
    '고소득국': ['칠레'],
  };
  const incomeOf = ct => Object.keys(INCOME).find(k => INCOME[k].includes(ct)) || '미분류';
  const NONCOUNTRY = ['중점국', '유라시아'];

  const FIELDS = ['도로', '철도', 'ITS', '공항', '물류', '공간정보', '수자원', '주택도시', '건설기준', '기타'];
  const TEAM_OF_FIELD = { 도로: '사업1팀', 철도: '사업1팀', ITS: '사업1팀', 공항: '사업1팀', 물류: '사업1팀', 공간정보: '사업2팀', 수자원: '사업2팀', 주택도시: '사업2팀', 건설기준: '사업2팀', 기타: '사업2팀' };
  const TEAM_STAFF = { 사업1팀: ['u04', 'u05'], 사업2팀: ['u06', 'u07'] };
  const TEAM_LEAD = { 사업1팀: 'u02', 사업2팀: 'u03' };
  const WORKTYPES = ['마스터플랜 수립', '타당성조사', '시스템·시설 구축', '시범사업·실증', '역량강화·연수', '기획조사', '기술지원·자문'];
  const workTypeOf = (nm, tp) => {
    if (tp === '연수') return '역량강화·연수';
    if (/타당성|F\/S|예비조사/.test(nm)) return '타당성조사';
    if (/마스터플랜|기본계획|M\/P|전략|종합계획|기본설계/.test(nm)) return '마스터플랜 수립';
    if (/시범|실증/.test(nm)) return '시범사업·실증';
    if (/구축|시스템|플랫폼|DB|센터/.test(nm)) return '시스템·시설 구축';
    if (/역량|교육|연수/.test(nm)) return '역량강화·연수';
    if (tp === '기획') return '기획조사';
    return '기술지원·자문';
  };
  /* 제안기관·수행기관·조사기관은 모두 가상의 명칭 */
  const AGENCY = { 도로: '한국도로협력공사', 철도: '한국철도협력공단', ITS: '한국교통인프라연구원', 공항: '한국공항개발공사', 물류: '국토물류진흥원', 공간정보: '국토공간정보원', 수자원: '한국수자원개발공사', 주택도시: '국토도시개발공사', 건설기준: '한국건설기준연구원', 기타: '국토교통협력진흥원' };
  const VENDORS = ['㈜한빛엔지니어링', '㈜동해기술단', '㈜세진국토컨설팅', '㈜미래교통연구소', '㈜누리공간정보', '㈜청솔도시건축', '㈜가온수자원기술', '㈜서림인프라', '㈜다솜아이티에스', '㈜온길교통기술', '㈜한결국토엔지니어링', '㈜바른지적기술'];
  const SURVEYORS = ['㈜ODA성과연구소', '㈜국제개발평가컨설팅', '(사)개발협력평가연구원'];
  const EXEC_ITEMS = ['인건비', '직접경비', '일반관리비', '이윤', '부가가치세'];
  const SURPLUS_ITEMS = ['감리비', '추가 과업(사업비)', '사후관리비', '예비비'];
  const DOC_TYPES = ['공모 제안서', '고도화 분석보고서', '자문위원회 결과', '사업계획서', '외교부 제출자료', '심의자료', '위원회 의결서', '공문', '회의자료', '제안요청서', '과업지시서', '입찰공고문', '계약서', '착수계', '착수보고서', '중간보고서', '최종보고서', '요약보고서', '성과관리계획서(PDM)', '기초선 조사보고서', '종료선 조사보고서', '추적조사 보고서', '자체평가서', '증빙자료'];
  const EVAL_ITEMS = ['적절성', '일관성', '효과성', '효율성', '영향력', '지속가능성'];
  K.CONST = { CONTINENT, COUNTRY_EN, INCOME, FIELDS, TEAM_OF_FIELD, TEAM_STAFF, TEAM_LEAD, WORKTYPES, AGENCY, VENDORS, SURVEYORS, EXEC_ITEMS, SURPLUS_ITEMS, DOC_TYPES, EVAL_ITEMS, NONCOUNTRY, incomeOf, workTypeOf };

  /* ── 사용자 (가상 인물) ───────────────────── */
  const USERS = [
    { id: 'u01', name: '김지훈', title: '센터장', team: '센터장실', role: 'MANAGER', head: true, email: 'jihoon.kim@kidc.example', phone: '010-2381-4410' },
    { id: 'u02', name: '이서연', title: '팀장', team: '사업1팀', role: 'MANAGER', email: 'seoyeon.lee@kidc.example', phone: '010-4172-9931' },
    { id: 'u03', name: '정민호', title: '팀장', team: '사업2팀', role: 'MANAGER', email: 'minho.jung@kidc.example', phone: '010-5530-1287' },
    { id: 'u04', name: '최유진', title: '선임', team: '사업1팀', role: 'STAFF', email: 'yujin.choi@kidc.example', phone: '010-6614-2051' },
    { id: 'u05', name: '한도윤', title: '주임', team: '사업1팀', role: 'STAFF', email: 'doyun.han@kidc.example', phone: '010-3349-7720' },
    { id: 'u06', name: '오세라', title: '선임', team: '사업2팀', role: 'STAFF', email: 'sera.oh@kidc.example', phone: '010-9021-6634' },
    { id: 'u07', name: '강태현', title: '주임', team: '사업2팀', role: 'STAFF', email: 'taehyun.kang@kidc.example', phone: '010-7745-0193' },
    { id: 'u08', name: '서지민', title: '차장', team: '정보화지원실', role: 'VIEWER', email: 'jimin.seo@kidc.example', phone: '010-2208-5517' },
    { id: 'u09', name: '박준서', title: '과장', team: '정보화지원실', role: 'ADMIN', email: 'junseo.park@kidc.example', phone: '010-8863-4402' },
  ];

  /* ── 공모 시나리오 (사업명·결과는 시연용 가상 예시) ─────────────
     2026년 공모(2028년 시행) 24건: 선정 9 · 고도화 보류 2 · 위원회 미선정 3 · 서류심사 미선정 10
     2025년 공모(2027년 시행) 상정 12건: 의결 9 · 보류 3, 그리고 2025년 공모 미선정 기록 */
  const S26 = [
    ['P2025-003', '탄자니아 다르에스살람 도시철도 운영역량 강화 사업', '아프리카', '탄자니아', '철도', '프로젝트', '공공', 4.2e9, 'ok', '위원회', '', { mode: '수원기관 공동 기획', ev: 'LOI 확보 · 수원국 요청공문', desc: '도시철도 운영·유지관리 역량강화 (차량 기자재 제외)', owner: 'u04',
      r1: { nm: '탄자니아 다르에스살람 도시철도 운영역량 강화 및 차량 기자재 지원 사업', amt: 4.8e9, mode: '단독 제안', ev: '수원국 요청공문 (LOI 없음)', desc: '운영역량 강화 + 차량 기자재 지원', at: '위원회', why: '수원국 협력의지 근거(LOI) 부족' } }],
    ['P2026-001', '베트남 하노이 Lich강 수질개선 후속 시범사업', '동남아', '베트남', '수자원', '프로젝트', '공공', 5.2e9, 'ok', '위원회', '', { prev: 'P2017-025', mode: '선행사업 연계 제안', ev: '수원국 요청공문 · 선행사업 추적조사 결과' }],
    ['P2026-002', '몽골 울란바토르 스마트 신호제어 시범구축 사업', '중앙아', '몽골', 'ITS', '프로젝트', '공공', 4.8e9, 'ok', '위원회', ''],
    ['P2026-003', '캄보디아 프놈펜 외곽순환도로 유지관리 역량강화 사업', '동남아', '캄보디아', '도로', '프로젝트', '공공', 3.9e9, 'ok', '위원회', '', { owner: 'u04' }],
    ['P2026-004', '케냐 나이로비 BRT 노선 타당성조사 및 운영역량 강화', '아프리카', '케냐', '도로', '개발컨설팅', '민간', 1.45e9, 'no', '위원회', '수원국 협력의지 근거(LOI) 부족', { owner: 'u05' }],
    ['P2026-005', '파라과이 국가공간정보 인프라(NSDI) 고도화 사업', '중남미', '파라과이', '공간정보', '프로젝트', '공공', 4.5e9, 'ok', '위원회', ''],
    ['P2026-006', '에콰도르 키토 지적정보 현대화 마스터플랜 수립', '중남미', '에콰도르', '공간정보', '개발컨설팅', '민간', 1.2e9, 'hold', '고도화', '사업범위 조정 필요 - 고도화 후 재검토'],
    ['P2026-007', '우즈베키스탄 사마르칸트 도시재생 마스터플랜 수립', '중앙아', '우즈베키스탄', '주택도시', '개발컨설팅', '공공', 1.1e9, 'ok', '위원회', ''],
    ['P2026-008', '라오스 비엔티안 도시홍수 예·경보 시스템 구축 사업', '동남아', '라오스', '수자원', '프로젝트', '공공', 5.6e9, 'ok', '위원회', ''],
    ['P2026-009', '페루 리마 광역 대중교통 통합요금체계 구축 사업', '중남미', '페루', 'ITS', '프로젝트', '민간', 4.2e9, 'no', '위원회', '유사 다자기구 사업과 중복 우려'],
    ['P2026-010', '필리핀 세부 해상교량 안전진단 기술협력 사업', '동남아', '필리핀', '도로', '프로젝트', '공공', 3.6e9, 'ok', '위원회', ''],
    ['P2026-011', '가나 아크라 도시교통 마스터플랜 수립', '아프리카', '가나', '도로', '개발컨설팅', '민간', 1.3e9, 'no', '서류심사', '사전타당성조사 미제출'],
    ['P2026-012', '인도네시아 누산타라 신수도 스마트 모빌리티 기본계획 수립', '동남아', '인도네시아', 'ITS', '개발컨설팅', '공공', 1.35e9, 'ok', '위원회', ''],
    ['P2026-013', '스리랑카 콜롬보 항만배후 물류단지 마스터플랜', '서남아', '스리랑카', '물류', '개발컨설팅', '민간', 1.2e9, 'no', '서류심사', '타 기관 유사사업과 중복'],
    ['P2026-014', '에티오피아 아디스아바바 지가정보시스템 구축 사업', '아프리카', '에티오피아', '공간정보', '프로젝트', '공공', 4.0e9, 'no', '위원회', '수원국 재원분담 계획 미흡'],
    ['P2026-015', '방글라데시 다카 도시철도 역세권 개발 기본계획', '서남아', '방글라데시', '철도', '개발컨설팅', '민간', 1.4e9, 'no', '서류심사', '수원국 요청공문 미첨부'],
    ['P2026-016', '볼리비아 라파스 케이블카 연계 대중교통 계획', '중남미', '볼리비아', '도로', '개발컨설팅', '민간', 1.1e9, 'no', '서류심사', '사업비 산출 근거 부족'],
    ['P2026-017', '네팔 카트만두 상수도 누수관리 시범사업', '서남아', '네팔', '수자원', '프로젝트', '공공', 5.0e9, 'no', '서류심사', '타 기관 유사사업과 중복'],
    ['P2026-018', '모잠비크 마푸투 지적측량 역량강화 연수', '아프리카', '모잠비크', '공간정보', '연수', '공공', 0.6e9, 'no', '서류심사', '연수 대상·규모 근거 부족'],
    ['P2026-019', '콜롬비아 보고타 교통신호 ITS 고도화 사업', '중남미', '콜롬비아', 'ITS', '프로젝트', '민간', 2.8e9, 'no', '서류심사', '사전타당성조사 미제출'],
    ['P2026-020', '키르기스탄 비슈케크 공항 개발 기본계획', '중앙아', '키르기스탄', '공항', '개발컨설팅', '민간', 1.25e9, 'hold', '고도화', '항공수요 예측 재검토 후 재상정'],
    ['P2026-021', '튀니지 튀니스 건설기준 현대화 기술협력', '북아프리카', '튀니지', '건설기준', '개발컨설팅', '공공', 1.0e9, 'no', '서류심사', '수원기관 협력의지 확인 불가'],
    ['P2026-022', '코트디부아르 아비장 간선도로 유지관리 체계 구축 사업', '아프리카', '코트디부아르', '도로', '프로젝트', '공공', 4.5e9, 'no', '서류심사', '사업범위 과다 - 단계 분리 필요'],
    ['P2026-023', '요르단 암만 스마트 물관리 2단계 사업', '중동', '요르단', '수자원', '프로젝트', '공공', 3.8e9, 'no', '서류심사', '선행사업 성과 확인 자료 미제출'],
  ];
  const S25 = [
    ['P2025-001', '우즈베키스탄 타슈켄트 BRT 운영관리 고도화 사업', '중앙아', '우즈베키스탄', 'ITS', '프로젝트', '공공', 4.6e9, '의결'],
    ['P2025-002', '라오스 루앙프라방 도시계획정보시스템 구축 사업', '동남아', '라오스', '공간정보', '프로젝트', '공공', 4.1e9, '의결'],
    ['P2025-004', '베트남 다낭 도시철도 1호선 타당성조사', '동남아', '베트남', '철도', '개발컨설팅', '민간', 1.5e9, '의결', '', { owner: 'u04' }],
    ['P2025-005', '페루 쿠스코 지적 DB 구축 및 토지행정 역량강화 사업', '중남미', '페루', '공간정보', '프로젝트', '공공', 4.4e9, '의결'],
    ['P2025-006', '탄자니아 도도마 신행정수도 도시계획 수립', '아프리카', '탄자니아', '주택도시', '개발컨설팅', '공공', 1.3e9, '의결'],
    ['P2025-007', '몽골 국가도로 스마트 유지관리 2단계 사업', '중앙아', '몽골', '도로', '프로젝트', '공공', 4.9e9, '의결', '', { prev: 'P2024-102', owner: 'u04' }],
    ['P2025-008', '콜롬비아 메데진 교통안전 데이터플랫폼 구축 사업', '중남미', '콜롬비아', 'ITS', '프로젝트', '민간', 3.9e9, '의결'],
    ['P2025-009', '필리핀 메트로마닐라 도시철도 환승체계 개선 타당성조사', '동남아', '필리핀', '철도', '개발컨설팅', '민간', 1.25e9, '보류', '수원국 정부 사업 우선순위 재확인 필요'],
    ['P2025-010', '방글라데시 치타공 항만물류 효율화 마스터플랜', '서남아', '방글라데시', '물류', '개발컨설팅', '민간', 1.2e9, '의결'],
    ['P2025-012', '에콰도르 과야킬 하천 홍수관리 마스터플랜', '중남미', '에콰도르', '수자원', '개발컨설팅', '공공', 1.3e9, '보류', '수원국 재원분담 협의 미완료'],
    ['P2025-013', '엘살바도르 태평양철도 기본설계 후속 사업', '중남미', '엘살바도르', '철도', '프로젝트', '공공', 5.5e9, '의결', '', { prev: 'P2024-091' }],
    ['P2025-014', '가나 쿠마시 도시교통 ITS 구축 사업', '아프리카', '가나', 'ITS', '프로젝트', '민간', 4.0e9, '보류', '사업범위·예산 조정 후 재상정'],
    ['P2025-011', '르완다 키갈리 스마트 주차관리 시범사업', '아프리카', '르완다', 'ITS', '프로젝트', '민간', 2.4e9, '미선정', '사전타당성조사 미제출'],
  ];
  const durOf = tp => (tp === '프로젝트' ? 3 : tp === '연수' ? 0 : 1);

  /* ── PDM 템플릿 (지표 라이브러리 기본값) — 5단(목표·성과·산출물·활동·투입) × 정의·지표·검증수단·가정 ── */
  const L = (level, narr, name, unit, base, target, mov, assume) => ({ level, narr, name, unit, base, target, mov, assume });
  const PDM_TPL = {
    도로: { goal: '대상 지역 도로 이동성·안전성 향상', act: '도로망 조사·계획 수립, 공무원 역량강화 연수', rows: [L('Impact', '대상 지역 교통 혼잡 완화', '첨두시 평균 통행시간', '분', 52, 45, '국가 교통통계 (추적조사)', '교통정책 유지'), L('Outcome', '간선도로 운영 개선', '대상 구간 평균 통행시간 단축률', '%', 0, 20, '교통량 조사(첨두시)', '수원국 도로예산 확보'), L('Output', '도로망 계획 · 운영역량', '도로망 계획 수원국 공식 승인', '건', 0, 1, '수원국 승인 공문', '정책 우선순위 유지'), L('Output', '', '역량강화 연수 이수 인원', '명', 0, 30, '연수 수료 명부', '연수생 재직 유지')] },
    철도: { goal: '철도망 확충을 위한 계획·사업 기반 마련', act: '철도망 조사·기본계획 수립, 운영인력 연수', rows: [L('Impact', '대중교통 수송분담 확대', '철도 수송분담률', '%', 3, 8, '국가 교통통계 (추적조사)', '철도투자 계획 유지'), L('Outcome', '후속 사업 추진 기반', '후속 사업(설계·시공) 추진 결정', '건', 0, 1, '수원국 국가계획 반영', '재원 확보'), L('Output', '철도 기본계획', '철도 기본계획 보고서 채택', '건', 0, 1, '수원국 승인 공문', '부처 협의 완료'), L('Output', '', '철도분야 공무원 연수 이수 인원', '명', 0, 25, '연수 수료 명부', '연수생 재직 유지')] },
    ITS: { goal: '교통관리 체계 고도화를 통한 도시 교통혼잡 완화', act: '관제시스템 설계·구축, 운영인력 연수', rows: [L('Impact', '수도권 교통 혼잡 완화', '첨두시 평균 통행시간', '분', 52, 45, '국가 교통통계 (추적조사)', '교통정책 유지'), L('Outcome', '관제센터 기반 신호 운영', '신호 연동 교차로 비율', '%', 12, 60, '관제센터 운영 로그', '수원기관 운영인력 유지'), L('Output', '교통관제센터 · 운영인력', '교통관제센터 구축', '개소', 0, 1, '준공보고서', '부지 제공'), L('Output', '', '관제 운영인력 교육 이수 인원', '명', 0, 40, '교육 수료 명부', '운영인력 재직 유지')] },
    공항: { goal: '공항 개발계획 수립을 통한 항공 인프라 확충 기반 마련', act: '항공수요 조사·개발계획 수립, 연수', rows: [L('Impact', '항공 접근성 개선', '연간 항공 여객 처리량', '만명', 120, 180, '항공 통계 (추적조사)', '항공수요 회복'), L('Outcome', '국가계획 반영', '공항 개발계획 국가계획 반영', '건', 0, 1, '국가계획 고시', '정책 우선순위 유지'), L('Output', '항공분야 역량', '항공분야 연수 이수 인원', '명', 0, 20, '연수 수료 명부', '연수생 재직 유지')] },
    물류: { goal: '물류 효율화 전략 수립을 통한 물류비 절감', act: '물류 실태조사·전략 수립', rows: [L('Impact', '국가 물류비 절감', 'GDP 대비 물류비', '%', 18, 15, '국가 물류통계 (추적조사)', '경제 여건 유지'), L('Outcome', '물류 전략 채택', '물류 전략 수원국 정책 채택', '건', 0, 1, '정책 채택 공문', '부처 협의 완료'), L('Output', '물류 거점 계획', '물류 거점 후보지 선정', '개소', 0, 3, '최종보고서', '부지 확보 가능')] },
    공간정보: { goal: '토지·공간정보 체계 구축을 통한 행정 효율성 제고', act: '지적·공간정보 DB 구축, 시스템 운영 교육', rows: [L('Impact', '토지행정 투명성 제고', '토지분쟁 처리기간', '일', 180, 90, '토지행정 통계 (추적조사)', '제도 개편 유지'), L('Outcome', '지적 DB 활용', '지적 DB 구축률', '%', 12, 80, '시스템 등록 필지 비율', '측량 인력 확보'), L('Output', '토지정보시스템', '토지정보시스템 활용 공무원 수', '명', 0, 150, '시스템 접속 계정 수', '운영예산 확보'), L('Output', '', '공간정보 연수 이수 인원', '명', 0, 30, '연수 수료 명부', '연수생 재직 유지')] },
    수자원: { goal: '치수·수자원 관리 역량 강화를 통한 홍수 피해 저감', act: '수리·수문 조사, 치수계획 수립, 연수', rows: [L('Impact', '홍수 피해 감소', '연평균 홍수 피해액', '억원', 120, 70, '재난 통계 (추적조사)', '기후 여건'), L('Outcome', '치수 대책 이행', '홍수 피해 저감 대상 면적', '㎢', 0, 45, '수리·수문 분석', '사업 예산 확보'), L('Output', '치수 마스터플랜', '치수 마스터플랜 수원국 승인', '건', 0, 1, '수원국 승인 공문', '부처 협의 완료'), L('Output', '', '수자원 관리 연수 이수 인원', '명', 0, 25, '연수 수료 명부', '연수생 재직 유지')] },
    주택도시: { goal: '도시계획 체계 개선을 통한 지속가능한 도시 성장 지원', act: '도시 현황조사·마스터플랜 수립, 연수', rows: [L('Impact', '계획적 도시성장', '계획구역 내 개발 비율', '%', 35, 60, '도시계획 통계 (추적조사)', '개발 수요 유지'), L('Outcome', '법정계획 반영', '마스터플랜 법정계획 반영', '건', 0, 1, '법정계획 고시', '정책 우선순위 유지'), L('Output', '도시계획 역량', '도시계획 담당 공무원 교육 인원', '명', 0, 40, '교육 수료 명부', '교육생 재직 유지')] },
    건설기준: { goal: '건설기준 정비를 통한 인프라 품질 향상', act: '기준 현황 분석·개정안 작성', rows: [L('Impact', '인프라 품질 향상', '준공 후 하자 발생률', '%', 14, 8, '품질 점검 결과 (추적조사)', '감독 체계 유지'), L('Outcome', '기준 제·개정', '건설기준 제·개정 반영 건수', '건', 0, 5, '고시 문서', '입법 절차 진행'), L('Output', '기준 해설서', '기준 해설서 발간', '권', 0, 2, '최종보고서', '발간 예산 확보')] },
    기타: { goal: '국토교통 분야 정책·제도 역량 강화', act: '정책 조사·제안, 연수', rows: [L('Impact', '정책 역량 강화', '정책 제안 이행률', '%', 0, 60, '이행 점검 (추적조사)', '정부 기조 유지'), L('Outcome', '정책 채택', '정책 제안 수원국 채택 건수', '건', 0, 3, '채택 공문', '부처 협의 완료'), L('Output', '연수', '연수 이수 인원', '명', 0, 30, '연수 수료 명부', '연수생 재직 유지')] },
  };
  K.PDM_LIB = PDM_TPL;

  /* ── 메뉴/권한 ────────────────────────────── */
  K.MENUS = [
    { sec: '사업관리' },
    { k: 'dashboard', n: '전 주기 현황판', path: '/dashboard', req: 'SFR-003' },
    { k: 'projects', n: '사업 목록', path: '/projects', req: 'SFR-016' },
    { k: 'roadmap', n: '전 주기 로드맵', path: '/roadmap', req: '사업범위 나' },
    { k: 'yearly', n: '연도별 추진현황판', path: '/yearly', req: '사업범위 나' },
    { k: 'proposals', n: '공모·미선정 관리', path: '/proposals', req: '필요성 ②' },
    { k: 'schedule', n: '일정 관리', path: '/schedule', req: 'SFR-006' },
    { sec: '예산·계약' },
    { k: 'surplus', n: '낙찰차액 현황', path: '/surplus', req: 'SFR-024' },
    { k: 'budgetChanges', n: '예산변경 요청', path: '/budget-changes', req: 'SFR-023' },
    { sec: '결재' },
    { k: 'approvals', n: '결재함', path: '/approvals', req: 'SFR-027', badge: 'approvals' },
    { k: 'approvalLines', n: '결재라인 설정', path: '/approval-lines', req: 'SFR-026' },
    { sec: '성과·통계' },
    { k: 'performance', n: '성과지표 달성현황', path: '/performance', req: 'SFR-049' },
    { k: 'feedback', n: '성과 환류', path: '/feedback', req: '필요성 ③④' },
    { k: 'stats', n: '통계 현황', path: '/stats', req: 'SFR-029~033' },
    { k: 'pivot', n: '피봇 분석', path: '/pivot', req: 'SFR-035' },
    { sec: '시스템관리' },
    { k: 'users', n: '사용자 관리', path: '/users', req: 'SFR-038' },
    { k: 'perms', n: '그룹·권한 관리', path: '/perms', req: 'SFR-039~040' },
    { k: 'codes', n: '코드·메뉴 관리', path: '/codes', req: 'SFR-041~042' },
    { k: 'logs', n: '로그·이용현황', path: '/logs', req: 'SFR-043~044' },
    { k: 'notify', n: '알림·팝업', path: '/notify', req: 'SFR-006' },
    { k: 'openapi', n: '오픈 API', path: '/openapi', req: 'SFR-037' },
    { sec: '홈페이지 관리' },
    { k: 'homepage', n: '홈페이지 관리자', path: '/homepage', req: 'SFR-015' },
  ];
  const ACTS = ['r', 'c', 'u', 'd', 'a'];
  const P = s => Object.fromEntries(ACTS.map(a => [a, s.includes(a) ? 1 : 0]));
  const defaultPerms = () => {
    const all = K.MENUS.filter(m => m.k).map(m => m.k);
    const m = map => Object.fromEntries(all.map(k => [k, P(map[k] || '')]));
    return {
      ADMIN: m(Object.fromEntries(all.map(k => [k, 'rcud']))),
      MANAGER: m({ dashboard: 'r', projects: 'rcu', roadmap: 'r', yearly: 'r', proposals: 'rcu', schedule: 'rcu', surplus: 'ru', budgetChanges: 'ra', approvals: 'ra', approvalLines: 'r', performance: 'rcua', feedback: 'rcu', stats: 'r', pivot: 'r', codes: 'r', logs: 'r', openapi: 'r' }),
      STAFF: m({ dashboard: 'r', projects: 'rcu', roadmap: 'r', yearly: 'r', proposals: 'rcu', schedule: 'rcu', surplus: 'ru', budgetChanges: 'rc', approvals: 'rc', performance: 'rcu', feedback: 'rcu', stats: 'r', pivot: 'r' }),
      VIEWER: m({ dashboard: 'r', projects: 'r', roadmap: 'r', yearly: 'r', schedule: 'r', surplus: 'r', performance: 'r', feedback: 'r', stats: 'r', pivot: 'r' }),
    };
  };
  K.ROLES = { ADMIN: '시스템관리자', MANAGER: '부서장(결재권자)', STAFF: '사업담당자', VIEWER: '조회전용' };
  K.ACTS = { r: '조회', c: '등록', u: '수정', d: '삭제', a: '승인' };

  /* ── 빌드 ─────────────────────────────────── */
  K.build = function () {
    const T = K.u.today();
    const TY = +T.slice(0, 4);
    const users = USERS.map(u => ({ ...u, status: '정상', failCount: 0, lastLogin: null, groups: ['G-' + u.role, 'D-' + u.team], createdAt: '2026-01-05' }));
    const uname = id => (users.find(u => u.id === id) || {}).name || id;
    const db = {
      ver: 4, seededAt: nowStamp(), session: { userId: 'u04' }, theme: null,
      users, projects: [], approvals: [], history: [], notifications: [], logs: [], mails: [],
      perms: defaultPerms(), permHist: [],
      groups: [
        { id: 'G-ADMIN', nm: '시스템관리자', kind: '역할', role: 'ADMIN', parent: null },
        { id: 'G-MANAGER', nm: '부서장(결재권자)', kind: '역할', role: 'MANAGER', parent: null },
        { id: 'G-STAFF', nm: '사업담당자', kind: '역할', role: 'STAFF', parent: null },
        { id: 'G-VIEWER', nm: '조회전용', kind: '역할', role: 'VIEWER', parent: null },
        { id: 'D-센터장실', nm: '센터장실', kind: '부서', parent: null },
        { id: 'D-사업1팀', nm: '사업1팀(교통)', kind: '부서', parent: 'D-센터장실' },
        { id: 'D-사업2팀', nm: '사업2팀(국토·도시)', kind: '부서', parent: 'D-센터장실' },
        { id: 'D-정보화지원실', nm: '정보화지원실', kind: '부서', parent: null },
      ],
      approvalLines: { def: [{ kind: 'TEAM_LEAD', label: '팀장' }, { kind: 'HEAD', label: '센터장' }], byProject: {}, hist: [] },
      pivotPresets: [
        { id: 'pv1', nm: '지역 × 시작연도 계약금액', rows: ['continent', 'country'], cols: ['startYear'], filters: {}, measure: 'contractAmt' },
        { id: 'pv2', nm: '분야 × 사업유형 사업 수', rows: ['field'], cols: ['type'], filters: {}, measure: 'count' },
      ],
      codes: null, menuHist: [], codeHist: [],
      fbTasks: [], hp: null, noti: null, api: null,
      seq: { ap: 1, doc: 1, ex: 1, ms: 1, h: 1, n: 1, tr: 1, fb: 1 },
    };
    const id = (k, p) => p + String(db.seq[k]++).padStart(4, '0');

    /* 공통 사업 객체 */
    const base = (x, extra) => {
      const team = TEAM_OF_FIELD[x.fd] || '사업2팀';
      const staff = TEAM_STAFF[team];
      const r = rng(hash(x.id));
      const o = Math.floor(r() * 2);
      const owner = extra.owner || staff[o];
      return {
        id: x.id, name: x.nm, region: x.rg, continent: CONTINENT[x.rg] || '기타', country: x.ct, countryEn: COUNTRY_EN[x.ct] || null,
        income: incomeOf(x.ct), type: x.tp, field: x.fd, workType: workTypeOf(x.nm, x.tp), crs: x.sp || '', aid: '무상', channel: x.bi || '양자',
        orderer: '국토교통부', proposer: AGENCY[x.fd] || '국토교통협력진흥원', implementer: null,
        startYear: x.s, endYear: x.e, startDate: null, endDate: null, planAmt: x.pl_amt ?? null, orderAmt: null, contractAmt: null,
        owner, subOwner: staff.find(s => s !== owner) || staff[1 - o], team,
        stage: null, sub: '', stageHist: [], isPublic: false, prevId: x.prev || null, nextIds: [],
        round: null, rounds: [], prop: null,
        desc: x.desc || `${x.ct} ${x.fd} 분야 ${workTypeOf(x.nm, x.tp)} 사업. 국토교통 ODA ${x.tp} 유형으로 추진.`,
        qc: [], migrated: false, deleted: false,
        bid: null, contract: null, execs: [], surplus: [], docs: [], schedule: [], perf: null,
        acl: { viewers: [], editors: [] }, aclHist: [], createdAt: null, updatedAt: null, updatedBy: null,
      };
    };
    const short = nm => nm.replace(/[()\s·]/g, '').slice(0, 16);
    const Dc = (p, r, type, stg, d, ext = 'pdf', pub = false) => d && d <= T && p.docs.push({ id: id('doc', 'D'), type, stage: stg, name: `${short(p.name)}_${type.replace(/[()]/g, '')}.${ext}`, size: Math.round((0.3 + r() * 9) * 1024 * 1024), by: p.owner, at: stamp(d, 10 + Math.floor(r() * 7), Math.floor(r() * 59)), mod: null, pub });
    const MS = (p, name, stg, plan, done, extra = {}) => p.schedule.push({ id: id('ms', 'M'), name, stage: stg, plan, done, reason: '', action: '', rule: '', ...extra });
    const pdmFrom = (p, r, { versions, closed, confirmed }) => {
      const tpl = PDM_TPL[p.field] || PDM_TPL['기타'];
      const bump = r() < 0.5;
      const indicators = tpl.rows.map((t, k) => {
        let end = null;
        if (closed && t.level !== 'Impact') {
          if (t.target <= 1) end = r() < 0.82 ? 1 : 0;
          else end = +(t.base + (t.target - t.base) * (0.68 + r() * 0.5)).toFixed(t.unit === '%' ? 1 : 0);
        }
        const target = t.level === 'Outcome' && bump && t.target > 1 ? round(t.target * 1.2, t.target >= 10 ? 5 : 1) : t.target;
        return { id: `I${k + 1}`, ...t, target, targets: target !== t.target ? { '제안 PDM': t.target } : null, end, baseDoc: !(t.level === 'Output' && k === tpl.rows.length - 1 && r() < 0.35), endDoc: closed };
      });
      return { goal: `${p.country} ${tpl.goal}`, act: tpl.act, versions, confirmed, regAt: confirmed ? versions.find(v => v.v === '확정 PDM').at : null, file: `${short(p.name)}_PDM.xlsx`, indicators, baseline: null, endline: null, tracking: [], eval: null };
    };

    /* 1) 공개 사업DB 119건 */
    window.SEED_PROJECTS.forEach(x => {
      const r = rng(hash(x.id));
      const p = base(x, {});
      p.migrated = true;
      p.createdAt = stamp('2026-09-01', 10, 0);
      let stage;
      if (x.e >= TY) stage = 'ONGOING';
      else stage = x.e >= 2023 && TY <= x.e + K.TRACK(x.tp) ? 'FOLLOWUP' : 'CLOSED';
      p.stage = stage;
      const contractDate = x.s === TY ? dt(TY, 3 + Math.floor(r() * 4), 2 + Math.floor(r() * 25)) : dt(x.s, 3 + Math.floor(r() * 4), 2 + Math.floor(r() * 25));
      p.startDate = addD(contractDate, 7 + Math.floor(r() * 7));
      p.endDate = dt(x.e, 12, 10 + Math.floor(r() * 18));
      p.contractAmt = x.ct_amt;
      p.orderAmt = x.pl_amt && x.pl_amt >= x.ct_amt ? x.pl_amt : round(x.ct_amt / (0.86 + r() * 0.12), 1e6);
      const vendor = pick(r, VENDORS) + (x.tp === '프로젝트' && r() < 0.6 ? ' 컨소시엄' : '');
      p.implementer = vendor;
      p.isPublic = true;
      if (!x.sp) p.qc.push('시행계획 분야 공란');
      if (x.pl_amt == null) p.qc.push('시행계획 예산 공란');
      if (x.sp && x.sp.includes('/')) p.qc.push('시행계획 분야 복수 표기');
      if (NONCOUNTRY.includes(x.ct)) p.qc.push(`국가 항목에 국가가 아닌 값(${x.ct})`);
      if (x.id === 'P2026-112') { p.owner = 'u04'; p.subOwner = 'u05'; }
      /* 추진경과: 공개 자료에 없는 발굴·예비·확정은 규정으로 계산한 연도(calc) */
      const H = (k, d, reason, calc = false, sub = '') => p.stageHist.push({ k, sub, d, by: p.owner, reason, calc });
      H('DISCOVERED', dt(x.s - 2, 1, 1), '사업 발굴 (공개 자료에 일자 없음 · N-2 계산)', true);
      H('PRELIM', dt(x.s - 1, 1, 1), '예비사업 · 심의 (N-1 계산)', true, '의결');
      H('CONFIRMED', dt(x.s - 1, 12, 1), '신규사업 확정 (계산)', true);
      H('CONTRACTED', contractDate, `계약 체결 (${vendor})`);
      H('ONGOING', p.startDate, '착수계 접수 및 사업 착수');
      if (['CLOSED', 'FOLLOWUP'].includes(stage)) H('CLOSED', p.endDate, '사업 종료 (종료평가·정산·인계)');
      if (stage === 'FOLLOWUP') H('FOLLOWUP', dt(x.e + 1, 1, 15), '추적조사 단계 (성과관리 지침 제26조 · 계산)', true);
      /* 입찰·계약 */
      const method = ['연수', '기획'].includes(x.tp) ? '일반경쟁입찰(적격심사)' : '제한경쟁입찰(협상에 의한 계약)';
      const nB = 2 + Math.floor(r() * 3);
      const pool = VENDORS.filter(v => !vendor.startsWith(v));
      const bidders = [];
      for (let b = 0; b < nB; b++) bidders.push({ name: b === 0 ? vendor : pick(r, pool), tech: +(b === 0 ? 72 + r() * 6 : 60 + r() * 13).toFixed(2), price: +(16.5 + r() * 3.2).toFixed(2) });
      bidders.forEach(b => (b.total = +(b.tech + b.price).toFixed(2)));
      bidders.sort((a, b2) => b2.total - a.total).forEach((b, k) => (b.rank = k + 1));
      p.bid = { notice: addD(contractDate, -50), method, orderAmt: p.orderAmt, bidders, indicators: { pcp: x.tp === '프로젝트', letter: true, fs: x.tp === '프로젝트' && r() < 0.7 }, winner: vendor, awardDate: addD(contractDate, -12), awardAmt: p.contractAmt };
      p.contract = { date: contractDate, amt: p.contractAmt, start: p.startDate, end: p.endDate, vendor, changes: [] };
      if (r() < 0.18) {
        const orig = round(p.contractAmt * (0.93 + r() * 0.04), 1e5);
        const cd = addD(contractDate, 120 + Math.floor(r() * 200));
        if (cd < T) { p.contract.changes.push({ date: cd, field: '계약금액', before: orig, after: p.contractAmt, reason: '과업범위 조정(현지조사 구간 확대)에 따른 1차 변경계약' }); p.contract.origAmt = orig; }
      }
      /* 일정 */
      if (stage === 'ONGOING') {
        const st = p.startDate, en = p.endDate, mid = addD(st, Math.floor(diffD(st, en) / 2));
        const late = r() < 0.22;
        [['착수보고회', addD(st, 30)], ['중간보고회', mid], ['성과평가위원회 (종료 1개월 전)', addD(en, -30), '성과평가위원회 지침 제8조'], ['준공 · 수원국 최종보고회 인계', en]].forEach(([n, d, rule], k) => {
          if (d < T) {
            if (late && k === 1) MS(p, n, 'ONGOING', d, null, { reason: pick(r, ['수원국 관계기관 협의 지연', '현지 정세 불안으로 현지조사 연기', '수원국 의견 회신 지연', '과업 범위 변경 협의 중']), action: pick(r, ['11월 중 수원국 실무협의 재개 후 일정 확정', '주재국 대사관 협조 요청, 12월 개최 목표', '수행기관 보완계획서 제출(11월 2주)']) });
            else MS(p, n, 'ONGOING', d, addD(d, Math.floor(r() * 4)), { rule: rule || '' });
          } else MS(p, n, 'ONGOING', d, null, { rule: rule || '' });
        });
      } else {
        MS(p, '최종보고서 제출', 'ONGOING', addD(p.endDate, -20), addD(p.endDate, -18));
        MS(p, '준공 · 수원국 최종보고회 인계', 'ONGOING', p.endDate, p.endDate);
      }
      /* 집행 */
      const span = Math.max(1, diffD(p.startDate, p.endDate));
      const prog = Math.min(1, Math.max(0, diffD(p.startDate, T) / span));
      const ratio = stage === 'ONGOING' ? Math.min(0.97, 0.3 + 0.7 * prog * (0.85 + r() * 0.15)) : 1;
      const total = p.contractAmt * ratio;
      const years = []; for (let y = x.s; y <= Math.min(x.e, TY); y++) years.push(y);
      const w = years.map((y, k) => (k === 0 ? 1.4 : 1)), ws = w.reduce((a, b) => a + b, 0);
      years.forEach((y, k) => {
        const amt = (total * w[k]) / ws, supply = amt / 1.1;
        const sh = [0.58 + (r() - 0.5) * 0.06, 0.27 + (r() - 0.5) * 0.04, 0.1, 0.05], ss = sh.reduce((a, b) => a + b, 0);
        const parts = sh.map(v => round((supply * v) / ss, 1000)); parts.push(round(amt - parts.reduce((a, b) => a + b, 0), 1000));
        const pay = k === 0 ? '선금 및 1차 기성' : y === x.e ? '준공금' : `${k + 1}차 기성`;
        const d = y === TY ? addD(T, -(8 + Math.floor(r() * 40))) : dt(y, 12, 12 + Math.floor(r() * 14));
        EXEC_ITEMS.forEach((it, j) => p.execs.push({ id: id('ex', 'E'), y, date: d < p.startDate ? p.startDate : d, item: it, amt: parts[j], desc: `${y}년 ${pay}`, vendor, file: j === 0 ? `${y}_${pay}_집행증빙.pdf` : '' }));
      });
      const sur = p.orderAmt - p.contractAmt;
      if (sur > 5e6 && r() < 0.72) {
        [['감리비', 30, '시범구축 구간 품질 확보를 위한 감리 용역'], ['추가 과업(사업비)', 40, '수원국 요청 추가 과업(현지 역량강화 워크숍)'], ['사후관리비', 20, '준공 후 1년 하자·운영 지원']].forEach(([it, ra, rs]) => {
          const amt = round((sur * ra) / 100, 1000);
          p.surplus.push({ item: it, ratio: ra, amt, actual: stage === 'ONGOING' ? round(amt * prog * 0.8, 1000) : round(amt * (0.9 + r() * 0.1), 1000), reason: rs });
        });
      }
      /* 문서 */
      Dc(p, r, '제안요청서', 'CONFIRMED', p.bid.notice, 'hwp'); Dc(p, r, '과업지시서', 'CONFIRMED', p.bid.notice, 'hwp'); Dc(p, r, '입찰공고문', 'CONFIRMED', p.bid.notice);
      Dc(p, r, '계약서', 'CONTRACTED', contractDate); Dc(p, r, '착수계', 'ONGOING', p.startDate); Dc(p, r, '착수보고서', 'ONGOING', addD(p.startDate, 30));
      Dc(p, r, '성과관리계획서(PDM)', 'ONGOING', addD(p.startDate, 45), 'xlsx');
      const midM = p.schedule.find(m => m.name === '중간보고회' && m.done); if (midM) Dc(p, r, '중간보고서', 'ONGOING', midM.done);
      if (stage !== 'ONGOING') { Dc(p, r, '최종보고서', 'CLOSED', addD(p.endDate, -18), 'pdf', true); Dc(p, r, '요약보고서', 'CLOSED', addD(p.endDate, -18), 'pdf', true); }
      /* 성과관리 (PDM · 기초선 · 종료선 · 추적조사 · 자체평가) */
      const closed = stage !== 'ONGOING';
      if ((stage === 'ONGOING' && r() < 0.75) || (closed && x.e >= 2019)) {
        const versions = [{ v: '확정 PDM', src: '계약 후 · 결재 승인', at: addD(p.startDate, 45) }];
        if (closed) versions.push({ v: '종료', src: '종료선 조사', at: addD(p.endDate, 60) < T ? addD(p.endDate, 60) : addD(T, -3) });
        p.perf = pdmFrom(p, r, { versions, closed, confirmed: true });
        p.perf.baseline = { date: addD(p.startDate, 40), agency: pick(r, SURVEYORS), summary: '사업 착수 시점 기준값 조사 완료. 지표별 측정방법 및 자료원 확정.', file: `${short(p.name)}_기초선조사보고서.pdf` };
        Dc(p, r, '기초선 조사보고서', 'ONGOING', p.perf.baseline.date);
        if (closed) {
          p.perf.endline = { date: versions[1].at, agency: pick(r, SURVEYORS), summary: '종료 시점 성과지표 측정 결과, 주요 산출물은 계획대로 완료되었으며 일부 성과지표는 수원국 후속조치에 따라 달성 시기가 연장될 것으로 예상됨.', file: `${short(p.name)}_종료선조사보고서.pdf` };
          Dc(p, r, '종료선 조사보고서', 'CLOSED', p.perf.endline.date);
          const evd = addD(p.endDate, 90) < T ? addD(p.endDate, 90) : addD(T, -2);
          p.perf.eval = { date: evd, items: EVAL_ITEMS.map(n => ({ n, s: 2 + Math.floor(r() * 2.6), c: '' })), opinion: '사업 목표 대비 산출물 완료도가 높고 수원국 주인의식이 확인됨. 운영예산 확보 및 후속 연계방안 마련이 지속가능성의 관건.', by: p.owner };
          Dc(p, r, '자체평가서', 'CLOSED', evd, 'hwp');
        }
      }
      /* 추적조사: 종료 후 매년 2월 보고 (프로젝트 5년 · 연수 1년 · 그 외 3년, 2023년 이후 종료분) */
      if (p.perf && closed && x.e >= 2023) {
        const tr = K.TRACK(x.tp);
        for (let k = 1; k <= tr; k++) {
          const due = dt(x.e + k, 2, 28);
          if (due >= T) break;
          const g =() => pick(r, ['●', '●', '●', '◐', '◐', '○']);
          const items = { keep: g(), use: g(), aftercare: g(), linkage: pick(r, ['-', '◐', '●']), settle: g(), need: pick(r, ['○', '◐', '●']), spread: g(), side: pick(r, ['없음', '없음', '긍정 1', '부정 1']), orders: r() < 0.3 ? 1 + Math.floor(r() * 2) : 0 };
          const d = dt(x.e + k, 2, 10 + Math.floor(r() * 15));
          p.perf.tracking.push({ id: id('tr', 'T'), round: k, due, status: '제출', date: d, baseDate: dt(x.e + k - 1, 12, 31), agency: vendor, items,
            summary: items.keep === '●' ? '핵심 성과지표 유지 확인. 수원국 예산으로 운영 지속.' : items.keep === '◐' ? '일부 시설 운영인력 부족으로 성과 유지 수준 저하. 기술지원 필요.' : '운영예산 미확보로 시스템 운영 중단. 사후관리 지원 검토 필요.', file: `${short(p.name)}_추적조사_${k}차.pdf` });
          Dc(p, r, '추적조사 보고서', 'FOLLOWUP', d);
          MS(p, `추적조사 ${k}차 보고서 제출`, 'FOLLOWUP', due, d, { rule: '성과관리 지침 제26조' });
        }
        const next = x.e + p.perf.tracking.length + 1;
        if (next <= x.e + tr) MS(p, `추적조사 ${next - x.e}차 보고서 제출`, 'FOLLOWUP', dt(next, 2, 28), null, { rule: '성과관리 지침 제26조' });
      }
      if (stage === 'ONGOING' && x.e === TY) MS(p, '추적조사 1차 보고서 제출', 'FOLLOWUP', dt(TY + 1, 2, 28), null, { rule: '성과관리 지침 제26조' });
      db.projects.push(p);
    });
    /* 올해 2월 추적조사 보고 — 시연용으로 미제출 2건 · 면제 1건 지정 */
    db.projects.flatMap(p => (p.perf ? p.perf.tracking : []).filter(t => t.due.startsWith(String(TY))).map(t => ({ p, t })))
      .sort((a, b) => hash(a.p.id) - hash(b.p.id)).slice(0, 3).forEach(({ p, t }, k) => {
        const m = p.schedule.find(s => s.name === `추적조사 ${t.round}차 보고서 제출`);
        p.docs = p.docs.filter(d => !(d.type === '추적조사 보고서' && d.at.startsWith(t.date)));
        Object.keys(t).forEach(key => !['id', 'round', 'due'].includes(key) && delete t[key]);
        if (k < 2) { t.status = '미제출'; if (m) Object.assign(m, { done: null, reason: '수행기관 보고서 제출 지연', action: '수행기관에 제출 독촉 공문 발송 (11월 1주)' }); }
        else { t.status = '면제'; t.exemptReason = '수원국 정세 불안으로 현지조사 불가 — 센터 면제 판단'; if (m) Object.assign(m, { done: t.due, action: '면제 (센터 판단)' }); }
      });

    /* 2) 공모·심의 시나리오 */
    const synth = (row, cohort) => {
      const [pid, nm, rg, ct, fd, tp, org, amt] = row;
      const extra = (cohort === 26 ? row[11] : row[10]) || {};
      const s = cohort === 26 ? 2028 : 2027;
      const x = { id: pid, nm, rg, ct, fd, tp, s, e: s + durOf(tp), pl_amt: amt, prev: extra.prev, desc: extra.desc };
      const p = base(x, extra);
      const r = rng(hash(pid));
      p.round = 1;
      p.prop = { year: cohort === 26 ? 2026 : 2025, org, orgName: org === '공공' ? AGENCY[fd] : pick(r, VENDORS), mode: extra.mode || (org === '공공' ? '공공기관 제안' : '민간 제안'), evidence: extra.ev || '수원국 요청공문' };
      p.proposer = p.prop.orgName;
      p.createdAt = stamp(cohort === 26 ? '2026-05-15' : '2025-05-14', 10, 0);
      if (!p.desc || p.desc.startsWith(ct + ' ' + fd)) p.desc = extra.desc || `${ct} ${fd} 분야 ${p.workType}. ${p.prop.mode}, 근거 서류: ${p.prop.evidence}.`;
      const E = (k, sub, d, reason, ext, rnd) => p.stageHist.push({ k, sub, d, by: p.owner, reason, ext: ext || null, round: rnd || p.round });
      const EX = (body, no, doc) => ({ body, no, doc });
      return { p, r, extra, E, EX };
    };
    S26.forEach(row => {
      const { p, r, extra, E, EX } = synth(row, 26);
      const [, , , , , , , , res, at, why] = row;
      if (extra.r1) {
        const o = extra.r1;
        p.rounds.push({ round: 1, year: 2025, result: '미선정', at: o.at, reason: o.why, snap: { name: o.nm, planAmt: o.amt, type: p.type, mode: o.mode, evidence: o.ev, desc: o.desc, startYear: 2027, endYear: 2027 + durOf(p.type) } });
        E('DISCOVERED', '접수', '2025-05-14', '2025년 공모 제안 접수 (1차)', EX('제안기관 (공모 제안서 제출)', '2025년 신규사업 공모', '공모제안서_1차.hwp'), 1);
        E('DISCOVERED', '고도화', '2025-06-11', '서류심사 통과', EX('국제개발협력센터 (공모 서류심사)', '2025년 서류심사'), 1);
        E('DISCOVERED', '위원회 상정', '2025-08-22', '고도화 완료', EX('고도화 전문기관', '고도화 분석보고서'), 1);
        E('REJECTED', '위원회', '2025-09-17', '미선정 — ' + o.why, EX('발굴 자문위원회', '2025년 제2차 발굴 자문위원회', '자문위원회_결과.pdf'), 1);
        p.round = 2;
        E('DISCOVERED', '접수', '2026-05-15', '재제안 접수 (2차) — LOI 확보 · 기자재 제외 · 수원기관 공동 기획', EX('제안기관 (공모 제안서 제출)', '2026년 신규사업 공모', '공모제안서_2차.hwp'));
      } else E('DISCOVERED', '접수', '2026-05-15', '2026년 공모 제안 접수', EX('제안기관 (공모 제안서 제출)', '2026년 신규사업 공모', '공모제안서.hwp'));
      const versions = [{ v: '제안 PDM', src: '공모 제안서', at: '2026-05-15' }];
      if (at === '서류심사') { p.stage = 'REJECTED'; p.sub = '서류심사'; E('REJECTED', '서류심사', '2026-06-12', '미선정 — ' + why, EX('국제개발협력센터 (공모 서류심사)', '2026년 서류심사 결과')); }
      else {
        E('DISCOVERED', '고도화', '2026-06-12', '서류심사 통과 → 고도화 대상', EX('국제개발협력센터 (공모 서류심사)', '2026년 서류심사 결과'));
        versions.push({ v: '수정 PDM', src: '고도화', at: '2026-08-25' });
        if (res === 'hold') { p.stage = 'HELD'; p.sub = '고도화'; E('HELD', '고도화', '2026-08-25', '보류 — ' + why, EX('고도화 전문기관 · 발굴 자문위원회', '고도화 중간 자문')); }
        else {
          E('DISCOVERED', '위원회 상정', '2026-08-25', '고도화 완료 → 자문위원회 상정', EX('고도화 전문기관', '고도화 분석보고서', '고도화_분석보고서.pdf'));
          if (res === 'ok') { p.stage = 'DISCOVERED'; p.sub = '선정'; E('DISCOVERED', '선정', '2026-09-18', '선정 — 2028년 시행 신규사업 후보', EX('발굴 자문위원회', '2026년 제2차 발굴 자문위원회', '자문위원회_결과.pdf')); }
          else { p.stage = 'REJECTED'; p.sub = '위원회'; E('REJECTED', '위원회', '2026-09-18', '미선정 — ' + why, EX('발굴 자문위원회', '2026년 제2차 발굴 자문위원회', '자문위원회_결과.pdf')); }
        }
      }
      p.perf = pdmFrom(p, r, { versions, closed: false, confirmed: false });
      Dc(p, r, '공모 제안서', 'DISCOVERED', '2026-05-15', 'hwp');
      if (versions.length > 1) Dc(p, r, '고도화 분석보고서', 'DISCOVERED', '2026-08-25');
      if (['선정', '위원회'].includes(p.sub)) Dc(p, r, '자문위원회 결과', 'DISCOVERED', '2026-09-18');
      if (p.stage === 'DISCOVERED') { MS(p, '사업계획서 보완 (고도화 결과 반영)', 'DISCOVERED', addD(T, 12 + Math.floor(r() * 8)), null); MS(p, '예비사업 편입', 'PRELIM', '2027-02-10', null); }
      if (p.stage === 'HELD') MS(p, '2차 자문회의 후 상정 여부 결정', 'HELD', addD(T, 22 + Math.floor(r() * 8)), null);
      db.projects.push(p);
    });
    S25.forEach(row => {
      const { p, r, E, EX } = synth(row, 25);
      const res = row[8], why = row[9];
      E('DISCOVERED', '접수', '2025-05-14', '2025년 공모 제안 접수', EX('제안기관 (공모 제안서 제출)', '2025년 신규사업 공모', '공모제안서.hwp'));
      const versions = [{ v: '제안 PDM', src: '공모 제안서', at: '2025-05-14' }];
      if (res === '미선정') { p.stage = 'REJECTED'; p.sub = '서류심사'; E('REJECTED', '서류심사', '2025-06-11', '미선정 — ' + why, EX('국제개발협력센터 (공모 서류심사)', '2025년 서류심사 결과')); }
      else {
        E('DISCOVERED', '고도화', '2025-06-11', '서류심사 통과 → 고도화 대상', EX('국제개발협력센터 (공모 서류심사)', '2025년 서류심사 결과'));
        E('DISCOVERED', '위원회 상정', '2025-08-22', '고도화 완료 → 자문위원회 상정', EX('고도화 전문기관', '고도화 분석보고서', '고도화_분석보고서.pdf'));
        E('DISCOVERED', '선정', '2025-09-17', '선정 — 2027년 시행 신규사업 후보', EX('발굴 자문위원회', '2025년 제2차 발굴 자문위원회', '자문위원회_결과.pdf'));
        E('PRELIM', '편입', '2026-02-10', '예비사업 편입 (센터 결재)');
        E('PRELIM', '상정', '2026-08-28', '국토교통 국제개발협력위원회 심의 상정 (센터 결재)');
        versions.push({ v: '수정 PDM', src: '고도화', at: '2025-08-22' });
        if (res === '의결') { p.stage = 'PRELIM'; p.sub = '의결'; E('PRELIM', '의결', '2026-09-25', '의결 — 외교부 사업시행계획서 제출 대상', EX('국토교통 국제개발협력위원회', '2026년 제3차 국토교통 국제개발협력위원회', '위원회_의결서.pdf')); }
        else { p.stage = 'HELD'; p.sub = '예비 심의'; E('HELD', '예비 심의', '2026-09-25', '보류 — ' + why, EX('국토교통 국제개발협력위원회', '2026년 제3차 국토교통 국제개발협력위원회', '위원회_의결서.pdf')); }
        Dc(p, r, '고도화 분석보고서', 'DISCOVERED', '2025-08-22'); Dc(p, r, '자문위원회 결과', 'DISCOVERED', '2025-09-17');
        Dc(p, r, '사업계획서', 'PRELIM', '2026-03-20', 'hwp'); Dc(p, r, '심의자료', 'PRELIM', '2026-08-28'); Dc(p, r, '위원회 의결서', 'PRELIM', '2026-09-25');
      }
      p.perf = pdmFrom(p, r, { versions, closed: false, confirmed: false });
      Dc(p, r, '공모 제안서', 'DISCOVERED', '2025-05-14', 'hwp');
      if (p.sub === '의결') { MS(p, '외교부 사업시행계획서 제출', 'PRELIM', '2026-10-15', '2026-10-14'); MS(p, '국제개발협력위원회 신규사업 확정', 'CONFIRMED', '2027-01-22', null); MS(p, '조달계획 국토부 보고', 'CONFIRMED', '2027-02-15', null); }
      if (p.stage === 'HELD') { MS(p, '수원국 우선순위 확인 공문 회신', 'HELD', addD(T, -6), null, { reason: '수원국 정부 조직 개편으로 회신 지연', action: '주재국 대사관을 통해 11월 중 재요청' }); MS(p, '재상정 여부 결정', 'HELD', addD(T, 40), null); }
      db.projects.push(p);
    });

    /* 연계 정보 */
    const P_ = idv => db.projects.find(p => p.id === idv);
    db.projects.forEach(p => { if (p.prevId && P_(p.prevId)) P_(p.prevId).nextIds.push(p.id); });

    /* 변경 이력 */
    const HIST = (pid, cat, label, b, a, by, at, ap = null) => db.history.push({ id: id('h', 'H'), pid, cat, label, b, a, by, at, ap });
    db.projects.forEach(p => {
      const r = rng(hash(p.id + 'h'));
      if (p.migrated) HIST(p.id, '기본정보', '사업 등록', '', '기존자료 이관(공개 사업DB 엑셀)', 'u09', stamp('2026-09-01', 10, 0));
      else HIST(p.id, '기본정보', '사업 등록', '', `공모 제안 접수 (${p.prop.year}년 공모)`, p.owner, p.createdAt);
      p.stageHist.forEach((h, k) => {
        if (k === 0 || h.calc) return;
        const prev = p.stageHist[k - 1];
        const lab = s => K.stageName(s.k) + (s.sub ? ` · ${s.sub}` : '');
        HIST(p.id, h.ext ? '외부 결정' : '추진단계', h.ext ? `${h.ext.body}` : '추진단계', lab(prev), lab(h) + (h.round > 1 ? ` (${h.round}차)` : ''), h.by, stamp(h.d, 14, 10));
      });
      p.contract && p.contract.changes.forEach(c => HIST(p.id, '계약', c.field, c.before, c.after, p.owner, stamp(c.date, 16, 20)));
      if (r() < 0.1) HIST(p.id, '기본정보', '부담당자', uname(p.owner === 'u04' ? 'u05' : 'u04'), uname(p.subOwner), 'u09', stamp(addD(T, -40 - Math.floor(r() * 30)), 11, 5));
    });
    db.history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

    /* 결재 */
    const line = (team, done = 0, status = 'PENDING') => {
      const Ln = [{ uid: TEAM_LEAD[team], label: '팀장' }, { uid: 'u01', label: '센터장' }].map(s => ({ ...s, status: 'WAIT', at: null, comment: '' }));
      for (let k = 0; k < Ln.length; k++) { if (k < done) Ln[k].status = 'APPROVED'; else if (k === done) Ln[k].status = status; }
      return Ln;
    };
    const AP = o => { const a = { id: 'AP-' + TY + '-' + String(db.seq.ap++).padStart(4, '0'), attach: [], note: '', payload: null, ...o }; db.approvals.push(a); return a; };
    const fmtW = v => (v == null ? '-' : Math.round(v).toLocaleString('ko-KR') + '원');
    const pa = P_('P2026-112');
    if (pa) {
      const ne = addD(pa.endDate, 90), nd = pa.desc + ' 시범구간 2개소(수도권 간선축) 포함.';
      AP({ type: 'EDIT', pid: pa.id, title: '사업기간 연장 및 사업개요 수정', drafter: 'u04', createdAt: stamp(addD(T, -1), 15, 20), status: 'PENDING', step: 0, line: line(pa.team),
        note: '수원국 우기(11~3월) 현지조사 제약으로 종료일 3개월 연장 요청. 사업개요에 시범구간 명시.', attach: ['수원국_기간연장요청공문.pdf'],
        changes: [{ path: 'endDate', label: '사업기간(종료일)', bv: pa.endDate, av: ne, b: pa.endDate, a: ne }, { path: 'desc', label: '사업개요', bv: pa.desc, av: nd, b: pa.desc, a: nd }] });
    }
    const pb = db.projects.find(p => p.owner === 'u05' && p.stage === 'ONGOING' && p.contractAmt > 2e9) || db.projects.find(p => p.owner === 'u05' && p.stage === 'ONGOING');
    if (pb) {
      const na = round(pb.contractAmt * 1.08, 1e5);
      AP({ type: 'BUDGET', pid: pb.id, title: '계약금액 증액(예산변경)', drafter: 'u05', createdAt: stamp(addD(T, -2), 10, 42), status: 'PENDING', step: 0, line: line(pb.team),
        note: '수원국 요청에 따른 시범구간 연장(2.4km → 3.1km)으로 직접경비 증가. 낙찰차액 범위 내 증액.', attach: ['변경계약_산출내역서.xlsx', '수원국_구간연장요청.pdf'],
        changes: [{ path: 'contractAmt', label: '계약금액', bv: pb.contractAmt, av: na, b: fmtW(pb.contractAmt), a: fmtW(na) }] });
    }
    const pc = db.projects.find(p => p.team === '사업2팀' && p.stage === 'ONGOING' && !p.perf);
    if (pc) {
      const r = rng(hash(pc.id + 'pdm'));
      const pdm = pdmFrom(pc, r, { versions: [{ v: '확정 PDM', src: '계약 후 · 결재 승인', at: T }], closed: false, confirmed: true });
      pdm.baseline = { date: addD(T, -12), agency: SURVEYORS[0], summary: '기초선 조사 완료', file: '기초선조사보고서.pdf' };
      const Ln = line(pc.team, 1); Ln[0].at = stamp(addD(T, -1), 9, 12); Ln[0].comment = '지표 측정방법 적정';
      AP({ type: 'PDM', pid: pc.id, title: 'PDM 기초선 정보 등록 (확정 PDM)', drafter: pc.owner, createdAt: stamp(addD(T, -3), 17, 5), status: 'PENDING', step: 1, line: Ln,
        changes: pdm.indicators.map(i => ({ path: 'perf', label: `[${i.level}] ${i.name}`, b: '-', a: `기준 ${i.base} → 목표 ${i.target}${i.unit}` })), payload: { pdm }, attach: ['PDM_기초선_v1.xlsx', '기초선조사보고서.pdf'] });
    }
    const pr = P_('P2026-004');
    if (pr) {
      const f = { name: '케냐 나이로비 BRT 노선 타당성조사 및 운영역량 강화(2차)', planAmt: 1.6e9, type: pr.type, mode: '수원기관 공동 기획', evidence: 'LOI 확보 · 수원국 요청공문', desc: '나이로비 BRT 2개 노선 타당성조사 및 운영기관 역량강화. 1차 미선정 사유(LOI 부족) 보완.', startYear: 2029, endYear: 2030 };
      const C = [['name', '사업명'], ['planAmt', '제안 사업비'], ['mode', '추진방식'], ['evidence', '근거 서류'], ['desc', '사업내용'], ['startYear', '시행연도']];
      AP({ type: 'REPROPOSE', pid: pr.id, title: '재제안 접수 (2차) — 2027년 공모', drafter: pr.owner, createdAt: stamp(addD(T, -1), 10, 5), status: 'PENDING', step: 0, line: line(pr.team),
        note: '1차 미선정 사유(수원국 협력의지 근거 부족)를 LOI 확보로 보완하여 2027년 공모에 같은 사업ID 2차로 재제안', attach: ['케냐_LOI.pdf', '공모제안서_2차.hwp'],
        payload: { fields: f, year: 2027 },
        changes: C.map(([k, l]) => { const bv = k === 'mode' || k === 'evidence' ? pr.prop[k] : pr[k]; const fm = v => (k === 'planAmt' ? fmtW(v) : String(v ?? '-')); return { path: k, label: l, bv, av: f[k], b: fm(bv), a: fm(f[k]) }; }).filter(c => c.b !== c.a) });
    }
    const newP = { id: 'P2026-024', name: '캄보디아 시엠립 관광도시 스마트 교통체계 기본계획 수립', country: '캄보디아', region: '동남아', type: '개발컨설팅', field: 'ITS', workType: '마스터플랜 수립', crs: '교통', startYear: 2028, endYear: 2029, planAmt: 1300000000, owner: 'u04', subOwner: 'u05', proposer: AGENCY.ITS, orderer: '국토교통부', propOrg: '공공', mode: '기획연구 발굴', evidence: '수원국 요청공문', desc: '시엠립 관광권 교통수요 분석 및 스마트 교통체계 기본계획 수립' };
    {
      const Ln = line('사업1팀', 0, 'RETURNED'); Ln[0].at = stamp(addD(T, -4), 16, 40); Ln[0].comment = '사업비 산출 근거(인건비·직접경비 내역) 첨부 후 재상신 바랍니다.';
      AP({ type: 'NEW', pid: null, title: `신규 발굴 등록 — ${newP.id} · 1차 ${newP.name}`, drafter: 'u04', createdAt: stamp(addD(T, -5), 14, 2), status: 'RETURNED', step: 0, line: Ln, payload: { project: newP },
        changes: [['id', '사업ID', `${newP.id} · 1차 (접수 시 부여)`], ['name', '사업명', newP.name], ['country', '국가', newP.country], ['type', '사업유형', newP.type], ['field', '분야', newP.field], ['planAmt', '제안 사업비', fmtW(newP.planAmt)], ['startYear', '사업기간', '2028 ~ 2029']].map(([path, label, a]) => ({ path, label, bv: null, av: null, b: '-', a })) });
    }
    const pe = db.projects.find(p => (p.owner === 'u06' || p.owner === 'u07') && p.stage === 'ONGOING');
    if (pe) {
      const Ln = line(pe.team, 0, 'SUPPLEMENT'); Ln[0].at = stamp(addD(T, -2), 13, 15); Ln[0].comment = '수행기관 변경 사유 및 발주처 협의 공문을 함께 첨부해 주세요.';
      const nv = pe.implementer.replace(' 컨소시엄', '') + ' 외 1개사';
      AP({ type: 'EDIT', pid: pe.id, title: '수행기관 표기 및 부담당자 변경', drafter: pe.owner, createdAt: stamp(addD(T, -3), 9, 50), status: 'SUPPLEMENT', step: 0, line: Ln,
        changes: [{ path: 'implementer', label: '수행기관', bv: pe.implementer, av: nv, b: pe.implementer, a: nv }] });
    }
    /* 완료된 결재 */
    db.projects.filter(p => p.migrated && p.startYear === TY).slice(0, 4).forEach(p => {
      const Ln = line(p.team, 2); Ln[0].at = stamp(addD(p.contract.date, 1), 10, 5); Ln[1].at = stamp(addD(p.contract.date, 2), 15, 30);
      AP({ type: 'CONTRACT', pid: p.id, title: '입찰·낙찰 결과 및 계약정보 등록', drafter: p.owner, createdAt: stamp(p.contract.date, 17, 10), status: 'APPROVED', step: 2, line: Ln,
        changes: [{ path: 'contractAmt', label: '계약금액', b: '-', a: fmtW(p.contractAmt) }, { path: 'implementer', label: '수행기관(낙찰업체)', b: '-', a: p.implementer }] });
    });
    db.projects.filter(p => p.contract && p.contract.changes.length && p.stage === 'ONGOING').slice(0, 3).forEach(p => {
      const c = p.contract.changes[0]; const Ln = line(p.team, 2); Ln[0].at = stamp(addD(c.date, -2), 11, 0); Ln[1].at = stamp(addD(c.date, -1), 16, 0);
      const ap = AP({ type: 'BUDGET', pid: p.id, title: '계약금액 변경(1차 변경계약)', drafter: p.owner, createdAt: stamp(addD(c.date, -3), 10, 0), status: 'APPROVED', step: 2, line: Ln, note: c.reason,
        changes: [{ path: 'contractAmt', label: '계약금액', bv: c.before, av: c.after, b: fmtW(c.before), a: fmtW(c.after) }] });
      const h = db.history.find(h => h.pid === p.id && h.cat === '계약'); if (h) h.ap = ap.id;
    });
    db.projects.filter(p => p.prop && p.prop.year === 2025 && p.stageHist.some(h => h.sub === '편입')).forEach(p => {
      ['편입', '상정'].forEach(sb => {
        const h = p.stageHist.find(x => x.sub === sb); const Ln = line(p.team, 2); Ln[0].at = stamp(addD(h.d, -1), 11, 0); Ln[1].at = stamp(h.d, 9, 30);
        const ap = AP({ type: 'STAGE', pid: p.id, title: sb === '편입' ? '예비사업 편입' : '국토교통 국제개발협력위원회 심의 상정', drafter: p.owner, createdAt: stamp(addD(h.d, -2), 15, 0), status: 'APPROVED', step: 2, line: Ln,
          changes: [{ path: 'stage', label: '추진단계', b: sb === '편입' ? '발굴 · 선정' : '예비 · 편입', a: `예비 · ${sb}` }] });
        const hh = db.history.find(x => x.pid === p.id && x.a.startsWith(`예비 · ${sb}`)); if (hh) hh.ap = ap.id;
      });
    });
    db.projects.filter(p => p.stage === 'FOLLOWUP' && p.perf && p.perf.eval).slice(0, 4).forEach(p => {
      const d = p.perf.eval.date; const Ln = line(p.team, 2); Ln[0].at = stamp(addD(d, 2), 10, 0); Ln[1].at = stamp(addD(d, 4), 14, 0);
      AP({ type: 'EVAL', pid: p.id, title: '자체평가 결과 등록', drafter: p.owner, createdAt: stamp(d, 15, 0), status: 'APPROVED', step: 2, line: Ln, changes: [{ path: 'perf', label: '자체평가', b: '-', a: '평가 6개 항목 등록' }] });
    });
    db.approvals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    /* 알림 */
    const N = (to, kind, text, link, at) => db.notifications.push({ id: id('n', 'N'), to, kind, text, link, at, read: false });
    db.approvals.forEach(a => {
      const cur = a.line.find(s => s.status === 'PENDING');
      if (a.status === 'PENDING' && cur) N(cur.uid, '결재', `[결재 요청] ${uname(a.drafter)} — ${a.title}`, `#/approvals?open=${a.id}`, a.createdAt);
      if (a.status === 'RETURNED') N(a.drafter, '반려', `[반려] ${a.title} — ${a.line.find(s => s.status === 'RETURNED').comment}`, `#/approvals?open=${a.id}`, a.line[0].at);
      if (a.status === 'SUPPLEMENT') N(a.drafter, '보완', `[보완요청] ${a.title}`, `#/approvals?open=${a.id}`, a.line[0].at);
    });
    db.projects.forEach(p => p.schedule.forEach(m => {
      if (m.done) return;
      const dd = diffD(T, m.plan);
      if (dd >= 0 && dd <= 7) N(p.owner, '일정', `[일정 D-${dd}] ${m.name} — ${p.name}`, `#/projects/${p.id}?tab=schedule`, stamp(T, 8, 0));
      if (dd < 0) N(p.owner, '지연', `[일정 지연 ${-dd}일] ${m.name} — ${p.name}`, `#/projects/${p.id}?tab=schedule`, stamp(T, 8, 0));
    }));
    db.notifications.sort((a, b) => (a.at < b.at ? 1 : -1));
    db.notifications.forEach(n => db.mails.push({ at: n.at, to: n.to, ch: '이메일', subj: n.text, ok: true }));

    /* 접속 로그 */
    const lr = rng(77);
    const BROWSERS = ['Chrome 141 / Windows 11', 'Edge 141 / Windows 11', 'Whale 4.3 / Windows 10', 'Safari 19 / macOS'];
    const MENU_N = K.MENUS.filter(m => m.k);
    for (let d = 30; d >= 0; d--) {
      const day = addD(T, -d), wd = parse(day).getDay();
      if (wd === 0 || wd === 6) continue;
      users.forEach(u => {
        if (lr() < 0.15) return;
        const h = 8 + Math.floor(lr() * 2), mi = Math.floor(lr() * 59);
        const ip = `10.21.${u.team === '정보화지원실' ? 30 : 12}.${40 + parseInt(u.id.slice(1))}`, br = BROWSERS[parseInt(u.id.slice(1)) % 3];
        if (lr() < 0.04) db.logs.push({ at: stamp(day, h, Math.max(0, mi - 2)), uid: u.id, ip, br, kind: '접속', act: '로그인 실패(비밀번호 오류)', menu: '' });
        db.logs.push({ at: stamp(day, h, mi), uid: u.id, ip, br, kind: '접속', act: '로그인', menu: '' });
        const n = 2 + Math.floor(lr() * 6);
        for (let k = 0; k < n; k++) { const m = u.role === 'ADMIN' ? pick(lr, MENU_N) : pick(lr, MENU_N.slice(0, 16)); db.logs.push({ at: stamp(day, h + 1 + k, Math.floor(lr() * 59)), uid: u.id, ip, br, kind: '메뉴', act: '화면 조회', menu: m.n }); }
        db.logs.push({ at: stamp(day, 17 + Math.floor(lr() * 2), Math.floor(lr() * 59)), uid: u.id, ip, br, kind: '접속', act: '로그아웃', menu: '' });
        u.lastLogin = stamp(day, h, mi);
      });
    }
    db.history.forEach(h => { if (h.at >= stamp(addD(T, -30))) db.logs.push({ at: h.at, uid: h.by, ip: '10.21.12.' + (40 + parseInt(String(h.by).slice(1) || 0)), br: BROWSERS[0], kind: '기능', act: `${h.cat} — ${h.label}`, menu: '사업 상세', pid: h.pid }); });
    db.logs.sort((a, b) => (a.at < b.at ? 1 : -1));

    /* 성과 환류 과제 (예시) */
    const fp = db.projects.filter(p => p.stage === 'FOLLOWUP' && p.perf && p.perf.tracking.some(t => t.status === '제출'));
    [['운영인력 이직으로 산출물 활용 저하 → 사후관리 계획에 인력 유지 조건 추가', '수행체계 보완', '이행 중'], ['후속 수요(시스템 고도화) 확인 → 후속사업 발굴 후보', '신규사업 기획', '후보 등록 대기'], ['사후관리 이행률 저조 시행기관 → 차기 성과평가·기술평가 반영', '시행기관 환류', '결과 보고'], ['추적조사 항목 해석 편차 → 입력 기준표 배포', '사업관리 개선', '완료']]
      .forEach(([task, use, st], k) => db.fbTasks.push({ id: id('fb', 'F'), pid: (fp[k * 3] || fp[0] || {}).id || null, task, use, status: st, by: 'u06', at: stamp(addD(T, -60 + k * 9), 10, 0) }));

    /* 홈페이지 관리자 · 알림 · 오픈 API 상태 */
    const pub = db.projects.filter(p => p.isPublic);
    db.hp = { shown: { n: pub.length, amt: pub.reduce((s, p) => s + (p.contractAmt || 0), 0) }, at: '2026-09-29 18:00', best: [], banners: [1, 1], popup: 1, menuHide: {}, hist: [] };
    db.noti = {
      rules: [
        { id: 'ap', ev: '결재 상신·승인·반려·보완요청', when: '즉시', to: '기안자 · 다음 결재권자', on: true },
        { id: 'd7', ev: '주요 일정 도래 (예정일)', when: 'D-7', to: '사업 담당자 (주·부)', on: true },
        { id: 'd1', ev: '주요 일정 도래 (예정일)', when: 'D-1', to: '사업 담당자 (주·부)', on: true },
        { id: 'late', ev: '일정 지연 (예정일 경과·미완료)', when: '매일 08:00', to: '사업 담당자 · 팀장', on: true },
        { id: 'trk', ev: '추적조사 보고 (매년 2월)', when: '1월 15일 · 2월 15일', to: '사업 담당자 · 수행기관', on: true, heart: 1 },
        { id: 'acl', ev: '사업 권한 부여·회수', when: '즉시', to: '대상 사용자', on: true },
      ],
      popups: [
        { id: 'pp1', title: '사업DB 관리시스템 시범운영 안내', body: '시범운영 기간 중 오류·개선 의견은 고객소리함으로 보내 주세요. 접수된 의견은 고도화 기간에 반영합니다.', from: addD(T, -10), to: addD(T, 20), on: true, link: '#/dashboard' },
        { id: 'pp2', title: '정기 서버 점검 안내 (11.8 토 02:00~06:00)', body: '점검 시간에는 접속이 제한됩니다.', from: addD(T, 3), to: addD(T, 9), on: true, link: '' },
      ],
    };
    db.api = { pub: { id: 1, name: 1, country: 1, region: 1, field: 1, type: 1, period: 1, amount: 1 }, keys: [{ org: '(예시) 국책연구기관 A', key: 'k-3f9a••••', limit: 1000, today: 214, on: true }, { org: '(예시) 대학 연구소 B', key: 'k-81cd••••', limit: 1000, today: 37, on: true }], calls: [] };

    /* 공통 코드 */
    const C = (arr, map = x => ({ cd: x, nm: x })) => arr.map((x, k) => ({ use: true, ...map(x, k), ord: k + 1 }));
    const countries = [...new Set(db.projects.map(p => p.country))].sort((a, b) => a.localeCompare(b, 'ko'));
    db.codes = [
      { grp: 'country', nm: '국가', codes: C(countries, x => ({ cd: COUNTRY_EN[x] ? COUNTRY_EN[x].slice(0, 3).toUpperCase() : 'ETC', nm: x, ext: `${(db.projects.find(p => p.country === x) || {}).region || ''} · ${incomeOf(x)}`, use: !NONCOUNTRY.includes(x) })) },
      { grp: 'region', nm: '지역', codes: C(['동남아', '서남아', '중앙아', '아시아', '중동', '아프리카', '북아프리카', '중남미', '동유럽', '유라시아'], x => ({ cd: x, nm: x, ext: CONTINENT[x] })) },
      { grp: 'field', nm: '분야', codes: C(FIELDS, x => ({ cd: x, nm: x, ext: TEAM_OF_FIELD[x] })) },
      { grp: 'workType', nm: '공종', codes: C(WORKTYPES) },
      { grp: 'type', nm: '사업유형', codes: C(['프로젝트', '개발컨설팅', '기획', '연수']) },
      { grp: 'crs', nm: '시행계획 분야', codes: C(['교통', '공공행정', '교육', '도시개발', '산업', '기타(지역개발)', '기타']) },
      { grp: 'stage', nm: '추진단계', codes: C(K.STAGES, x => ({ cd: x.k, nm: x.n, ext: x.y })) },
      { grp: 'docType', nm: '문서유형', codes: C(DOC_TYPES) },
      { grp: 'execItem', nm: '집행항목', codes: C(EXEC_ITEMS) },
      { grp: 'surplusItem', nm: '낙찰차액 활용항목', codes: C(SURPLUS_ITEMS) },
    ].map(g => ({ ...g, codes: g.codes.map((c, k) => ({ ...c, use: c.use !== false, cd: g.grp === 'country' ? c.cd + String(k + 1).padStart(2, '0') : c.cd })) }));
    return db;
  };
})();
