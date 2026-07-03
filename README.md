# danjiLog 🐱

가족이 함께 사용하는 고양이 음수량·식사량 기록 PWA입니다. 모바일 사용을 최우선으로 설계했고, iOS 스타일 롤러(Wheel Picker)로 시간과 용량을 입력합니다.

## 기술 스택

React · Vite · TypeScript · TailwindCSS · Supabase · PWA · React Router · TanStack Query · React Hook Form · Zod · dayjs

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`의 내용을 그대로 실행합니다. (테이블, RLS 정책, 고양이 1마리 기본 생성까지 포함)
3. **Authentication → Users**에서 가족이 공용으로 쓸 계정을 하나 만듭니다.
   - 예: 이메일 `family@danjilog.app`, 비밀번호 = 가족이 사용할 6자리 숫자 코드
   - 앱 로그인 화면은 이메일 없이 **코드(비밀번호) 입력창 하나**만 보여주고, 내부적으로 이 이메일로 로그인합니다.
4. Authentication 설정에서 이메일 확인(Confirm email)을 꺼두면 가입 즉시 로그인할 수 있습니다.

### 3. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_FAMILY_LOGIN_EMAIL` | 2번에서 만든 가족 공용 계정의 이메일 |

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 빌드

```bash
npm run build
npm run preview
```

## 로그인 방식

가족끼리만 쓰는 앱이라 사용자별 계정 대신 **코드 하나**로 로그인합니다. 화면에는 6자리 숫자 입력창만 있고, 입력이 끝나면 자동으로 제출됩니다. 내부적으로는 Supabase Auth의 이메일/비밀번호 로그인을 그대로 사용하되(RLS가 동작하려면 실제 인증 세션이 필요합니다), 이메일은 코드로 감춰 UI에는 노출하지 않습니다.

> 코드 확인은 Supabase Auth 서버에서 이루어지므로 프론트엔드 번들에 실제 코드 값이 담기지 않습니다.

## 폴더 구조

```
src/
  components/   재사용 UI 컴포넌트 (WheelPicker, BottomSheet, RecordList ...)
  pages/        라우트 단위 페이지
  hooks/        React Query 훅 등 커스텀 훅
  services/     Supabase 호출 함수 (순수 데이터 레이어)
  lib/          supabase client, dayjs, queryClient 등 인프라
  types/        DB/도메인 타입
  utils/        날짜/통계 계산 유틸
  layouts/      MobileLayout 등 레이아웃
  contexts/     AuthContext
```

## 주요 기능

- 이메일 없이 코드 하나로 로그인, 세션 자동 유지
- 홈 화면: 오늘 물/식사 합계, 오늘 기록 리스트, `+` 버튼으로 Bottom Sheet 기록 추가
- iOS 스타일 Wheel Picker로 시간(시/분)·용량(0~500ml, 5ml 단위) 입력, 선택 시 햅틱 진동
- 기록 탭하면 같은 Bottom Sheet에서 수정/삭제
- 통계: 오늘/최근 7일/최근 30일 물·식사 그래프, 평균/최대/최소
- 캘린더: 월별 기록 유무 표시, 날짜 선택 시 해당 날짜 기록 조회 및 추가
- 설정: 다크모드 토글, 로그아웃, 앱 버전
- PWA: 홈 화면 설치, 오프라인에서도 React Query 캐시로 최근 데이터 조회 가능

## 향후 확장

`cats` 테이블은 여러 마리를 저장할 수 있도록 설계되어 있습니다 (현재 UI는 첫 번째 고양이만 사용). 이후 고양이 선택 UI, 약 복용/몸무게/병원 방문 기록, 푸시 알림 등을 추가할 수 있습니다.
