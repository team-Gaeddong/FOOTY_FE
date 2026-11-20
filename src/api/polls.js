import { request } from './client.js'

// 파티장만(GAME_403_1). options는 2~10개·서로 다르게(POLL_400_1). deadline은 생략하거나 현재 이후(POLL_400_2).
// allowMultiple을 생략하면 하나만 고르는 투표. 성공은 201 PollResponse(BE D-34).
export function createPoll(gameId, { title, options, allowMultiple, deadline }) {
  return request(`/games/${gameId}/polls`, {
    method: 'POST',
    body: { title, options, allowMultiple, deadline },
  })
}

// 파티장과 경기 참가 회원만(POLL_403_1). 최신순 { polls: [...] }.
export function listPolls(gameId) {
  return request(`/games/${gameId}/polls`)
}

// 선택지별 득표 수·투표자 닉네임·내 선택(isSelected). 다른 경기의 투표면 404 POLL_404_1.
export function getPoll(gameId, pollId) {
  return request(`/games/${gameId}/polls/${pollId}`)
}

// 내 응답을 보낸 선택지로 전부 바꾼다. 빈 목록이면 취소. 마감 뒤에는 409 POLL_409_1.
// 성공은 200 PollResponse(반영 후 결과).
export function answerPoll(gameId, pollId, optionIds) {
  return request(`/games/${gameId}/polls/${pollId}/answers`, {
    method: 'PUT',
    body: { optionIds },
  })
}
