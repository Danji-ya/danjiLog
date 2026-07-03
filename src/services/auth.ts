import { supabase } from "@/lib/supabase";

// 가족 전체가 공유하는 계정 하나로 로그인합니다.
// 사용자에게는 "코드" 하나만 입력받고, 내부적으로는 미리 만들어둔
// Supabase 계정(이메일 고정)의 비밀번호로 그 코드를 사용합니다.
const FAMILY_LOGIN_EMAIL = import.meta.env.VITE_FAMILY_LOGIN_EMAIL as string;

export async function signInWithFamilyCode(code: string) {
  if (!FAMILY_LOGIN_EMAIL) {
    throw new Error("VITE_FAMILY_LOGIN_EMAIL 환경변수가 설정되지 않았습니다.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: FAMILY_LOGIN_EMAIL,
    password: code,
  });
  if (error) {
    if (error.message === "Invalid login credentials") {
      throw new Error("코드가 올바르지 않아요");
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error("Supabase에서 이 계정의 이메일이 아직 인증되지 않았어요");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
