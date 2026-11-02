# 문제풀이 웹앱

`question-papers` 폴더에 준비된 문제지를 목록에서 골라 4지선다 문제를 풀고, 모든 문항을 마친 뒤 점수·정오·해설을 확인하는 앱입니다. 요구사항은 [PRD.md](PRD.md)에 있습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 문제지는 `question-papers` 폴더의 JSON 파일(최상위에 `title`, `questions`)이며, 목록에는 각 파일의 `title`이 표시됩니다. 문제지를 추가·수정하면 다시 빌드해야 배포된 앱에 반영됩니다.

```bash
npm test        # 문제지 검사·목록 읽기·채점 로직 테스트
npm run build   # 배포용 빌드 확인
```

## 구조

- `src/lib/quiz/` — 문제 타입, 문제지 검사(`parse.ts`), 문제지 폴더 읽기(`papers.ts`), 채점(`grade.ts`). 화면과 분리되어 있어 2일차 기능을 붙이기 쉽습니다.
- `src/components/` — 문제지 목록 → 문항 확인 → 풀이 → 결과 화면
- `tests/` — Node 내장 테스트 러너로 실행하는 로직 테스트

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다. Framework는 Next.js로 자동 인식되며 설정 변경은 필요 없습니다.
3. 배포가 끝나면 나오는 주소를 휴대폰에서 열어 같은 흐름을 확인합니다.
