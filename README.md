# 문제풀이 웹앱

JSON 문제 파일을 올려 4지선다 문제를 풀고, 모든 문항을 마친 뒤 점수·정오·해설을 확인하는 앱입니다. 요구사항은 [PRD.md](PRD.md)에 있습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 테스트용 문제 파일은 `public/sample-quiz.json`이며, 앱의 "문제 파일 형식 보기"에서도 내려받을 수 있습니다.

```bash
npm test        # 파일 검사·채점 로직 테스트
npm run build   # 배포용 빌드 확인
```

## 구조

- `src/lib/quiz/` — 문제 타입, 파일 검사(`parse.ts`), 채점(`grade.ts`). 화면과 분리되어 있어 2일차에 서버 채점·저장으로 옮기기 쉽습니다.
- `src/components/` — 업로드 → 문항 확인 → 풀이 → 결과 화면
- `tests/` — Node 내장 테스트 러너로 실행하는 로직 테스트

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다. Framework는 Next.js로 자동 인식되며 설정 변경은 필요 없습니다.
3. 배포가 끝나면 나오는 주소를 휴대폰에서 열어 같은 흐름을 확인합니다.
