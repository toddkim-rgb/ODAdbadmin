/* 시스템관리 — 사용자 (SFR-038) · 그룹·권한 (SFR-039~040) · 코드·메뉴 (SFR-041~042) · 로그·이용현황 (SFR-043~044) */
(function (A) {
  const { esc, num, pct, U, K } = A;
  const mask = {
    email: s => { const [a, b] = String(s).split('@'); return a.slice(0, 2) + '*'.repeat(Math.max(1, a.length - 2)) + '@' + b; },
    phone: s => String(s).replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3'),
  };

  /* ── 사용자 관리 ───────────────────────────── */
  A.page('/users', { menu: 'users', title: '사용자 관리' }, view => {
    const f = (A.state.uf = A.state.uf || { q: '', role: '', st: '' });
    const rows = A.db.users.filter(u => (!f.q || (u.name + u.email + u.team).includes(f.q)) && (!f.role || u.role === f.role) && (!f.st || u.status === f.st));
    view.innerHTML = `
      ${A.ph('사용자 관리', '계정 등록·수정·삭제, 역할 지정, 비밀번호 초기화, 계정 잠금·해제 · 개인정보는 암호화 저장되며 화면에는 마스킹 표시', `${A.xlsBtn()}<button class="btn pri" id="u-new">${A.ICON.plus}사용자 등록</button>`, 'SFR-038')}
      <div class="notice info"><span>🔒</span><span class="grow">로그인 5회 연속 실패 시 계정이 자동 잠금됩니다. 비밀번호는 단방향 암호화(SHA-256 이상)로 저장되고, 이메일·연락처는 양방향 암호화 후 권한자에게만 복호화 조회됩니다.</span></div>
      <div class="bar"><div class="fl"><span>검색</span><input type="search" id="u-q" value="${esc(f.q)}" placeholder="이름·소속"></div><div class="fl"><span>역할</span><select id="u-role">${A.opts(Object.entries(K.ROLES), f.role)}</select></div><div class="fl"><span>상태</span><select id="u-st">${A.opts(['정상', '잠금'], f.st)}</select></div></div>
      <div class="card"><div class="tw"><table class="tbl"><thead><tr><th>이름</th><th>계정</th><th>소속</th><th>직위</th><th>역할</th><th>이메일</th><th>연락처</th><th>상태</th><th>최근 접속</th><th></th></tr></thead><tbody>
      ${rows.map(u => `<tr><td class="ink">${esc(u.name)}</td><td class="mono small">${esc(u.email.split('@')[0])}</td><td>${esc(u.team)}</td><td>${esc(u.title)}</td><td><span class="b ${u.role === 'ADMIN' ? 'acc' : u.role === 'MANAGER' ? 'info' : u.role === 'VIEWER' ? 'mute' : ''}">${K.ROLES[u.role]}</span></td><td class="mono small">${mask.email(u.email)}</td><td class="mono small">${mask.phone(u.phone)}</td><td>${u.status === '잠금' ? '<span class="b bad">잠금</span>' : '<span class="b ok">정상</span>'}</td><td class="mono small nowrap">${u.lastLogin || '-'}</td>
        <td class="nowrap"><button class="btn sm" data-ed="${u.id}">수정</button> <button class="btn sm" data-pw="${u.id}">비밀번호 초기화</button> <button class="btn sm ${u.status === '잠금' ? '' : 'danger'}" data-lk="${u.id}">${u.status === '잠금' ? '잠금 해제' : '잠금'}</button></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="card"><div class="hd"><h3>권한 변경 이력</h3></div><div class="tw" style="max-height:260px"><table class="tbl"><thead><tr><th>일시</th><th>대상</th><th>내용</th><th>처리자</th></tr></thead><tbody>${A.db.permHist.filter(h => h.kind === 'user').map(h => `<tr><td class="mono small">${h.at}</td><td>${esc(h.target)}</td><td>${esc(h.text)}</td><td>${A.uname(h.by)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">변경 이력이 없습니다.</td></tr>'}</tbody></table></div></div>`;
    const ph = (target, text) => A.db.permHist.unshift({ kind: 'user', at: U.nowStamp(), target, text, by: A.me().id });
    A.$('#u-q', view).onchange = e => { f.q = e.target.value; A.render(); };
    A.$('#u-role', view).onchange = e => { f.role = e.target.value; A.render(); };
    A.$('#u-st', view).onchange = e => { f.st = e.target.value; A.render(); };
    A.$('#btn-xls', view).onclick = () => A.downloadCSV('사용자목록', ['이름', '계정', '소속', '직위', '역할', '상태', '최근접속'], rows.map(u => [u.name, u.email.split('@')[0], u.team, u.title, K.ROLES[u.role], u.status, u.lastLogin || '']));
    const edit = u => {
      const isNew = !u; u = u || { name: '', email: '', phone: '', team: '사업1팀', title: '주임', role: 'STAFF' };
      const m = A.modal({ title: isNew ? '사용자 등록' : '사용자 수정', body: `<div class="form" style="grid-template-columns:1fr 1fr">
        <div class="f req"><label>이름</label><input id="e-n" value="${esc(u.name)}"></div><div class="f req"><label>이메일(계정)</label><input id="e-m" value="${esc(u.email)}"></div>
        <div class="f req"><label>소속</label><select id="e-t">${A.opts(['센터장실', '사업1팀', '사업2팀', '정보화지원실'], u.team, null)}</select></div><div class="f"><label>직위</label><input id="e-ti" value="${esc(u.title)}"></div>
        <div class="f req"><label>역할(권한 그룹)</label><select id="e-r">${A.opts(Object.entries(K.ROLES), u.role, null)}</select></div><div class="f"><label>연락처</label><input id="e-p" value="${esc(u.phone)}" placeholder="010-0000-0000"></div></div>`,
        foot: `${isNew ? '' : '<button class="btn danger" id="e-del">삭제</button><span class="sp"></span>'}<button class="btn" data-close>취소</button><button class="btn pri" id="e-ok">저장</button>` });
      m.$('#e-ok').onclick = () => {
        const o = { name: m.$('#e-n').value.trim(), email: m.$('#e-m').value.trim(), team: m.$('#e-t').value, title: m.$('#e-ti').value.trim(), role: m.$('#e-r').value, phone: m.$('#e-p').value.trim() };
        if (!o.name || !/^\S+@\S+$/.test(o.email)) { A.toast('이름과 올바른 이메일을 입력하세요.', 'bad'); return; }
        if (isNew) { const id = 'u' + String(A.db.users.length + 1).padStart(2, '0'); A.db.users.push({ id, ...o, status: '정상', failCount: 0, lastLogin: null, groups: ['G-' + o.role, 'D-' + o.team], createdAt: U.today() }); ph(o.name, `계정 등록 (${K.ROLES[o.role]})`); }
        else { if (u.role !== o.role) ph(u.name, `역할 변경 ${K.ROLES[u.role]} → ${K.ROLES[o.role]}`); Object.assign(u, o); u.groups = ['G-' + o.role, 'D-' + o.team, ...u.groups.filter(g => !g.startsWith('G-') && !g.startsWith('D-'))]; }
        A.log('기능', `사용자 ${isNew ? '등록' : '수정'} — ${o.name}`); A.save(); m.close(); A.toast('저장했습니다.', 'ok'); A.render();
      };
      m.$('#e-del') && (m.$('#e-del').onclick = async () => {
        if (A.projects().some(p => p.owner === u.id)) { A.toast('담당 사업이 있는 사용자는 삭제할 수 없습니다. 담당자 변경 후 삭제하세요.', 'bad'); return; }
        if (!(await A.confirm(`${esc(u.name)} 계정을 삭제할까요?`, { danger: true, ok: '삭제' }))) return;
        A.db.users = A.db.users.filter(x => x !== u); ph(u.name, '계정 삭제'); A.save(); m.close(); A.render();
      });
    };
    A.$('#u-new', view).onclick = () => edit();
    A.$$('[data-ed]', view).forEach(b => (b.onclick = () => edit(A.user(b.dataset.ed))));
    A.$$('[data-pw]', view).forEach(b => (b.onclick = async () => { const u = A.user(b.dataset.pw); if (!(await A.confirm(`${esc(u.name)}님의 비밀번호를 초기화하고 임시 비밀번호를 등록된 이메일로 발송합니다.`, { ok: '초기화' }))) return; ph(u.name, '비밀번호 초기화'); A.notify(u.id, '계정', '[계정] 비밀번호가 초기화되었습니다. 임시 비밀번호로 로그인 후 변경하세요.', '#/dashboard'); A.save(); A.toast('임시 비밀번호를 이메일로 발송했습니다.', 'ok'); A.render(); }));
    A.$$('[data-lk]', view).forEach(b => (b.onclick = () => { const u = A.user(b.dataset.lk); u.status = u.status === '잠금' ? '정상' : '잠금'; u.failCount = 0; ph(u.name, u.status === '잠금' ? '계정 잠금' : '계정 잠금 해제'); A.save(); A.render(); }));
  });

  /* ── 그룹·권한 관리 ─────────────────────────── */
  A.page('/perms', { menu: 'perms', title: '그룹·권한 관리' }, view => {
    const S = (A.state.pm = A.state.pm || { g: 'G-STAFF', all: false });
    const g = A.db.groups.find(x => x.id === S.g) || A.db.groups[0];
    const members = A.db.users.filter(u => u.groups.includes(g.id));
    const menus = K.MENUS.filter(m => m.k);
    const draft = g.role ? JSON.parse(JSON.stringify(A.db.perms[g.role])) : null;
    view.innerHTML = `
      ${A.ph('그룹·권한 관리', '역할 그룹별 메뉴·기능(조회·등록·수정·삭제·승인) 권한 설정 · 사업 단위 데이터 권한은 사업 상세 > 권한 탭에서 관리', `<div class="seg"><button data-v="0" class="${S.all ? '' : 'on'}">그룹별 설정</button><button data-v="1" class="${S.all ? 'on' : ''}">권한 매트릭스</button></div>`, 'SFR-039·040')}
      ${S.all ? `<div class="card"><div class="hd"><h3>그룹 × 메뉴 권한 매트릭스</h3><span class="note">조회 R · 등록 C · 수정 U · 삭제 D · 승인 A</span></div><div class="tw"><table class="tbl matrix"><thead><tr><th>메뉴</th>${Object.entries(K.ROLES).map(([r, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>
        ${menus.map(m => `<tr><td class="ink">${m.n}</td>${Object.keys(K.ROLES).map(r => { const p = A.db.perms[r][m.k]; const s = ['r', 'c', 'u', 'd', 'a'].filter(a => p[a]).map(a => a.toUpperCase()).join(' '); return `<td class="mono small">${s || '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div></div>` : `
      <div class="pv" style="grid-template-columns:260px minmax(0,1fr)">
        <div class="card"><div class="hd"><h3>그룹</h3><button class="btn sm" id="g-new">그룹 추가</button></div><div class="list-side">
          ${['역할', '부서', '업무'].map(kd => { const gs = A.db.groups.filter(x => x.kind === kd); return gs.length ? `<div class="small muted" style="padding:8px 14px 4px">${kd} 그룹</div>` + gs.map(x => `<button data-g="${x.id}" class="${x.id === g.id ? 'on' : ''}"><span>${x.parent ? '└ ' : ''}${esc(x.nm)}</span><span class="n">${A.db.users.filter(u => u.groups.includes(x.id)).length}</span></button>`).join('') : ''; }).join('')}
        </div></div>
        <div class="stack">
          ${draft ? `<div class="card"><div class="hd"><h3>${esc(g.nm)} — 메뉴·기능 권한</h3><button class="btn sm pri" id="p-save">저장</button></div><div class="tw"><table class="tbl matrix"><thead><tr><th>메뉴</th>${Object.entries(K.ACTS).map(([a, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>
            ${menus.map(m => `<tr><td class="ink">${m.n} <span class="muted small">${m.path}</span></td>${Object.keys(K.ACTS).map(a => `<td><input type="checkbox" data-m="${m.k}" data-a="${a}" ${draft[m.k][a] ? 'checked' : ''} aria-label="${m.n} ${K.ACTS[a]}"></td>`).join('')}</tr>`).join('')}
          </tbody></table></div></div>` : `<div class="notice info"><span>ⓘ</span><span class="grow"><b>${esc(g.nm)}</b>은(는) ${g.kind} 그룹입니다. 조직·업무 분류와 결재선·알림 대상 지정에 사용하며, 메뉴 권한은 역할 그룹에서 부여합니다.${g.parent ? ` 상위 그룹: ${esc((A.db.groups.find(x => x.id === g.parent) || {}).nm || '')}` : ''}</span></div>`}
          <div class="card"><div class="hd"><h3>그룹원 <span class="muted small">${members.length}명</span></h3><div class="row"><select class="btn sm" id="m-add">${A.opts(A.db.users.filter(u => !u.groups.includes(g.id)).map(u => [u.id, `${u.name} (${u.team})`]), '', '사용자 선택')}</select><button class="btn sm" id="m-go">${g.role ? '이 그룹으로 이동' : '배정'}</button></div></div><div class="tw"><table class="tbl"><tbody>
            ${members.map(u => `<tr><td class="ink">${esc(u.name)}</td><td>${esc(u.title)}</td><td>${esc(u.team)}</td><td>${K.ROLES[u.role]}</td><td class="c">${g.role ? '' : `<button class="btn sm danger" data-out="${u.id}">해제</button>`}</td></tr>`).join('') || '<tr><td class="empty">그룹원이 없습니다.</td></tr>'}
          </tbody></table></div></div>
          <div class="card"><div class="hd"><h3>권한 변경 이력</h3></div><div class="tw" style="max-height:240px"><table class="tbl"><thead><tr><th>일시</th><th>그룹</th><th>내용</th><th>처리자</th></tr></thead><tbody>${A.db.permHist.filter(h => h.kind === 'group').map(h => `<tr><td class="mono small">${h.at}</td><td>${esc(h.target)}</td><td class="small">${esc(h.text)}</td><td>${A.uname(h.by)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">변경 이력이 없습니다.</td></tr>'}</tbody></table></div></div>
        </div>
      </div>`}`;
    A.$$('[data-v]', view).forEach(b => (b.onclick = () => { S.all = b.dataset.v === '1'; A.render(); }));
    if (S.all) return;
    A.$$('[data-g]', view).forEach(b => (b.onclick = () => { S.g = b.dataset.g; A.render(); }));
    A.$$('[data-m]', view).forEach(c => (c.onchange = () => (draft[c.dataset.m][c.dataset.a] = c.checked ? 1 : 0)));
    A.$('#p-save', view) && (A.$('#p-save', view).onclick = () => {
      const before = A.db.perms[g.role], diffs = [];
      menus.forEach(m => Object.keys(K.ACTS).forEach(a => before[m.k][a] !== draft[m.k][a] && diffs.push(`${m.n} ${K.ACTS[a]} ${draft[m.k][a] ? '부여' : '회수'}`)));
      if (!diffs.length) { A.toast('변경된 권한이 없습니다.'); return; }
      A.db.perms[g.role] = draft; A.db.permHist.unshift({ kind: 'group', at: U.nowStamp(), target: g.nm, text: diffs.join(', '), by: A.me().id });
      A.log('기능', `그룹 권한 변경 — ${g.nm}`); A.save(); A.toast(`${diffs.length}건의 권한을 변경했습니다. 즉시 적용됩니다.`, 'ok'); A.render();
    });
    A.$('#m-go', view).onclick = () => {
      const u = A.user(A.$('#m-add', view).value); if (!u) { A.toast('사용자를 선택하세요.', 'bad'); return; }
      if (g.role) { const old = u.role; u.role = g.role; u.groups = u.groups.filter(x => !x.startsWith('G-')).concat(g.id); A.db.permHist.unshift({ kind: 'group', at: U.nowStamp(), target: g.nm, text: `${u.name} 역할 변경 ${K.ROLES[old]} → ${K.ROLES[g.role]}`, by: A.me().id }); }
      else { if (g.kind === '부서') u.groups = u.groups.filter(x => !x.startsWith('D-')); u.groups.push(g.id); if (g.kind === '부서') u.team = g.id.replace(/^D-/, ''); A.db.permHist.unshift({ kind: 'group', at: U.nowStamp(), target: g.nm, text: `${u.name} 배정`, by: A.me().id }); }
      A.save(); A.render();
    };
    A.$$('[data-out]', view).forEach(b => (b.onclick = () => { const u = A.user(b.dataset.out); u.groups = u.groups.filter(x => x !== g.id); A.db.permHist.unshift({ kind: 'group', at: U.nowStamp(), target: g.nm, text: `${u.name} 해제`, by: A.me().id }); A.save(); A.render(); }));
    A.$('#g-new', view).onclick = () => {
      const m = A.modal({ title: '그룹 추가', body: `<div class="f req"><label>그룹명</label><input id="n-n" placeholder="예) 성과평가 TF"></div><div class="f"><label>그룹유형</label><select id="n-k">${A.opts(['업무', '부서'], '업무', null)}</select></div><div class="f"><label>상위 그룹</label><select id="n-p">${A.opts(A.db.groups.filter(x => x.kind !== '역할').map(x => [x.id, x.nm]), '', '없음')}</select></div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="n-ok">추가</button>' });
      m.$('#n-ok').onclick = () => { const nm = m.$('#n-n').value.trim(); if (!nm) { A.toast('그룹명을 입력하세요.', 'bad'); return; } const id = (m.$('#n-k').value === '부서' ? 'D-' : 'W-') + nm; A.db.groups.push({ id, nm, kind: m.$('#n-k').value, parent: m.$('#n-p').value || null }); A.db.permHist.unshift({ kind: 'group', at: U.nowStamp(), target: nm, text: '그룹 생성', by: A.me().id }); S.g = id; A.save(); m.close(); A.render(); };
    };
  });

  /* ── 코드·메뉴 관리 ─────────────────────────── */
  A.page('/codes', { menu: 'codes', title: '코드·메뉴 관리' }, view => {
    const S = (A.state.cd = A.state.cd || { tab: 'code', g: 'country' });
    const canU = A.can('codes', 'u');
    view.innerHTML = `${A.ph('코드·메뉴 관리', '국가·분야·공종·사업유형 등 공통코드와 시스템 메뉴 구조 관리 · 변경 즉시 전체 화면에 반영', '', 'SFR-041·042')}
      <div class="tabs"><button data-t="code" class="${S.tab === 'code' ? 'on' : ''}">공통코드</button><button data-t="menu" class="${S.tab === 'menu' ? 'on' : ''}">메뉴 관리</button><button data-t="hist" class="${S.tab === 'hist' ? 'on' : ''}">변경 이력</button></div><div id="cb"></div>`;
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { S.tab = b.dataset.t; A.render(); }));
    const cb = A.$('#cb', view);
    const H = (target, text) => A.db.codeHist.unshift({ at: U.nowStamp(), target, text, by: A.me().id });
    if (S.tab === 'code') {
      const G = A.db.codes.find(x => x.grp === S.g);
      const codes = G.codes.slice().sort((a, b) => a.ord - b.ord);
      cb.innerHTML = `<div class="pv" style="grid-template-columns:220px minmax(0,1fr)"><div class="card"><div class="hd"><h3>코드 그룹</h3></div><div class="list-side">${A.db.codes.map(x => `<button data-g="${x.grp}" class="${x.grp === S.g ? 'on' : ''}"><span>${x.nm}</span><span class="n">${x.codes.length}</span></button>`).join('')}</div></div>
        <div class="card"><div class="hd"><h3>${G.nm} <span class="muted small mono">${G.grp}</span></h3>${canU ? '<button class="btn sm pri" id="c-add">코드 추가</button>' : ''}</div><div class="tw" style="max-height:640px"><table class="tbl"><thead><tr><th class="c">순서</th><th>코드</th><th>코드명</th><th>부가정보</th><th class="c">사용</th><th class="num">사용 사업</th>${canU ? '<th></th>' : ''}</tr></thead><tbody>
        ${codes.map((c, i) => { const used = ({ country: p => p.country, field: p => p.field, workType: p => p.workType, type: p => p.type, region: p => p.region, crs: p => p.crs, stage: p => p.stage })[G.grp]; const n = used ? A.projects().filter(p => used(p) === (G.grp === 'stage' ? c.cd : c.nm)).length : null; return `<tr><td class="c mono">${c.ord}</td><td class="mono small">${esc(c.cd)}</td><td class="ink">${esc(c.nm)}</td><td class="small muted">${esc(c.ext || '')}</td><td class="c">${canU ? `<input type="checkbox" data-use="${i}" ${c.use ? 'checked' : ''} aria-label="사용 여부">` : c.use ? '✓' : '-'}</td><td class="num">${n ?? '-'}</td>${canU ? `<td class="nowrap"><button class="btn sm ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button class="btn sm ghost" data-dn="${i}" ${i === codes.length - 1 ? 'disabled' : ''}>▼</button><button class="btn sm" data-ed="${i}">수정</button></td>` : ''}</tr>`; }).join('')}
        </tbody></table></div></div></div>`;
      A.$$('[data-g]', cb).forEach(b => (b.onclick = () => { S.g = b.dataset.g; A.render(); }));
      const swap = (i, j) => { const a = codes[i], b = codes[j]; [a.ord, b.ord] = [b.ord, a.ord]; H(G.nm, `순서 변경: ${a.nm} ↔ ${b.nm}`); A.save(); A.render(); };
      A.$$('[data-up]', cb).forEach(b => (b.onclick = () => swap(+b.dataset.up, +b.dataset.up - 1)));
      A.$$('[data-dn]', cb).forEach(b => (b.onclick = () => swap(+b.dataset.dn, +b.dataset.dn + 1)));
      A.$$('[data-use]', cb).forEach(c => (c.onchange = () => { const x = codes[+c.dataset.use]; x.use = c.checked; H(G.nm, `${x.nm} 사용여부 ${c.checked ? '사용' : '미사용'}`); A.save(); A.toast(`'${x.nm}' 코드를 ${c.checked ? '사용' : '미사용'} 처리했습니다. 입력 화면 선택목록에 즉시 반영됩니다.`, 'ok'); }));
      const ed = c => {
        const isNew = !c; c = c || { cd: '', nm: '', ext: '', use: true };
        const m = A.modal({ title: isNew ? `${G.nm} 코드 추가` : '코드 수정', body: `<div class="form" style="grid-template-columns:1fr 1fr"><div class="f req"><label>코드</label><input id="k-cd" value="${esc(c.cd)}" ${isNew ? '' : 'readonly'}></div><div class="f req"><label>코드명</label><input id="k-nm" value="${esc(c.nm)}"></div><div class="f span2"><label>부가정보</label><input id="k-ext" value="${esc(c.ext || '')}"></div></div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="k-ok">저장</button>' });
        m.$('#k-ok').onclick = () => {
          const o = { cd: m.$('#k-cd').value.trim(), nm: m.$('#k-nm').value.trim(), ext: m.$('#k-ext').value.trim() };
          if (!o.cd || !o.nm) { A.toast('코드와 코드명을 입력하세요.', 'bad'); return; }
          if (isNew && G.codes.some(x => x.cd === o.cd)) { A.toast('이미 존재하는 코드입니다.', 'bad'); return; }
          if (isNew) { G.codes.push({ ...o, ord: G.codes.length + 1, use: true }); H(G.nm, `코드 추가: ${o.cd} ${o.nm}`); } else { H(G.nm, `코드 수정: ${c.nm} → ${o.nm}`); Object.assign(c, o); }
          A.save(); m.close(); A.render();
        };
      };
      A.$('#c-add', cb) && (A.$('#c-add', cb).onclick = () => ed());
      A.$$('[data-ed]', cb).forEach(b => (b.onclick = () => ed(codes[+b.dataset.ed])));
    } else if (S.tab === 'menu') {
      const cfg = (A.db.menuCfg = A.db.menuCfg || {});
      let sec = '';
      cb.innerHTML = `<div class="card"><div class="hd"><h3>사업DB 관리시스템 메뉴</h3><span class="note">메뉴명·노출 여부 변경은 사이드바에 즉시 반영 · 접근 권한은 그룹·권한 관리에서 설정</span></div><div class="tw"><table class="tbl"><thead><tr><th>메뉴 그룹</th><th>메뉴명</th><th>URL</th><th>관련 요구사항</th><th class="c">노출</th>${canU ? '<th></th>' : ''}</tr></thead><tbody>
        ${K.MENUS.map(m => { if (m.sec) { sec = m.sec; return ''; } const c = cfg[m.k] || {}; return `<tr><td class="muted">${sec}</td><td class="ink">${esc(c.n || m.n)}</td><td class="mono small">#${m.path}</td><td class="mono small muted">${m.req || ''}</td><td class="c">${canU && !['dashboard', 'codes'].includes(m.k) ? `<input type="checkbox" data-hide="${m.k}" ${c.hidden ? '' : 'checked'} aria-label="노출">` : '✓'}</td>${canU ? `<td><button class="btn sm" data-rn="${m.k}">이름 변경</button></td>` : ''}</tr>`; }).join('')}
      </tbody></table></div></div>`;
      A.$$('[data-hide]', cb).forEach(c => (c.onchange = () => { const k = c.dataset.hide; cfg[k] = { ...(cfg[k] || {}), hidden: !c.checked }; H('메뉴', `${(K.MENUS.find(m => m.k === k) || {}).n} 노출 ${c.checked ? 'ON' : 'OFF'}`); A.save(); A.shell(); }));
      A.$$('[data-rn]', cb).forEach(b => (b.onclick = async () => { const k = b.dataset.rn; const m0 = K.MENUS.find(m => m.k === k); const v = await A.ask('메뉴명 변경', '메뉴명', { value: (cfg[k] || {}).n || m0.n, ok: '변경' }); if (!v) return; H('메뉴', `${(cfg[k] || {}).n || m0.n} → ${v}`); cfg[k] = { ...(cfg[k] || {}), n: v }; A.save(); A.render(); }));
    } else {
      cb.innerHTML = `<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>일시</th><th>대상</th><th>변경 내용</th><th>처리자</th></tr></thead><tbody>${A.db.codeHist.map(h => `<tr><td class="mono small">${h.at}</td><td>${esc(h.target)}</td><td>${esc(h.text)}</td><td>${A.uname(h.by)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">변경 이력이 없습니다.</td></tr>'}</tbody></table></div></div>`;
    }
  });

  /* ── 로그·이용현황 ─────────────────────────── */
  A.page('/logs', { menu: 'logs', title: '로그·이용현황' }, view => {
    const S = (A.state.lg = A.state.lg || { tab: 'conn', from: U.addD(U.today(), -7), to: U.today(), uid: '', q: '', page: 1 });
    const TABS = [['conn', '접속 로그'], ['func', '기능 사용 로그'], ['mail', '알림 발송 이력'], ['stat', '이용현황 통계']];
    view.innerHTML = `${A.ph('로그·이용현황', '접속기록·주요 행위 이력 조회 및 감사 · 접속기록은 관련 지침에 따라 최소 1년 이상 보관 후 자동 파기', S.tab !== 'stat' ? A.xlsBtn() : '', 'SFR-043·044')}
      <div class="tabs">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === S.tab ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="bar"><div class="fl"><span>기간(부터)</span><input type="date" id="l-from" value="${S.from}"></div><div class="fl"><span>기간(까지)</span><input type="date" id="l-to" value="${S.to}"></div><div class="fl"><span>사용자</span><select id="l-uid">${A.opts(A.db.users.map(u => [u.id, u.name]), S.uid)}</select></div>${S.tab !== 'stat' ? `<div class="fl"><span>검색</span><input type="search" id="l-q" value="${esc(S.q)}" placeholder="행위·메뉴·IP"></div>` : ''}</div>
      <div id="lb"></div>`;
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { S.tab = b.dataset.t; S.page = 1; A.render(); }));
    [['from', 'l-from'], ['to', 'l-to'], ['uid', 'l-uid'], ['q', 'l-q']].forEach(([k, id]) => A.$('#' + id, view) && (A.$('#' + id, view).onchange = e => { S[k] = e.target.value; S.page = 1; A.render(); }));
    const inR = at => at.slice(0, 10) >= S.from && at.slice(0, 10) <= S.to;
    const lb = A.$('#lb', view);
    if (S.tab === 'stat') {
      const logs = A.db.logs.filter(l => inR(l.at) && (!S.uid || l.uid === S.uid));
      const days = []; for (let d = S.from; d <= S.to; d = U.addD(d, 1)) days.push(d);
      const logins = logs.filter(l => l.act === '로그인');
      const menus = A.uniq(logs.filter(l => l.kind === '메뉴'), 'menu');
      const mc = menus.map(m => ({ m, n: logs.filter(l => l.kind === '메뉴' && l.menu === m).length })).sort((a, b) => b.n - a.n).slice(0, 10);
      lb.innerHTML = `<div class="kpis"><div class="kpi"><span class="k">로그인</span><span class="v">${logins.length}<small>회</small></span></div><div class="kpi"><span class="k">접속 사용자</span><span class="v">${A.uniq(logins, 'uid').length}<small>명</small></span></div><div class="kpi"><span class="k">로그인 실패</span><span class="v">${logs.filter(l => l.act.startsWith('로그인 실패')).length}<small>회</small></span></div><div class="kpi"><span class="k">주요 행위(등록·수정·결재)</span><span class="v">${logs.filter(l => l.kind === '기능').length}<small>건</small></span></div></div>
        <div class="grid2"><div class="card"><div class="hd"><h3>일별 접속 건수</h3></div><div class="bd"><div class="chart" id="l1" role="img" aria-label="일별 로그인 건수"></div></div></div>
        <div class="card"><div class="hd"><h3>메뉴별 접근 빈도 (상위 10)</h3></div><div class="bd"><div class="chart" id="l2" role="img" aria-label="메뉴별 접근 빈도"></div></div></div></div>
        <div class="card"><div class="hd"><h3>사용자별 이용현황</h3>${A.xlsBtn('l-xls')}</div><div class="tw"><table class="tbl"><thead><tr><th>사용자</th><th>역할</th><th class="num">로그인</th><th class="num">화면 조회</th><th class="num">주요 행위</th><th>접속 환경</th><th>최근 접속</th></tr></thead><tbody>${A.db.users.map(u => { const L = logs.filter(l => l.uid === u.id); return `<tr><td class="ink">${esc(u.name)}</td><td>${K.ROLES[u.role]}</td><td class="num">${L.filter(l => l.act === '로그인').length}</td><td class="num">${L.filter(l => l.kind === '메뉴').length}</td><td class="num">${L.filter(l => l.kind === '기능').length}</td><td class="small">${esc((L[0] || {}).br || '-')}</td><td class="mono small">${u.lastLogin || '-'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
      A.chart(A.$('#l1', lb), { grid: { left: 8, right: 8, top: 14, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '회' }, xAxis: { type: 'category', data: days.map(d => d.slice(5)), ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', minInterval: 1, ...A.axis() }, series: [A.bar({ name: '로그인', data: days.map(d => logins.filter(l => l.at.startsWith(d)).length), itemStyle: { color: A.sc(0), borderRadius: [4, 4, 0, 0] } })] });
      A.chart(A.$('#l2', lb), { grid: { left: 8, right: 16, top: 8, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '회' }, yAxis: { type: 'category', inverse: true, data: mc.map(x => x.m), ...A.axis({ splitLine: { show: false } }) }, xAxis: { type: 'value', ...A.axis() }, series: [{ type: 'bar', name: '접근', barMaxWidth: 14, data: mc.map(x => x.n), itemStyle: { color: A.sc(0), borderRadius: [0, 4, 4, 0] } }] });
      A.$('#l-xls', lb).onclick = () => A.downloadCSV('이용현황', ['사용자', '역할', '로그인', '화면조회', '주요행위'], A.db.users.map(u => { const L = logs.filter(l => l.uid === u.id); return [u.name, K.ROLES[u.role], L.filter(l => l.act === '로그인').length, L.filter(l => l.kind === '메뉴').length, L.filter(l => l.kind === '기능').length]; }));
      return;
    }
    let rows, head, cell, xlsRow;
    if (S.tab === 'mail') {
      rows = A.db.mails.filter(m => inR(m.at) && (!S.uid || m.to === S.uid) && (!S.q || m.subj.includes(S.q)));
      head = '<tr><th>발송일시</th><th>채널</th><th>수신자</th><th>수신 주소</th><th>제목</th><th>결과</th></tr>';
      cell = m => `<tr><td class="mono small nowrap">${m.at}</td><td>${m.ch}</td><td>${A.uname(m.to)}</td><td class="mono small">${A.user(m.to) ? mask.email(A.user(m.to).email) : '-'}</td><td>${esc(m.subj)}</td><td>${m.ok ? '<span class="b ok">성공</span>' : '<span class="b bad">실패</span>'}</td></tr>`;
      xlsRow = m => [m.at, m.ch, A.uname(m.to), m.subj, m.ok ? '성공' : '실패'];
    } else {
      const kinds = S.tab === 'conn' ? ['접속'] : ['기능', '메뉴'];
      rows = A.db.logs.filter(l => kinds.includes(l.kind) && inR(l.at) && (!S.uid || l.uid === S.uid) && (!S.q || (l.act + l.menu + l.ip).includes(S.q)));
      head = S.tab === 'conn' ? '<tr><th>일시</th><th>사용자</th><th>계정</th><th>접속 IP</th><th>접속 환경(브라우저·OS)</th><th>행위</th></tr>' : '<tr><th>일시</th><th>사용자</th><th>구분</th><th>메뉴</th><th>행위</th><th>대상 사업</th><th>접속 IP</th></tr>';
      cell = S.tab === 'conn'
        ? l => `<tr><td class="mono small nowrap">${l.at}</td><td>${A.uname(l.uid)}</td><td class="mono small">${A.user(l.uid) ? A.user(l.uid).email.split('@')[0] : l.uid}</td><td class="mono small">${l.ip}</td><td class="small">${esc(l.br)}</td><td>${l.act.startsWith('로그인 실패') ? `<span class="b bad">${esc(l.act)}</span>` : esc(l.act)}</td></tr>`
        : l => `<tr><td class="mono small nowrap">${l.at}</td><td>${A.uname(l.uid)}</td><td>${l.kind === '기능' ? '<span class="b info">기능</span>' : '<span class="b mute">조회</span>'}</td><td>${esc(l.menu)}</td><td>${esc(l.act)}</td><td class="mono small">${l.pid ? `<a href="#/projects/${l.pid}">${l.pid}</a>` : '-'}</td><td class="mono small">${l.ip}</td></tr>`;
      xlsRow = l => [l.at, A.uname(l.uid), l.ip, l.br, l.kind, l.menu, l.act, l.pid || ''];
    }
    const per = 50;
    lb.innerHTML = `<div class="card"><div class="tw" style="max-height:620px"><table class="tbl"><thead>${head}</thead><tbody>${rows.slice((S.page - 1) * per, S.page * per).map(cell).join('') || '<tr><td colspan="7" class="empty">조건에 맞는 로그가 없습니다.</td></tr>'}</tbody></table></div><div class="pager" id="lpg"></div></div>`;
    A.pager(rows.length, S.page, per, p => { S.page = p; A.render(); }, A.$('#lpg', lb));
    A.$('#btn-xls', view).onclick = () => A.downloadCSV({ conn: '접속로그', func: '기능사용로그', mail: '알림발송이력' }[S.tab], S.tab === 'mail' ? ['발송일시', '채널', '수신자', '제목', '결과'] : ['일시', '사용자', 'IP', '접속환경', '구분', '메뉴', '행위', '대상사업'], rows.map(xlsRow));
  });

  /* ── 알림·팝업 (SFR-006) ─────────────────────── */
  A.page('/notify', { menu: 'notify', title: '알림·팝업' }, view => {
    const N = A.db.noti;
    const canU = A.can('notify', 'u');
    const T = U.today();
    const sent = A.db.mails.slice(0, 12);
    view.innerHTML = `${A.ph('알림 · 팝업', '결재·일정·추적조사 알림 규칙과 사업DB 관리시스템 공지 팝업 · 수신: 사업별 담당자·결재권자', canU ? `<button class="btn pri" id="pp-new">${A.ICON.plus}팝업 등록</button>` : '', 'SFR-006')}
      <div class="grid2">
        <div class="card"><div class="hd"><h3>알림 규칙</h3><span class="note">이메일 · 기준일은 발주기관 협의 후 확정</span></div><div class="tw"><table class="tbl"><thead><tr><th>이벤트</th><th>기준</th><th>수신</th><th class="c">사용</th></tr></thead><tbody>
          ${N.rules.map(r => `<tr><td class="ink">${esc(r.ev)}${r.heart ? ' <span class="tag">♥ 추가</span>' : ''}</td><td class="small nowrap">${esc(r.when)}</td><td class="small">${esc(r.to)}</td><td class="c">${canU ? `<input type="checkbox" data-rule="${r.id}" ${r.on ? 'checked' : ''} aria-label="${esc(r.ev)} 사용">` : r.on ? '✓' : '-'}</td></tr>`).join('')}
        </tbody></table></div></div>
        <div class="card"><div class="hd"><h3>최근 발송 이력</h3><a class="small" href="#/logs">로그·이용현황 › 알림 발송 이력 →</a></div><div class="tw" style="max-height:320px"><table class="tbl"><tbody>
          ${sent.map(m => `<tr><td class="mono small nowrap">${m.at}</td><td class="nowrap">${A.uname(m.to)}</td><td class="small">${esc(m.subj)}</td><td>${m.ok ? '<span class="b ok">성공</span>' : '<span class="b bad">실패</span>'}</td></tr>`).join('')}
        </tbody></table></div></div>
      </div>
      <div class="card"><div class="hd"><h3>시스템 공지 팝업</h3><span class="note">게시기간 중 로그인 후 전 주기 현황판에 표시 · "오늘 하루 보지 않기" 지원</span></div><div class="tw"><table class="tbl"><thead><tr><th>제목</th><th>내용</th><th>게시기간</th><th>상태</th><th class="c">노출</th>${canU ? '<th></th>' : ''}</tr></thead><tbody>
        ${N.popups.map(p => { const live = p.on && p.from <= T && T <= p.to; return `<tr><td class="ink">${esc(p.title)}</td><td class="small">${esc(p.body)}</td><td class="mono small nowrap">${p.from} ~ ${p.to}</td><td>${live ? '<span class="b ok">게시 중</span>' : p.from > T ? '<span class="b mute">예약</span>' : '<span class="b mute">종료·중지</span>'}</td><td class="c">${canU ? `<input type="checkbox" data-pp="${p.id}" ${p.on ? 'checked' : ''} aria-label="노출">` : ''}</td>${canU ? `<td class="nowrap"><button class="btn sm" data-pv="${p.id}">미리보기</button> <button class="btn sm" data-pe="${p.id}">수정</button></td>` : ''}</tr>`; }).join('')}
      </tbody></table></div></div>`;
    A.$$('[data-rule]', view).forEach(c => (c.onchange = () => { const r = N.rules.find(x => x.id === c.dataset.rule); r.on = c.checked; A.log('기능', `알림 규칙 ${r.ev} ${c.checked ? '사용' : '중지'}`); A.save(); A.toast(`'${r.ev} (${r.when})' 알림을 ${c.checked ? '사용' : '중지'}합니다.`, 'ok'); }));
    A.$$('[data-pp]', view).forEach(c => (c.onchange = () => { const p = N.popups.find(x => x.id === c.dataset.pp); p.on = c.checked; A.save(); A.render(); }));
    A.$$('[data-pv]', view).forEach(b => (b.onclick = () => A.showPopup(N.popups.find(x => x.id === b.dataset.pv), true)));
    const edit = p => {
      const isNew = !p; p = p || { id: 'pp' + Date.now(), title: '', body: '', from: T, to: U.addD(T, 14), on: true, link: '' };
      const m = A.modal({ title: isNew ? '팝업 등록' : '팝업 수정', body: `<div class="f req"><label>제목</label><input id="p-t" value="${esc(p.title)}"></div><div class="f req"><label>내용</label><textarea id="p-b">${esc(p.body)}</textarea></div>
        <div class="form" style="grid-template-columns:1fr 1fr 1fr"><div class="f req"><label>게시 시작</label><input type="date" id="p-f" value="${p.from}"></div><div class="f req"><label>게시 종료</label><input type="date" id="p-e" value="${p.to}"></div><div class="f"><label>연결 링크</label><input id="p-l" value="${esc(p.link)}" placeholder="#/approvals"></div></div>`,
        foot: `${isNew ? '' : '<button class="btn danger" id="p-del">삭제</button><span class="sp"></span>'}<button class="btn" data-close>취소</button><button class="btn pri" id="p-ok">저장</button>` });
      m.$('#p-ok').onclick = () => {
        const o = { title: m.$('#p-t').value.trim(), body: m.$('#p-b').value.trim(), from: m.$('#p-f').value, to: m.$('#p-e').value, link: m.$('#p-l').value.trim() };
        if (!o.title || !o.body || !o.from || !o.to || o.to < o.from) { A.toast('제목·내용·게시기간을 확인하세요.', 'bad'); return; }
        Object.assign(p, o); if (isNew) N.popups.unshift(p); A.log('기능', `팝업 ${isNew ? '등록' : '수정'} — ${o.title}`); A.save(); m.close(); A.render();
      };
      m.$('#p-del') && (m.$('#p-del').onclick = () => { N.popups = N.popups.filter(x => x !== p); A.save(); m.close(); A.render(); });
    };
    A.$('#pp-new', view) && (A.$('#pp-new', view).onclick = () => edit());
    A.$$('[data-pe]', view).forEach(b => (b.onclick = () => edit(N.popups.find(x => x.id === b.dataset.pe))));
  });
  /* 공지 팝업 표시 (오늘 하루 보지 않기는 브라우저별 편의 설정) */
  A.showPopup = (p, preview) => {
    const key = `kidc-pop-${p.id}-${U.today()}`;
    if (!preview) { try { if (localStorage.getItem(key)) return; } catch (e) { /* 저장소 사용 불가 시 항상 표시 */ } }
    const m = A.modal({ title: `📢 ${esc(p.title)}`, body: `<div style="line-height:1.7">${esc(p.body)}</div><div class="small muted">게시기간 ${p.from} ~ ${p.to}</div>`, foot: `${preview ? '' : '<button class="btn ghost" id="pp-day">오늘 하루 보지 않기</button><span class="sp"></span>'}${p.link ? `<a class="btn" href="${esc(p.link)}" data-close>바로가기</a>` : ''}<button class="btn pri" data-close>닫기</button>` });
    m.$('#pp-day') && (m.$('#pp-day').onclick = () => { try { localStorage.setItem(key, '1'); } catch (e) { /* 무시 */ } m.close(); });
  };

  /* ── 오픈 API (SFR-037) ─────────────────────── */
  A.page('/openapi', { menu: 'openapi', title: '오픈 API' }, view => {
    const AP = A.db.api;
    const st = (A.state.api = A.state.api || { ep: 'projects', year: '', field: '', size: 3, id: '', out: '' });
    const canU = A.can('openapi', 'u');
    const pubs = A.projects().filter(p => p.isPublic);
    if (!st.id) st.id = pubs.slice().sort((a, b) => b.startYear - a.startYear)[0].id;
    const F = [['id', '사업ID'], ['name', '사업명'], ['country', '국가'], ['region', '지역'], ['field', '분야'], ['type', '사업유형'], ['period', '시작·종료년도'], ['amount', '계약금액(원)']];
    const EPS = [['projects', 'GET /api/v1/projects', '사업 목록 (조건 검색)'], ['project', 'GET /api/v1/projects/{id}', '사업 상세'], ['yearly', 'GET /api/v1/stats/yearly', '연도별 통계 요약'], ['country', 'GET /api/v1/stats/country', '국가별 통계 요약'], ['field', 'GET /api/v1/stats/field', '분야별 통계 요약']];
    const call = () => {
      const P = AP.pub;
      const pick = x => { const o = {}; if (P.id) o.id = x.id; if (P.name) o.name = x.name; if (P.country) o.country = x.country; if (P.region) o.region = x.region; if (P.field) o.field = x.field; if (P.type) o.type = x.type; if (P.period) { o.start = x.startYear; o.end = x.endYear; } if (P.amount) o.amount = x.contractAmt || 0; return o; };
      const agg = k => Object.entries(pubs.reduce((m, x) => { const v = x[k]; m[v] = m[v] || { count: 0, amount: 0 }; m[v].count++; m[v].amount += x.contractAmt || 0; return m; }, {})).map(([key, o]) => (P.amount ? { key, count: o.count, amount: o.amount } : { key, count: o.count }));
      if (st.ep === 'projects') { const r = pubs.filter(x => (!st.year || String(x.startYear) === st.year) && (!st.field || x.field === st.field)).sort((a, b) => b.startYear - a.startYear); return { status: 200, total: r.length, size: st.size, items: r.slice(0, st.size).map(pick) }; }
      if (st.ep === 'project') return { status: 200, item: pick(pubs.find(x => x.id === st.id) || pubs[0]) };
      if (st.ep === 'yearly') return { status: 200, unit: '건 · 원', items: agg('startYear').sort((a, b) => b.key - a.key) };
      if (st.ep === 'country') return { status: 200, unit: '건 · 원', items: agg('country').sort((a, b) => b.count - a.count) };
      return { status: 200, unit: '건 · 원', items: agg('field').sort((a, b) => b.count - a.count) };
    };
    const url = st.ep === 'projects' ? `/api/v1/projects?${[st.year && 'year=' + st.year, st.field && 'field=' + encodeURIComponent(st.field), 'size=' + st.size].filter(Boolean).join('&')}` : st.ep === 'project' ? `/api/v1/projects/${st.id}` : EPS.find(e => e[0] === st.ep)[1].replace('GET ', '');
    view.innerHTML = `${A.ph('오픈 API', '사업DB의 공개 가능한 데이터를 REST로 제공 · API Key 인증 · 이용기관별 호출 한도', '', 'SFR-037')}
      <div class="grid2">
        <div class="stack">
          <div class="card"><div class="hd"><h3>제공 API</h3><span class="note">공개 지정(홈페이지 공개) 사업 ${pubs.length}건만</span></div><div class="tw"><table class="tbl"><thead><tr><th>엔드포인트</th><th>내용</th></tr></thead><tbody>${EPS.map(e => `<tr class="${e[0] === st.ep ? 'selrow' : ''}"><td class="mono small">${e[1]}</td><td>${e[2]}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card"><div class="hd"><h3>공개 항목 설정</h3><span class="note">끄면 응답에서 빠집니다 · 홈페이지 사업DB 화면도 같은 설정 사용</span></div><div class="bd row">${F.map(f => `<label class="row small" style="margin-right:10px"><input type="checkbox" data-pub="${f[0]}" ${AP.pub[f[0]] ? 'checked' : ''} ${canU ? '' : 'disabled'}>${f[1]}</label>`).join('')}</div>
            <div class="bd small muted" style="padding-top:0">항상 비공개: 담당자 · 결재 이력 · 미선정 사유 · 확정 전 변경값 · 공모 심사 중 사업 (내부 관리 항목)</div></div>
          <div class="card"><div class="hd"><h3>API Key · 호출량</h3><span class="note">이용기관별 일 한도 · 사용현황</span></div><div class="tw"><table class="tbl"><thead><tr><th>이용기관</th><th>API Key</th><th class="num">일 한도</th><th class="num">오늘 호출</th><th>사용</th></tr></thead><tbody>
            ${AP.keys.map((k, i) => `<tr><td>${esc(k.org)}</td><td class="mono small">${k.key}</td><td class="num">${num(k.limit)}</td><td class="num"><b>${num(k.today)}</b><div class="prog" style="margin-top:3px"><i style="width:${Math.min(100, (k.today / k.limit) * 100)}%"></i></div></td><td>${canU ? `<input type="checkbox" data-key="${i}" ${k.on ? 'checked' : ''} aria-label="사용">` : k.on ? '사용' : '중지'}</td></tr>`).join('')}
          </tbody></table></div><div class="bd small muted" style="padding-top:8px">♥ 홈페이지의 공개 사업DB 화면도 같은 API로 읽게 하면 관리 DB와 홈페이지 값이 따로 놀지 않습니다 (SFR-015 "사업DB와 연계").</div></div>
        </div>
        <div class="card"><div class="hd"><h3>호출해 보기</h3><span class="note">기관 A 키로 호출 · 응답은 현재 사업DB 값</span></div><div class="bd stack" style="gap:10px">
          <div class="row"><select class="btn sm" id="ap-e">${EPS.map(e => `<option value="${e[0]}" ${e[0] === st.ep ? 'selected' : ''}>${e[2]}</option>`).join('')}</select>
            ${st.ep === 'projects' ? `<select class="btn sm" id="ap-y">${A.opts(A.uniq(pubs, 'startYear').reverse(), st.year, 'year 전체')}</select><select class="btn sm" id="ap-f">${A.opts(A.uniq(pubs, 'field'), st.field, 'field 전체')}</select><select class="btn sm" id="ap-n">${A.opts([3, 5, 10], st.size, null)}</select>` : st.ep === 'project' ? `<select class="btn sm" id="ap-i">${pubs.slice().sort((a, b) => b.startYear - a.startYear).slice(0, 20).map(x => `<option ${x.id === st.id ? 'selected' : ''}>${x.id}</option>`).join('')}</select>` : '<span class="small muted">파라미터 없음</span>'}
            <button class="btn sm pri" id="ap-go">호출</button><button class="btn sm" id="ap-csv">응답 CSV</button></div>
          <div class="apiurl mono">GET ${esc(url)}<br>X-API-Key: ${AP.keys[0].key}</div>
          <pre class="apijson">${esc(st.out || "'호출'을 누르면 응답이 여기에 나옵니다")}</pre>
          <div class="small muted">개발자용 API 명세서·샘플 코드 제공 (SFR-037). 호출은 로그·이용현황에도 남습니다.</div></div></div>
      </div>`;
    A.$('#ap-e', view).onchange = e => { st.ep = e.target.value; st.out = ''; A.render(); };
    [['year', 'ap-y'], ['field', 'ap-f'], ['size', 'ap-n'], ['id', 'ap-i']].forEach(([k, id]) => A.$('#' + id, view) && (A.$('#' + id, view).onchange = e => { st[k] = k === 'size' ? +e.target.value : e.target.value; A.render(); }));
    A.$('#ap-go', view).onclick = () => { AP.keys[0].today++; st.out = JSON.stringify(call(), null, 2); A.log('기능', `오픈 API 호출 — ${st.ep}`); A.save(); A.render(); };
    A.$('#ap-csv', view).onclick = () => { const r = call(), it = r.items || [r.item]; if (!it.length) return; const ks = Object.keys(it[0]); A.downloadCSV('오픈API_' + st.ep, ks, it.map(o => ks.map(k => o[k]))); };
    A.$$('[data-pub]', view).forEach(c => (c.onchange = () => { AP.pub[c.dataset.pub] = c.checked ? 1 : 0; if (st.out) st.out = JSON.stringify(call(), null, 2); A.log('기능', `API 공개 항목 ${c.dataset.pub} ${c.checked ? '공개' : '비공개'}`); A.save(); A.render(); }));
    A.$$('[data-key]', view).forEach(c => (c.onchange = () => { AP.keys[+c.dataset.key].on = c.checked; A.save(); }));
  });
})(window.App);
