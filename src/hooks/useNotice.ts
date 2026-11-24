import { useRef, useState } from "react"

/** Where a message is shown: under the toolbar, or in the Export section */
export type NoticePlace = "toolbar" | "export"

export interface Notice {
  text: string
  error?: boolean
}

export type Notify = (place: NoticePlace, text: string, error?: boolean) => void

/**
 * A short message about the last open, save or export, shown where it
 * happened for a few seconds. One at a time: a new one replaces the last.
 */
export function useNotice() {
  const [notice, setNotice] = useState<
    (Notice & { place: NoticePlace }) | null
  >(null)
  const timer = useRef<number>(undefined)
  const notify: Notify = (place, text, error = false) => {
    window.clearTimeout(timer.current)
    setNotice({ place, text, error })
    timer.current = window.setTimeout(() => setNotice(null), 4000)
  }
  const noticeFor = (place: NoticePlace): Notice | null =>
    notice?.place === place ? notice : null
  return { notify, noticeFor }
}
