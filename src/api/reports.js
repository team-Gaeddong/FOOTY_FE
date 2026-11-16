import { request } from './client.js'

// 같은 경기에 참가한 회원을 신고한다(BE D-30). reportedMemberId는 gamePlayerId가 아니라 memberId다.
// reason은 ABUSE·VIOLENT_PLAY·NO_SHOW·OTHER 중 하나, detail은 선택(500자 이하, 없으면 null). 성공은 201.
// 자기 신고 400 REPORT_400_1, 참가하지 않은 신고자 403 REPORT_403_1, 탈퇴한 회원 404 MEMBER_404_1,
// 이 경기에 참가하지 않은 피신고자 404 GAME_404_2, 처리 대기 중인 같은 신고 409 REPORT_409_1.
export function createReport(gameId, { reportedMemberId, reason, detail }) {
  return request(`/games/${gameId}/reports`, {
    method: 'POST',
    body: { reportedMemberId, reason, detail },
  })
}
