# Firebase 설정 가이드

이 앱은 지금 GitHub Pages에서 바로 실행되도록 `localStorage` 기반으로 동작한다. 여러 친구가 각자 휴대폰에서 같은 보드를 실시간으로 보려면 Firebase Authentication 익명 로그인과 Realtime Database를 연결해야 한다.

공식 문서:

- Firebase Web 앱 추가: https://firebase.google.com/docs/web/setup
- 익명 로그인: https://firebase.google.com/docs/auth/web/anonymous-auth
- Realtime Database 읽기/쓰기: https://firebase.google.com/docs/database/web/read-and-write
- Realtime Database 보안 규칙: https://firebase.google.com/docs/database/security

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속
2. `프로젝트 추가`
3. 프로젝트 이름 입력
4. Google Analytics는 이 앱에는 필수 아님. 원하면 꺼도 됨.
5. 프로젝트 생성 완료

## 2. 웹 앱 등록하기

1. Firebase 프로젝트 메인 화면에서 웹 아이콘 `</>` 선택
2. 앱 닉네임 입력: 예) `friends-calendar`
3. Firebase Hosting은 지금 GitHub Pages를 쓰고 있으니 체크하지 않아도 됨
4. 등록 후 나오는 `firebaseConfig` 값을 복사해 둔다

예시 형태:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  databaseURL: "https://...firebaseio.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

여기 있는 값은 Firebase 웹 공개 설정값이라 브라우저 코드에 들어갈 수 있다. 단, 서비스 계정 키나 Admin SDK 키는 절대 Git에 넣으면 안 된다.

## 3. 익명 로그인 켜기

1. Firebase 콘솔 왼쪽 메뉴에서 `빌드 > Authentication`
2. `시작하기`
3. `Sign-in method` 탭
4. `Anonymous` 제공업체 선택
5. `사용 설정` 후 저장

## 4. Realtime Database 만들기

1. Firebase 콘솔 왼쪽 메뉴에서 `빌드 > Realtime Database`
2. `데이터베이스 만들기`
3. 위치 선택
4. 시작 모드는 `잠금 모드` 선택
5. 생성 완료 후 상단 URL이 `databaseURL`과 같은지 확인

## 5. 데이터 구조

MVP 기준 구조는 아래처럼 둔다.

```text
boardInvites
  {inviteToken}
    boardId
    active
    createdAt

boards
  {boardId}
    meta
      title
      timezone
      likelyThreshold
      confirmationPermission
      createdAt
      updatedAt
    members
      {authUid}
        role
        inviteToken
        joinedAt
        lastSeenAt
    participants
      {participantId}
        name
        sortOrder
        isActive
        createdAt
        updatedAt
        updatedBy
    availability
      {participantId}
        {YYYY-MM-DD}
          status
          revision
          updatedAt
          updatedBy
    confirmedDates
      {YYYY-MM-DD}
        isConfirmed
        revision
        confirmedAt
        confirmedBy
        updatedAt
        updatedBy
```

## 6. 처음 테스트용 보드 데이터 넣기

Realtime Database의 `데이터` 탭에서 아래 JSON을 가져오기로 넣으면 된다. `inviteToken`은 실제로는 더 길고 랜덤하게 바꾸는 게 좋다.

```json
{
  "boardInvites": {
    "change-this-long-random-token": {
      "boardId": "main-board",
      "active": true,
      "createdAt": 1796137200000
    }
  },
  "boards": {
    "main-board": {
      "meta": {
        "title": "친구 약속 잡기",
        "timezone": "Asia/Seoul",
        "likelyThreshold": 0.8,
        "confirmationPermission": "all_members",
        "createdAt": 1796137200000,
        "updatedAt": 1796137200000
      },
      "participants": {
        "p1": { "name": "", "sortOrder": 0, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 },
        "p2": { "name": "", "sortOrder": 1, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 },
        "p3": { "name": "", "sortOrder": 2, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 },
        "p4": { "name": "", "sortOrder": 3, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 },
        "p5": { "name": "", "sortOrder": 4, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 },
        "p6": { "name": "", "sortOrder": 5, "isActive": true, "createdAt": 1796137200000, "updatedAt": 1796137200000 }
      },
      "availability": {},
      "confirmedDates": {}
    }
  }
}
```

## 7. 보안 규칙 초안

Realtime Database의 `규칙` 탭에 아래 초안을 넣는다. 처음 연결 확인용으로 너무 넓게 열지 않고, 초대 토큰과 멤버십을 기준으로 제한한다.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "boardInvites": {
      "$token": {
        ".read": "auth != null",
        ".write": false
      }
    },
    "boards": {
      "$boardId": {
        ".read": "auth != null && root.child('boards').child($boardId).child('members').child(auth.uid).exists()",
        "members": {
          "$uid": {
            ".write": "auth != null && auth.uid == $uid && ((!data.exists() && root.child('boardInvites').child(newData.child('inviteToken').val()).child('active').val() == true && root.child('boardInvites').child(newData.child('inviteToken').val()).child('boardId').val() == $boardId) || root.child('boards').child($boardId).child('members').child(auth.uid).exists())",
            ".validate": "newData.hasChildren(['role', 'inviteToken', 'joinedAt']) && (newData.child('role').val() == 'owner' || newData.child('role').val() == 'editor')"
          }
        },
        "meta": {
          ".write": "auth != null && root.child('boards').child($boardId).child('members').child(auth.uid).exists()"
        },
        "participants": {
          "$participantId": {
            ".write": "auth != null && root.child('boards').child($boardId).child('members').child(auth.uid).exists()",
            "name": { ".validate": "newData.isString() && newData.val().length <= 12" },
            "sortOrder": { ".validate": "newData.isNumber()" },
            "isActive": { ".validate": "newData.isBoolean()" },
            "$other": { ".validate": true }
          }
        },
        "availability": {
          "$participantId": {
            "$date": {
              ".write": "auth != null && root.child('boards').child($boardId).child('members').child(auth.uid).exists() && root.child('boards').child($boardId).child('participants').child($participantId).child('isActive').val() == true",
              ".validate": "newData.val() == null || (newData.hasChildren(['status', 'updatedAt', 'updatedBy']) && (newData.child('status').val() == 'yes' || newData.child('status').val() == 'no' || newData.child('status').val() == 'maybe') && newData.child('updatedBy').val() == auth.uid)"
            }
          }
        },
        "confirmedDates": {
          "$date": {
            ".write": "auth != null && root.child('boards').child($boardId).child('members').child(auth.uid).exists()",
            ".validate": "newData.val() == null || newData.hasChildren(['isConfirmed', 'revision', 'updatedAt'])"
          }
        }
      }
    }
  }
}
```

## 8. 나에게 전달해줄 것

Firebase 콘솔 작업이 끝나면 아래 두 가지만 알려주면 앱 코드에 Firebase 연결을 붙일 수 있다.

1. `firebaseConfig` 전체 값
2. 초대 토큰과 보드 ID

예:

```text
boardId = main-board
inviteToken = change-this-long-random-token
```

그 다음 내가 할 작업:

1. `localStorage` 저장 어댑터를 Firebase 어댑터로 교체
2. 첫 접속 시 `signInAnonymously`
3. `boardInvites/{inviteToken}` 확인
4. `boards/{boardId}/members/{auth.uid}` 생성
5. `meta`, `participants`, `availability`, `confirmedDates`를 `onValue`로 실시간 구독
6. 셀 저장은 `update`, 확정/취소는 `runTransaction`으로 연결
