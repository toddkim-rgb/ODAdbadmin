/* 홈페이지 관리자 (SFR-015 홈페이지관리자 개편) — 사업DB 관리와 분리, 로그인·권한(SFR-005)만 공유
   메뉴·게시판 주소·게시물 제목은 로드맵 시안에 정리된 현행 홈페이지 값(2026-09-30 확인), 게시기간·노출 값은 예시 */
(function (A) {
  const { esc, num, U } = A;
  const HP_POSTS = [
    ['사업산출물 · 최종보고서', '우즈베키스탄 국가공간정보 통합역량강화체계 수립 사업 최종보고서', '2026-07-01', 'P2023-087', '사업명 일치 · 본문 계약금액 42.315억원 = 사업DB 4,231,500,000원', false],
    ['사업산출물 · 성과보고서', '우즈베키스탄 국가공간정보 통합역량강화체계 수립 사업 성과보고서', '2026-07-01', 'P2023-087', '같은 사업의 보고서가 게시물 4건으로 따로 등록 (최종보고서 2건 포함)', true],
    ['사업산출물 · 요약보고서', '우즈베키스탄 국가공간정보 통합역량강화체계 수립 사업 요약보고서', '2026-07-01', 'P2023-087', '', false],
    ['우수사업 (국문 · 영문 2건)', '엘살바도르 태평양철도 타당성조사 사업', '2026-02-09', 'P2024-091', '사업명 띄어쓰기 (타당성조사 / 타당성 조사) · 본문 계약금액 14.83억원 / 사업DB 1,483,900,000원', true],
    ['우수사업 (국문 · 영문 2건)', '라오스 도로 건설 및 관리 기반 자립화 사업', '2025-12-17', 'P2021-071', '사업명 띄어쓰기 2곳 (도로 건설 / 도로건설 · 관리 기반 / 관리기반)', true],
  ];
  const HP_MENU = [
    ['기획/발굴', [['소개', '현행'], ['기본계획 & 종합시행계획', '현행'], ['절차', '현행'], ['공지사항', '현행']], 'SFR-009'],
    ['조달', [['소개', '현행'], ['절차', '현행'], ['공지사항', '현행']], 'SFR-010'],
    ['성과/평가', [['소개', '현행'], ['사업산출물', '사업DB 연계'], ['우수사업', '사업DB 연계']], 'SFR-011'],
    ['사업DB', [['총괄 현황', '사업DB 연계'], ['지역별 현황', '사업DB 연계'], ['국가별 현황', '사업DB 연계'], ['상세검색', '사업DB 연계']], 'SFR-012'],
    ['법령/지침', [['국제개발협력기본법', '통합'], ['국제개발협력통합평가지침', '통합'], ['해외건설촉진법', '통합'], ['국토교통부 관련 법령', '통합'], ['해외건설협회 관련 지침', '통합']], 'SFR-013'],
    ['센터안내', [['설립배경', '현행'], ['조직도', '현행'], ['주요업무', '현행'], ['알림마당', '현행'], ['연혁', '신규'], ['찾아오시는 길', '신규']], 'SFR-014'],
  ];
  const HP_BOARDS = [
    ['기획/발굴 · 기본계획 & 종합시행계획', '/board/planList', '연도별 목록 · 파일 다운로드 (현행 연도 2011 · 2016 · 2021 · 2026)', 'SFR-009'],
    ['기획/발굴 · 공지사항', '/board/planNoticeList', '등록 · 수정 · 삭제 · 첨부', 'SFR-009'],
    ['조달 · 공지사항', '/board/supportNoticeList', '등록 · 수정 · 삭제 · 첨부. OCIS가 이 주소로 링크하므로 개편 후에도 주소 유지', 'SFR-010'],
    ['센터안내 · 알림마당', '/board/centerNoticeList', '등록 · 수정 · 삭제 · 첨부 · 메인 공지 노출 지정', 'SFR-008'],
    ['법령/지침 · 자료', '/board/lawList + 정적 화면 4개', '하나의 자료 목록으로 통합 · 유형(법령 · 지침 · 서식) 지정 · 첨부 · 메인 공지 연동', 'SFR-013'],
  ];
  const BANNERS = [['2028년 시행 국토교통 ODA 신규 제안사업 공모', '/board/centerNoticeView?bbsId=900&sn=907', '2026-05-04 게시', '5.4 ~ 6.30'], ['「2028년 시행 국토교통 ODA 신규사업 공모 설명회 및 성과공유 세미나」발표자료 공유', '/board/centerNoticeView?bbsId=900&sn=905', '2026-04-30 게시', '4.30 ~ 5.31']];
  const TABS = [['link', '사업DB 연계', 'SFR-011·012·015'], ['main', '메인 · 배너', 'SFR-008'], ['pop', '팝업', 'SFR-006'], ['board', '게시판 · 콘텐츠', 'SFR-009·010·013·014'], ['menu', '메뉴 · 파일', 'SFR-015']];
  const tg = (attr, on, a = '노출', b = '숨김') => `<label class="row small"><input type="checkbox" ${attr} ${on ? 'checked' : ''}> ${on ? a : b}</label>`;

  A.page('/homepage', { menu: 'homepage', title: '홈페이지 관리자' }, view => {
    const H = A.db.hp;
    const st = (A.state.hp = A.state.hp || { tab: 'link' });
    const canU = A.can('homepage', 'u');
    const log = (act, tgt) => { H.hist.unshift({ at: U.nowStamp(), by: A.me().id, act, tgt }); A.log('기능', `홈페이지 관리 — ${act} ${tgt}`); };
    view.innerHTML = `${A.ph('홈페이지 관리자', '현행 홈페이지 관리자(ODA 관리자) 개편 · 사업DB 관리시스템과 메뉴를 분리하고 로그인·권한만 공유', '', 'SFR-015')}
      <div class="exbar">제안요청서 SFR-015 "홈페이지관리자 개편"은 <b>현행 홈페이지 관리자를 개편</b>하는 과업입니다 (과업 범위 가. "홈페이지 관리자 수정", "ODA 홈페이지 및 ODA 관리자와 연계"). <b>메뉴 23개 · 게시판 주소 · 게시물 제목은 현행 홈페이지 실제 값</b>(2026-09-30 확인), 게시기간·노출 값은 예시입니다.</div>
      <div class="tabs">${TABS.map(([k, n, r]) => `<button data-t="${k}" class="${k === st.tab ? 'on' : ''}">${n} <span class="muted small">${r}</span></button>`).join('')}</div><div id="hb" class="stack"></div>`;
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { st.tab = b.dataset.t; A.render(); }));
    const hb = A.$('#hb', view);
    if (st.tab === 'link') {
      const pubs = A.projects().filter(p => p.isPublic);
      const dn = pubs.length, da = pubs.reduce((s, p) => s + (p.contractAmt || 0), 0);
      const okN = dn === H.shown.n, okA = da === H.shown.amt;
      const recent = A.projects().filter(p => p.contract).sort((a, b) => b.startYear - a.startYear || b.id.localeCompare(a.id)).slice(0, 8);
      hb.innerHTML = `<div class="grid2">
        <div class="card"><div class="hd"><h3>반영 현황 · 대사</h3><span class="note">SFR-012 "등록·승인된 데이터 기준으로 자동 연계 반영"</span></div><div class="bd stack" style="gap:10px">
          <div class="r0flow"><span>결재 승인 (확정본)</span><i>›</i><span>공개 지정</span><i>›</i><span class="on">공개 조회용 집계</span><i>›</i><span>홈페이지 사업DB 4개 화면 · 오픈 API</span></div>
          <table class="tbl"><thead><tr><th>항목</th><th class="num">사업DB 공개 대상 (지금)</th><th class="num">홈페이지 표시 (마지막 반영)</th><th>판정</th></tr></thead><tbody>
            <tr><td>사업 수</td><td class="num">${dn}건</td><td class="num">${H.shown.n}건</td><td>${okN ? '<span class="b ok"><span class="ic">✓</span>일치</span>' : '<span class="b warn"><span class="ic">▲</span>불일치 · 반영 대기</span>'}</td></tr>
            <tr><td>계약금액 합계</td><td class="num">${num(da)}원</td><td class="num">${num(H.shown.amt)}원</td><td>${okA ? '<span class="b ok"><span class="ic">✓</span>일치</span>' : '<span class="b warn"><span class="ic">▲</span>불일치 · 반영 대기</span>'}</td></tr></tbody></table>
          <div class="row"><span class="small muted">마지막 반영 <b class="mono">${H.at}</b></span><span class="sp" style="flex:1"></span>${canU ? `<button class="btn ${okN && okA ? '' : 'pri'}" id="hp-go" ${okN && okA ? 'disabled' : ''}>홈페이지에 반영</button>` : ''}</div>
          <div class="small muted">처음 값은 공개 사업DB 119건 실제 값입니다. 오른쪽에서 사업을 비공개로 바꾸면 반영 전까지 불일치로 표시됩니다. 개통 검수와 정기 대사의 기준은 "같은 조건에서 관리 DB = 홈페이지 = 엑셀"입니다.</div></div></div>
        <div class="card"><div class="hd"><h3>사업별 공개 지정</h3><span class="note">공개 가능한 사업정보와 내부 관리정보 구분 · 최근 착수 8건</span></div>
          <div class="tw"><table class="tbl"><thead><tr><th>사업ID</th><th>사업명</th><th>착수</th><th>홈페이지</th></tr></thead><tbody>
          ${recent.map(p => `<tr><td class="mono small nowrap">${p.id}</td><td class="small">${esc(p.name)}</td><td class="mono small">${p.startYear}</td><td>${canU ? tg(`data-pub="${p.id}"`, p.isPublic, '공개', '비공개') : p.isPublic ? '공개' : '비공개'}</td></tr>`).join('')}
          </tbody></table></div><div class="bd small muted" style="padding-top:8px">비공개로 바꾸면 홈페이지 사업DB 화면 · 통계 · 오픈 API와 연결 게시물의 사업정보 표시에서 빠집니다. 공개 항목(사업명·국가·금액 등)은 오픈 API 공개 항목 설정을 같이 씁니다.</div></div></div>
        <div class="card"><div class="hd"><h3>성과/평가 게시물 ↔ 사업ID 연결</h3><span class="note">SFR-011 "사업DB 관리시스템에 등록된 성과 데이터와 연계하여 자동 반영" · 우수사업 선정 결과 등록</span></div>
          <div class="tw"><table class="tbl"><thead><tr><th>현행 게시판 · 유형</th><th>현행 게시물 제목 · 게시일</th><th>연결 사업ID</th><th>사업DB 사업명</th><th>현행 게시물과 사업DB의 차이</th></tr></thead><tbody>
          ${HP_POSTS.map(x => `<tr><td class="small">${x[0]}</td><td class="small">${esc(x[1])}<div class="muted mono">${x[2]}</div></td><td class="mono small"><a href="#/projects/${x[3]}">${x[3]}</a></td><td class="small">${esc((A.P(x[3]) || {}).name || '-')}</td><td class="small">${x[4] ? (x[5] ? `<span class="b warn"><span class="ic">▲</span>불일치</span> ` : '') + esc(x[4]) : ''}</td></tr>`).join('')}
          ${H.best.map(b => `<tr><td class="small">우수사업 · 새로 등록</td><td class="small muted">게시물 자동 생성 (선정연도 ${b[1]})</td><td class="mono small">${b[0]}</td><td class="small">${esc((A.P(b[0]) || {}).name || '-')}</td><td class="small"><span class="b ok"><span class="ic">✓</span>사업DB 값 표시</span></td></tr>`).join('')}
          </tbody></table></div>
          ${canU ? `<div class="bd row" style="padding-top:10px"><span class="small muted">우수사업 선정 등록</span><select class="btn sm" id="hp-b">${A.projects().filter(p => p.isPublic).sort((a, b) => b.id.localeCompare(a.id)).map(p => `<option value="${p.id}">${p.id} · ${esc(p.name.slice(0, 26))}</option>`).join('')}</select><select class="btn sm" id="hp-y">${A.opts(['2026', '2025', '2024'], '2026', null)}</select><button class="btn sm pri" id="hp-best">등록</button></div>` : ''}
          <div class="bd small muted" style="padding-top:0">게시물에는 <b>사업ID · 유형 · 언어 · 공개 여부만</b> 등록하고 사업명·국가·금액은 사업DB 값을 표시하면 위와 같은 표기 차이가 생기지 않습니다.</div></div>
        <div class="card"><div class="hd"><h3>홈페이지 관리 이력</h3></div><div class="tw" style="max-height:220px"><table class="tbl"><tbody>${H.hist.map(h => `<tr><td class="mono small nowrap">${h.at}</td><td>${A.uname(h.by)}</td><td>${esc(h.act)}</td><td class="small">${esc(h.tgt)}</td></tr>`).join('') || '<tr><td class="empty">이력이 없습니다.</td></tr>'}</tbody></table></div></div>`;
      A.$$('[data-pub]', hb).forEach(c => (c.onchange = () => { const p = A.P(c.dataset.pub); p.isPublic = c.checked; A.hist(p.id, '기본정보', '홈페이지 공개', c.checked ? '비공개' : '공개', c.checked ? '공개' : '비공개'); log('공개 지정', `${p.id} · ${c.checked ? '공개' : '비공개'}`); A.save(); A.render(); }));
      A.$('#hp-go', hb) && (A.$('#hp-go', hb).onclick = () => { H.shown = { n: dn, amt: da }; H.at = U.nowStamp(); log('홈페이지 반영', `공개 사업 ${dn}건`); A.save(); A.toast(`홈페이지에 반영했습니다 — 공개 사업 ${dn}건.`, 'ok'); A.render(); });
      A.$('#hp-best', hb) && (A.$('#hp-best', hb).onclick = () => { const id = A.$('#hp-b', hb).value, y = A.$('#hp-y', hb).value; if (H.best.some(b => b[0] === id)) { A.toast('이미 등록된 우수사업입니다.', 'bad'); return; } H.best.push([id, y]); log('우수사업 선정 등록', `${id} · ${y}`); A.save(); A.render(); });
    } else if (st.tab === 'main') {
      hb.innerHTML = `<div class="grid2"><div class="card"><div class="hd"><h3>배너 · 슬라이드</h3><span class="note">SFR-008 "관리자 화면에서 관리 가능 (게시기간, 링크, 이미지 등)"</span></div>
          <div class="tw"><table class="tbl"><thead><tr><th>순서</th><th>제목 · 링크</th><th>게시기간 <span class="tagx">예시</span></th><th>이미지</th><th>노출</th></tr></thead><tbody>
          ${BANNERS.map((b, i) => `<tr><td class="mono">${i + 1}</td><td class="small">${esc(b[0])}<div class="mono muted">${b[1]}</div><span class="muted">${b[2]}</span></td><td class="small nowrap">${b[3]}</td><td class="small muted">1920×600</td><td>${canU ? tg(`data-ban="${i}"`, H.banners[i]) : H.banners[i] ? '노출' : '숨김'}</td></tr>`).join('')}</tbody></table></div>
          <div class="bd small muted" style="padding-top:8px">제목 · 링크는 현행 알림마당 실제 게시물입니다. 게시기간이 지나면 자동으로 내려갑니다.</div></div>
        <div class="card"><div class="hd"><h3>메인 화면 영역</h3><span class="note">무엇을 누가 채우는가</span></div><div class="tw"><table class="tbl"><thead><tr><th>영역</th><th>채우는 곳</th></tr></thead><tbody>
          <tr><td>배너 · 슬라이드 · 팝업</td><td>홈페이지 관리자 (이 화면 · 팝업 탭)</td></tr>
          <tr><td>주요 공지</td><td>홈페이지 관리자 · 게시판에서 "메인 노출" 지정</td></tr>
          <tr><td class="ink">사업 현황 · 통계 · 기준일</td><td>사업DB 결재 승인 확정본에서 <b>자동</b> (입력 없음) — 현재 공개 ${A.projects().filter(p => p.isPublic).length}건</td></tr>
          <tr><td class="ink">최신 사업 등록 · 갱신 현황</td><td>사업DB 확정 이력에서 <b>자동</b> (입력 없음)</td></tr>
          <tr><td>사업산출물 · 우수사업 최신</td><td>사업DB 연계 탭에서 공개 지정된 것만 자동</td></tr></tbody></table></div>
          <div class="bd small muted" style="padding-top:8px">SFR-008 "주요 ODA 사업 현황·통계", "최신 사업 등록·갱신 현황"은 사업DB 값을 그대로 보여 주고 관리자가 다시 입력하지 않습니다.</div></div></div>`;
      A.$$('[data-ban]', hb).forEach(c => (c.onchange = () => { H.banners[+c.dataset.ban] = c.checked ? 1 : 0; log('배너 노출', `${BANNERS[+c.dataset.ban][0].slice(0, 24)} · ${c.checked ? '노출' : '숨김'}`); A.save(); A.render(); }));
    } else if (st.tab === 'pop') {
      hb.innerHTML = `<div class="card"><div class="hd"><h3>홈페이지 안내 팝업</h3><span class="note">SFR-006 "관리자 화면에서 팝업 관리 기능 제공 (게시기간, 링크 등)"</span></div>
        <div class="tw"><table class="tbl"><thead><tr><th>제목 · 연결 게시물</th><th>게시기간</th><th>옵션</th><th>노출</th></tr></thead><tbody>
          <tr><td class="small">(신규) 2026년 국토교통 국제개발협력사업(ODA) 신규 용역(2건) 입찰공고 안내<div class="mono muted">/board/centerNoticeView?bbsId=900&sn=937</div></td><td class="small nowrap">9.7 ~ 10.1 10:00 <span class="tagx">예시</span></td><td class="small">"오늘 하루 안보기"</td><td>${canU ? tg('id="hp-pop"', H.popup) : ''}</td></tr></tbody></table></div>
        <div class="bd small muted" style="padding-top:8px">제목 · 연결 게시물 · "오늘 하루 안보기"는 현행 메인 팝업 실제 값이고, 게시기간은 공고 개시일(9.7)과 입찰서 제출 마감(10.1 10:00)에 맞춘 예시입니다. 사업DB 관리시스템 내부 공지 팝업은 시스템관리 › 알림·팝업에서 관리합니다 (SFR-006 팝업이 어느 쪽인지 착수 시 확인).</div></div>`;
      A.$('#hp-pop', hb) && (A.$('#hp-pop', hb).onchange = e => { H.popup = e.target.checked ? 1 : 0; log('팝업 노출', e.target.checked ? '노출' : '숨김'); A.save(); A.render(); });
    } else if (st.tab === 'board') {
      hb.innerHTML = `<div class="card"><div class="hd"><h3>게시판</h3><span class="note">SFR-009 "관리자 화면에서 게시물 관리" · SFR-010 · SFR-013</span></div>
        <div class="tw"><table class="tbl"><thead><tr><th>메뉴 · 게시판</th><th>현행 주소</th><th>관리 기능 (개편)</th><th>근거</th></tr></thead><tbody>
        ${HP_BOARDS.map(b => `<tr><td class="ink">${b[0]}</td><td class="mono small">${b[1]}</td><td class="small">${esc(b[2])}</td><td class="small nowrap">${b[3]}</td></tr>`).join('')}</tbody></table></div>
        <div class="bd small muted" style="padding-top:8px">현행은 공지 게시판이 세 곳(기획/발굴 · 조달 · 알림마당)에 따로 있고, 법령/지침은 정적 화면 4개와 게시판 1개로 나뉘어 있습니다.</div></div>
        <div class="card"><div class="hd"><h3>센터안내 콘텐츠</h3><span class="note">SFR-014</span></div><div class="tw"><table class="tbl"><thead><tr><th>화면</th><th>현행</th><th>관리 기능 (개편)</th></tr></thead><tbody>
          <tr><td>설립배경 · 주요업무</td><td class="small">있음</td><td class="small">본문 편집 · 현행화</td></tr>
          <tr><td>조직도</td><td class="small">있음 (성명 · 직위 · 전화번호 표)</td><td class="small">담당 업무 · 연락처 편집 (SFR-014 "담당자 연락처 및 문의처")</td></tr>
          <tr><td class="ink">연혁</td><td class="small">없음</td><td class="small"><span class="tag">신규</span> 연도 · 내용 등록</td></tr>
          <tr><td class="ink">찾아오시는 길</td><td class="small">없음</td><td class="small"><span class="tag">신규</span> 주소 · 지도 · 교통 안내 (SFR-014 "지도 기능")</td></tr></tbody></table></div></div>`;
    } else {
      const badge = t => (t === '신규' ? '<span class="tag">신규</span>' : t === '통합' ? '<span class="tag blue">통합</span>' : t === '사업DB 연계' ? '<span class="b acc">사업DB 연계</span>' : '<span class="muted small">현행</span>');
      hb.innerHTML = `<div class="grid2"><div class="card"><div class="hd"><h3>메뉴</h3><span class="note">SFR-015 "메뉴 추가" · 1단 6개 · 2단 현행 23개 + 신규 2개</span></div>
          <div class="tw"><table class="tbl"><thead><tr><th>1단</th><th>2단</th><th>구분</th><th>노출</th></tr></thead><tbody>
          ${HP_MENU.map(([m, subs, sfr]) => subs.map((x, j) => { const k = m + '/' + x[0]; return `<tr>${j ? '' : `<td rowspan="${subs.length}" class="ink" style="vertical-align:top"><b>${m}</b><div class="muted small">${sfr}</div></td>`}<td>${x[0]}</td><td>${badge(x[1])}</td><td>${canU ? tg(`data-hm="${esc(k)}"`, !H.menuHide[k]) : ''}</td></tr>`; }).join('')).join('')}
          </tbody></table></div><div class="bd small muted" style="padding-top:8px">1단 · 2단 이름은 현행 홈페이지 실제 값입니다. "사업DB 연계" 화면은 사업DB 확정본을 읽고 관리자가 내용을 입력하지 않습니다. 법령/지침 5개는 하나의 자료 목록으로 통합합니다.</div></div>
        <div class="card"><div class="hd"><h3>파일</h3><span class="note">SFR-015 "파일 추가/수정"</span></div><div class="tw"><table class="tbl"><thead><tr><th>파일</th><th>사용 위치</th><th>수정</th></tr></thead><tbody>
          <tr><td class="small">(예시) 2026 종합시행계획.pdf</td><td class="small">기획/발굴 · 기본계획 & 종합시행계획</td><td class="small">교체 · 삭제</td></tr>
          <tr><td class="small">(예시) 메인 배너_신규사업 공모.jpg</td><td class="small">메인 · 배너</td><td class="small">교체 · 삭제</td></tr>
          <tr><td class="small">(예시) 조직도.png</td><td class="small">센터안내 · 조직도</td><td class="small">교체 · 삭제</td></tr></tbody></table></div>
          <div class="bd small muted" style="padding-top:8px">사업 문서(보고서·산출물)는 여기서 올리지 않습니다. 사업DB 문서 관리에 등록하고 공개 지정한 것만 홈페이지에 나갑니다.</div></div></div>`;
      A.$$('[data-hm]', hb).forEach(c => (c.onchange = () => { const k = c.dataset.hm; if (c.checked) delete H.menuHide[k]; else H.menuHide[k] = 1; log('홈페이지 메뉴 노출', `${k} · ${c.checked ? '노출' : '숨김'}`); A.save(); A.render(); }));
    }
  });
})(window.App);
