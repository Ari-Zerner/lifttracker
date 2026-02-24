"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-gray-500">...</span>;
  }

  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className="text-sm text-gray-400 hover:text-white transition"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="text-sm bg-white text-black px-3 py-1 rounded font-medium hover:bg-gray-200 transition"
    >
      Sign in
    </button>
  );
}
