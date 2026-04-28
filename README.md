# DW Toy Project

클로드와 함께 만드는 정보성 웹페이지 모음. GitHub Pages로 즉시 배포.

---

## 기본 정보

| 항목 | 내용 |
|------|------|
| GitHub 아이디 | ehdnjs107 |
| 이메일 | ehwldnjs111@gmail.com |
| 저장소 | https://github.com/ehdnjs107/dw_toy_pjt |
| 배포 주소 | https://ehdnjs107.github.io/dw_toy_pjt |
| 로컬 경로 | C:\Users\DOWON\Git_Dev\dowon_toy_pjt |
| 작업 메모 경로 | C:\Users\DOWON\Claude_Dev\github_pages\ |

---

## 폴더 구조

```
dw_toy_pjt/
├── index.html              ← 허브 (전체 프로젝트 목록)
├── uploads/                ← 모바일 업로드 임시 보관함 (비워도 됨)
├── OEwfCUSe7w91fY9j/       ← 업로드 페이지 (비공개 URL)
├── skygarden/              ← 가상공중정원 안내 페이지
│   └── index.html
└── recipe/                 ← 레시피 페이지
    ├── index.html          ← 레시피 목록
    ├── omurice.html        ← 오므라이스 상세
    └── 오므라이스.jpg       ← 이미지 (프로젝트 폴더에 보관)
```

> **규칙**: 이미지는 `uploads/`에서 작업 후 해당 프로젝트 폴더로 복사해서 사용.  
> `uploads/`는 임시 보관함이므로 언제든 비워도 무방.

---

## 기본 배포 명령어

```bash
cd C:\Users\DOWON\Git_Dev\dowon_toy_pjt
git pull
git add .
git commit -m "커밋 메시지"
git push
```

---

## 작업 워크플로우

### 1. 일반 페이지 제작
1. 클로드에게 원하는 페이지 요청
2. 클로드가 HTML 파일 생성 및 허브(`index.html`) 카드 추가
3. `git push` → GitHub Pages 자동 배포 (1~3분 소요)

### 2. 이미지 활용 페이지 제작
1. 모바일에서 업로드 페이지 접속 → 이미지 업로드
2. PC에서 `git pull` (클로드가 대신 실행 가능)
3. 클로드에게 "방금 올린 이미지로 페이지 만들어줘" 요청
4. 클로드가 `uploads/`에서 이미지를 해당 프로젝트 폴더로 복사 후 페이지 제작
5. `git push`

### 3. 모바일 SSH로 작업 요청
- PC 켜놓은 상태에서 모바일 SSH 접속
- 클로드에게 명령 → 클로드가 파일 생성 + push까지 처리

---

## 업로드 페이지

| 항목 | 내용 |
|------|------|
| URL | https://ehdnjs107.github.io/dw_toy_pjt/OEwfCUSe7w91fY9j/ |
| 비밀번호 | `56er` (토큰 중간 4자리) |
| 업로드 위치 | 저장소 `uploads/` 폴더 |

**파일명 규칙**
- 저장 파일명에 `.` 없으면 원본 확장자 자동 추가 (예: `오므라이스` → `오므라이스.jpg`)
- `.` 있으면 그대로 저장 (예: `park_main.jpg` → `park_main.jpg`)
- 타임스탬프 자동 제안 (수정 가능)

**보안 방식**
- PAT(GitHub 토큰)를 앞뒤로 쪼개어 코드에 보관, 중간 4글자(`56er`)만 비밀번호로 입력
- URL 자체가 16자리 난수라 외부 노출 차단

---

## 페이지 목록

| 페이지 | URL | 설명 |
|--------|-----|------|
| 허브 | /dw_toy_pjt/ | 전체 프로젝트 카드 목록 |
| 가상공중정원 | /dw_toy_pjt/skygarden/ | 공원 안내 (역사, 이용안내, 약도, 오시는길) |
| 레시피 목록 | /dw_toy_pjt/recipe/ | 요리 레시피 모음 |
| 오므라이스 | /dw_toy_pjt/recipe/omurice.html | 오므라이스 레시피 상세 |

---

## 새 프로젝트 추가 시 체크리스트

- [ ] 프로젝트 폴더 생성 (`mkdir 폴더명`)
- [ ] `index.html` 작성 (모바일 기준 디자인)
- [ ] 이미지 있으면 해당 폴더로 복사
- [ ] 허브 `index.html`에 카드 추가
- [ ] `git add . && git commit -m "설명" && git push`

---

## 디자인 가이드

현재까지 사용된 테마 스타일:

| 테마 | 사용 페이지 | 특징 |
|------|------------|------|
| 다크 그린 | 가상공중정원, 업로드, 허브 | `#0d1f16` 배경, `#52b788` 포인트, `#c9a84c` 골드 |
| 다크 브라운 | 레시피 | `#0f0d0a` 배경, `#d4a843` 골드 포인트 |

공통 원칙:
- 모바일 퍼스트 (max-width 기준 설계)
- 히어로 배경에 Ken Burns 애니메이션 (느린 줌인)
- 섹션 레이블은 소문자 영문 + 넓은 자간
- 네비게이션은 `backdrop-filter: blur` 반투명 고정

---

## 참고

- GitHub PAT 만료일: 2026-07-19 (90일, 만료 시 재발급 필요)
- PAT 재발급: https://github.com/settings/tokens → Fine-grained tokens → dw_toy_pjt, Contents Read/Write
- 재발급 후 `OEwfCUSe7w91fY9j/index.html` 의 `p1`, `p2` 값 업데이트 필요
