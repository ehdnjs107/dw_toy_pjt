# Firebase 연결 메모

이 앱은 현재 GitHub Pages에서 바로 실행되도록 `localStorage` 기반으로 동작한다.
여러 기기/여러 사람이 같은 보드를 실시간으로 편집하려면 Firebase 프로젝트를 만들고
설계서의 Realtime Database 구조와 보안 규칙을 연결해야 한다.

필요한 작업:

1. Firebase Authentication에서 익명 로그인을 켠다.
2. Realtime Database를 만들고 기본 규칙은 거부로 둔다.
3. `boardInvites/{inviteToken}`과 `boards/{boardId}/members/{auth.uid}`를 검증하는 규칙을 추가한다.
4. 브라우저에는 Firebase 웹 공개 설정값만 둔다. Admin SDK 키는 절대 넣지 않는다.
5. 앱의 저장 어댑터를 Firebase `onValue`, `update`, `runTransaction` 기반으로 교체한다.

현재 구현은 데이터 구조를 다음 형태로 유지한다.

```text
participants[{ id, name, sortOrder, isActive }]
availability[participantId][YYYY-MM-DD] = yes | no | maybe
confirmedDates[YYYY-MM-DD] = { isConfirmed, revision, updatedAt }
```
