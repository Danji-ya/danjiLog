import { useRef, useState, type KeyboardEvent } from "react";
import { Navigate } from "react-router-dom";
import { signInWithFamilyCode } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";

const MAX_DOTS = 12;

export default function LoginPage() {
  const { session, loading } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const submit = async () => {
    if (submitting || code.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await signInWithFamilyCode(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했어요");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-ios-gray-100 px-6 dark:bg-black"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-ios-lg bg-white text-3xl shadow-card dark:bg-ios-gray-900">
          🐱
        </div>
        <h1 className="text-2xl font-bold text-ios-gray-900 dark:text-white">danjiLog</h1>
        <p className="mb-10 mt-1 text-sm text-ios-gray-600 dark:text-ios-gray-400">
          가족 코드를 입력해주세요
        </p>

        <div className={`flex min-h-4 flex-wrap justify-center gap-3 ${error ? "animate-[shake_0.3s]" : ""}`}>
          {Array.from({ length: Math.min(code.length, MAX_DOTS) }).map((_, i) => (
            <div key={i} className="h-4 w-4 rounded-full border border-ios-blue bg-ios-blue" />
          ))}
        </div>

        <input
          ref={inputRef}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          type="password"
          inputMode="text"
          autoFocus
          disabled={submitting}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />

        <button
          type="button"
          onClick={submit}
          disabled={submitting || code.length === 0}
          className="mt-8 w-full rounded-ios bg-ios-blue py-3.5 text-base font-semibold text-white transition active:opacity-70 disabled:opacity-40"
        >
          {submitting ? "확인 중..." : "확인"}
        </button>

        <p className="mt-4 h-4 text-xs text-ios-red">{error ?? ""}</p>
      </div>
    </div>
  );
}
