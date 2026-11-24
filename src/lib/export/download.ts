/** Saves `content` as a file called `name`, through the browser's download. */
export function download(name: string, content: string | Blob, type?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
