import type { ReactNode } from 'react'

/** 狭い画面では画面幅いっぱい。広い画面では最大幅で中央に寄せる */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ai-deep">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-ai text-kinari">
        {children}
      </div>
    </div>
  )
}
